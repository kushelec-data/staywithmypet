import {
  billingIntervalFromPlanId,
  resolveStripePriceId,
  stripeCheckoutMode,
} from "@/lib/stripe-plans";
import { MEMBERSHIP_PLAN_CATALOG, type MembershipRole } from "@/lib/membership";
import { getSiteUrl, getStripe, isStripeConfigured } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type CheckoutBody = {
  role?: MembershipRole;
  planId?: string;
  priceId?: string;
  userId?: string;
};

function isValidRole(value: unknown): value is MembershipRole {
  return value === "pet_parent" || value === "pet_friend";
}

function planExistsForRole(role: MembershipRole, planId: string): boolean {
  return MEMBERSHIP_PLAN_CATALOG[role].some((p) => p.id === planId);
}

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  let body: CheckoutBody;
  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { role, planId, priceId: clientPriceId, userId } = body;

  if (!isValidRole(role) || !planId?.trim() || !userId?.trim()) {
    return NextResponse.json(
      { error: "role, planId, and userId are required." },
      { status: 400 },
    );
  }

  if (!planExistsForRole(role, planId.trim())) {
    return NextResponse.json({ error: "Unknown plan for role." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  if (user.id !== userId.trim()) {
    return NextResponse.json({ error: "User mismatch." }, { status: 403 });
  }

  const resolvedPriceId = resolveStripePriceId(planId.trim());
  if (!resolvedPriceId) {
    return NextResponse.json(
      { error: "Stripe price is not configured for this plan." },
      { status: 503 },
    );
  }

  if (clientPriceId?.trim() && clientPriceId.trim() !== resolvedPriceId) {
    return NextResponse.json({ error: "Price id does not match plan." }, { status: 400 });
  }

  const billingInterval = billingIntervalFromPlanId(planId.trim());
  const mode = stripeCheckoutMode(billingInterval);
  const siteUrl = getSiteUrl();
  const stripe = getStripe();

  const { data: existingMembership } = await supabase
    .from("user_memberships")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .eq("role", role)
    .maybeSingle();

  const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    mode,
    line_items: [{ price: resolvedPriceId, quantity: 1 }],
    allow_promotion_codes: true,
    client_reference_id: user.id,
    customer_email: user.email ?? undefined,
    metadata: {
      user_id: user.id,
      role,
      plan_id: planId.trim(),
    },
    success_url: `${siteUrl}/membership?success=true`,
    cancel_url: `${siteUrl}/membership?cancelled=true`,
  };

  const existingCustomerId = existingMembership?.stripe_customer_id?.trim();
  if (existingCustomerId) {
    sessionParams.customer = existingCustomerId;
    delete sessionParams.customer_email;
  }

  if (mode === "subscription") {
    sessionParams.subscription_data = {
      metadata: {
        user_id: user.id,
        role,
        plan_id: planId.trim(),
      },
    };
  } else {
    sessionParams.payment_intent_data = {
      metadata: {
        user_id: user.id,
        role,
        plan_id: planId.trim(),
      },
    };
  }

  try {
    const session = await stripe.checkout.sessions.create(sessionParams);
    if (!session.url) {
      return NextResponse.json({ error: "Checkout session missing URL." }, { status: 500 });
    }
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe] create checkout session failed", err);
    return NextResponse.json({ error: "Could not start checkout." }, { status: 500 });
  }
}
