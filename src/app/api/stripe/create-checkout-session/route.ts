import { logStripeEnvPresence } from "@/lib/debug-stripe-env";
import {
  logStripeCheckoutPlanResolution,
  normalizeCatalogPlanId,
  resolveStripePriceId,
  stripeCheckoutConfigError,
  stripeCheckoutModeForPlanId,
  stripeCheckoutPriceError,
  stripePriceEnvVarForPlanId,
  stripePriceIdSuffix,
  validateStripePriceForCheckout,
} from "@/lib/stripe-plans";
import { MEMBERSHIP_PLAN_CATALOG, type MembershipRole } from "@/lib/membership";
import { buildStripeCheckoutMetadata, parseMembershipRoleInput } from "@/lib/stripe-webhook-resolve";
import { getSiteUrl, getStripe } from "@/lib/stripe";
import { checkRateLimit, rateLimitMessage } from "@/lib/security/rate-limit";
import { requireAuthUserId } from "@/lib/security/assert-owner";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";
import { NextResponse } from "next/server";

type CheckoutBody = {
  role?: MembershipRole;
  planId?: string;
  plan_id?: string;
  userId?: string;
};

function planExistsForRole(role: MembershipRole, planId: string): boolean {
  return MEMBERSHIP_PLAN_CATALOG[role].some((p) => p.id === planId);
}

function checkoutErrorFromStripe(
  err: unknown,
  planId: string,
  mode: "payment" | "subscription",
): string {
  const envName = stripePriceEnvVarForPlanId(planId) ?? "STRIPE_PRICE_*";
  if (err instanceof Stripe.errors.StripeError) {
    const msg = err.message.toLowerCase();
    if (
      msg.includes("recurring") ||
      msg.includes("subscription") ||
      msg.includes("one-time") ||
      msg.includes("one time")
    ) {
      return `Missing or invalid price ID for ${planId}: ${envName} does not match checkout mode "${mode}". ${err.message}`;
    }
    return `Missing or invalid price ID for ${planId}: ${err.message}`;
  }
  return `Missing or invalid price ID for ${planId}`;
}

