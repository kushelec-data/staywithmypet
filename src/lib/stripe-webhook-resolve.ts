import "server-only";

import type Stripe from "stripe";
import { membershipRoleFromPlanId, planIdFromStripePriceId } from "@/lib/stripe-plans";
import type { MembershipRole } from "@/lib/membership";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export function roleFromStripeMetadata(value: string | undefined): MembershipRole | null {
  if (value === "pet_parent" || value === "pet_friend") return value;
  return null;
}

function mergeMetadata(
  base: Stripe.Metadata | null | undefined,
  extra: Stripe.Metadata | null | undefined,
): Stripe.Metadata {
  return { ...(base ?? {}), ...(extra ?? {}) };
}

/** Resolve Supabase user id from checkout metadata, client_reference_id, or auth email. */
export async function resolveSupabaseUserId(options: {
  metadataUserId?: string | null;
  clientReferenceId?: string | null;
  email?: string | null;
}): Promise<string | null> {
  const fromMeta = options.metadataUserId?.trim();
  if (fromMeta) return fromMeta;

  const fromRef = options.clientReferenceId?.trim();
  if (fromRef) return fromRef;

  const email = options.email?.trim();
  if (!email) return null;

  const userId = await findSupabaseUserIdByEmail(email);
  if (userId) {
    console.log("[stripe] user resolved via email fallback", { userId });
  } else {
    console.warn("[stripe] no Supabase user for checkout email");
  }
  return userId;
}

export async function findSupabaseUserIdByEmail(email: string): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) {
    console.error("[stripe] email lookup skipped: SUPABASE_SERVICE_ROLE_KEY not configured");
    return null;
  }

  const target = email.trim().toLowerCase();
  if (!target) return null;

  let page = 1;
  const perPage = 200;

  for (let pass = 0; pass < 20; pass++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("[stripe] auth listUsers failed", error.message);
      return null;
    }

    const match = data.users.find((u) => u.email?.trim().toLowerCase() === target);
    if (match?.id) return match.id;

    if (data.users.length < perPage) break;
    page += 1;
  }

  return null;
}

export async function checkoutSessionEmail(session: Stripe.Checkout.Session): Promise<string | null> {
  const fromDetails = session.customer_details?.email?.trim();
  if (fromDetails) return fromDetails;

  const legacy = session.customer_email?.trim();
  if (legacy) return legacy;

  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
  if (!customerId) return null;

  try {
    const customer = await getStripe().customers.retrieve(customerId);
    if (!customer.deleted && customer.email?.trim()) {
      return customer.email.trim();
    }
  } catch (err) {
    console.error(
      "[stripe] customer retrieve failed",
      err instanceof Error ? err.message : String(err),
    );
  }

  return null;
}

export async function paymentIntentMetadata(
  paymentIntent: string | Stripe.PaymentIntent | null | undefined,
): Promise<Stripe.Metadata | undefined> {
  if (!paymentIntent) return undefined;
  const id = typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id;
  try {
    const pi = await getStripe().paymentIntents.retrieve(id);
    return pi.metadata;
  } catch (err) {
    console.error(
      "[stripe] payment_intent retrieve failed",
      err instanceof Error ? err.message : String(err),
    );
    return undefined;
  }
}

export type CheckoutActivationContext = {
  userId: string;
  role: MembershipRole;
  planId: string;
  priceId: string | null;
};

export async function resolveCheckoutActivationContext(
  session: Stripe.Checkout.Session,
): Promise<CheckoutActivationContext> {
  const stripe = getStripe();
  const sessionMeta = session.metadata ?? {};

  let subscription: Stripe.Subscription | null = null;
  if (session.subscription) {
    const subId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription.id;
    subscription = await stripe.subscriptions.retrieve(subId);
  }

  const piMeta = await paymentIntentMetadata(session.payment_intent);
  const mergedMeta = mergeMetadata(
    mergeMetadata(sessionMeta, piMeta),
    subscription?.metadata,
  );

  let userId = await resolveSupabaseUserId({
    metadataUserId: mergedMeta.user_id,
    clientReferenceId: session.client_reference_id,
    email: await checkoutSessionEmail(session),
  });

  let role = roleFromStripeMetadata(mergedMeta.role);
  let planId: string | undefined = mergedMeta.plan_id?.trim();

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
  const priceId = lineItems.data[0]?.price?.id ?? null;

  if (!planId && priceId) {
    planId = planIdFromStripePriceId(priceId) ?? undefined;
  }
  if (!role && planId) {
    role = membershipRoleFromPlanId(planId);
  }

  if (subscription) {
    userId =
      userId ||
      (await resolveSupabaseUserId({
        metadataUserId: subscription.metadata.user_id,
        clientReferenceId: session.client_reference_id,
        email: await checkoutSessionEmail(session),
      }));

    role = role ?? roleFromStripeMetadata(subscription.metadata.role);
    planId = planId || subscription.metadata.plan_id?.trim();

    const subPriceId = subscription.items.data[0]?.price.id;
    if (!planId && subPriceId) {
      planId =
        planIdFromStripePriceId(subPriceId) ??
        subscription.items.data[0]?.price.metadata?.plan_id?.trim();
    }
    if (!role && planId) {
      role = membershipRoleFromPlanId(planId);
    }
  }

  if (!userId || !role || !planId) {
    const missing = [
      !userId ? "user_id" : null,
      !role ? "role" : null,
      !planId ? "plan_id" : null,
    ].filter(Boolean);
    throw new Error(
      `[stripe] checkout ${session.id}: missing ${missing.join(", ")} (metadata/price/email resolution failed)`,
    );
  }

  console.log("[stripe] checkout context resolved", {
    sessionId: session.id,
    userId,
    role,
    planId,
    priceId,
    mode: session.mode,
    paymentStatus: session.payment_status,
  });

  return { userId, role, planId, priceId };
}