export async function POST(request: Request) {
  logStripeEnvPresence("create-checkout-session");

  let body: CheckoutBody;
  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { role: roleRaw, planId: planIdBody, plan_id: planIdSnake, userId } = body;
  const rawPlanId = (planIdBody ?? planIdSnake)?.trim();
  const role = parseMembershipRoleInput(roleRaw);

  if (!role || !rawPlanId || !userId?.trim()) {
    return NextResponse.json(
      { error: "role (parent|friend or pet_parent|pet_friend), planId, and userId are required." },
      { status: 400 },
    );
  }

  const trimmedPlanId = normalizeCatalogPlanId(rawPlanId);
  if (!trimmedPlanId) {
    return NextResponse.json({ error: `Unknown plan: ${rawPlanId}` }, { status: 400 });
  }

  if (!planExistsForRole(role, trimmedPlanId)) {
    return NextResponse.json({ error: "Unknown plan for role." }, { status: 400 });
  }

  logStripeCheckoutPlanResolution("create-checkout-session", trimmedPlanId, role);

  const configError = stripeCheckoutConfigError(trimmedPlanId);
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 503 });
  }

  const supabase = await createClient();
  let sessionUserId: string;
  try {
    sessionUserId = await requireAuthUserId(supabase);
  } catch {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const limit = checkRateLimit("api_default", sessionUserId);
  if (!limit.ok) {
    return NextResponse.json(
      { error: rateLimitMessage(limit.retryAfterSec) },
      { status: 429 },
    );
  }

  if (sessionUserId !== userId.trim()) {
    return NextResponse.json({ error: "User mismatch." }, { status: 403 });
  }

  const resolvedPriceId = resolveStripePriceId(trimmedPlanId);
  const priceError = stripeCheckoutPriceError(trimmedPlanId, resolvedPriceId);
  if (priceError) {
    return NextResponse.json({ error: priceError }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const mode = stripeCheckoutModeForPlanId(trimmedPlanId);
  if (!mode) {
    return NextResponse.json({ error: `Unknown plan: ${trimmedPlanId}` }, { status: 400 });
  }
  const siteUrl = getSiteUrl();
  const stripe = getStripe();

  const resolvedEnvVar = stripePriceEnvVarForPlanId(trimmedPlanId) ?? "STRIPE_PRICE_*";
  const checkoutMetadata = buildStripeCheckoutMetadata({
    userId: sessionUserId,
    role,
    planId: trimmedPlanId,
    priceId: resolvedPriceId!,
    priceEnv: resolvedEnvVar,
  });

  console.log("[stripe] checkout session metadata", {
    user_id: sessionUserId,
    role: checkoutMetadata.role,
    membership_role: checkoutMetadata.membership_role,
    plan_id: trimmedPlanId,
    price_env: resolvedEnvVar,
  });

  const priceSuffix =
    resolvedPriceId && resolvedPriceId.length > 6
      ? resolvedPriceId.slice(-6)
      : resolvedPriceId
        ? stripePriceIdSuffix(resolvedPriceId)
        : null;

  console.log("[stripe] checkout resolved", {
    selectedPlan: trimmedPlanId,
    resolvedEnvVar,
    priceConfigured: Boolean(resolvedPriceId),
    priceSuffix,
    stripeMode: mode,
    role,
  });

  const priceTypeError = await validateStripePriceForCheckout(
    stripe,
    trimmedPlanId,
    resolvedPriceId!,
    mode,
  );
  if (priceTypeError) {
    console.error("[stripe] checkout price validation failed", {
      selectedPlan: trimmedPlanId,
      role,
      stripeMode: mode,
      resolvedEnvVar,
      priceSuffix,
    });
    return NextResponse.json({ error: priceTypeError }, { status: 400 });
  }

  const { data: existingMembership } = await supabase
    .from("user_memberships")
    .select("stripe_customer_id")
    .eq("user_id", sessionUserId)
    .eq("role", role)
    .maybeSingle();

  const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    mode,
    line_items: [{ price: resolvedPriceId!, quantity: 1 }],
    allow_promotion_codes: true,
    client_reference_id: sessionUserId,
    customer_email: user?.email ?? undefined,
    metadata: checkoutMetadata,
    success_url: `${siteUrl}/membership?success=true&role=${role}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/membership?cancelled=true`,
  };

  const existingCustomerId = existingMembership?.stripe_customer_id?.trim();
  if (existingCustomerId) {
    sessionParams.customer = existingCustomerId;
    delete sessionParams.customer_email;
  }

  if (mode === "subscription") {
    sessionParams.subscription_data = { metadata: { ...checkoutMetadata } };
  } else {
    sessionParams.payment_intent_data = { metadata: { ...checkoutMetadata } };
  }

  try {
    const session = await stripe.checkout.sessions.create(sessionParams);
    console.log("[stripe] checkout session created", {
      sessionId: session.id,
      mode,
      user_id: sessionUserId,
      role: checkoutMetadata.role,
      membership_role: checkoutMetadata.membership_role,
      plan_id: trimmedPlanId,
      price_env: resolvedEnvVar,
      metadataKeys: Object.keys(sessionParams.metadata ?? {}),
    });
    if (!session.url) {
      return NextResponse.json({ error: "Checkout session missing URL." }, { status: 500 });
    }
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe] create checkout session failed", {
      planId: trimmedPlanId,
      role,
      mode,
      envVar: stripePriceEnvVarForPlanId(trimmedPlanId),
      message: err instanceof Error ? err.message : String(err),
    });
    const error = checkoutErrorFromStripe(err, trimmedPlanId, mode);
    const status = err instanceof Stripe.errors.StripeInvalidRequestError ? 400 : 500;
    return NextResponse.json({ error }, { status });
  }
}
