import "server-only";

import type Stripe from "stripe";
import {
  billingIntervalFromPlanId,
  computeMembershipEndDate,
  resolveStripePriceId,
  normalizeCatalogPlanId,
} from "@/lib/stripe-plans";
import { upsertUserMembershipAsAdmin } from "@/lib/membership-activate";
import type { MembershipStatus } from "@/lib/membership";
import { getStripe } from "@/lib/stripe";
import { resolveCheckoutActivationContext } from "@/lib/stripe-webhook-resolve";

function periodEndIso(subscription: Stripe.Subscription): string | null {
  const end = subscription.items?.data?.[0]?.current_period_end;
  if (!end) return null;
  return new Date(end * 1000).toISOString();
}

function periodStartIso(subscription: Stripe.Subscription): string | null {
  const start = subscription.items?.data?.[0]?.current_period_start;
  if (!start) return null;
  return new Date(start * 1000).toISOString();
}

export function checkoutSessionIsPaid(session: Stripe.Checkout.Session): boolean {
  return (
    session.payment_status === "paid" || session.payment_status === "no_payment_required"
  );
}

export type CheckoutActivationResult =
  | { ok: true; activated: true; sessionId: string; userId: string; role: string; planId: string }
  | { ok: true; activated: false; sessionId: string; reason: "payment_pending" }
  | { ok: false; error: string; code?: string | null };

/**
 * Activate membership from a Stripe Checkout Session (webhook or confirm-membership).
 * Skips DB write when payment is not yet paid — wait for async_payment_succeeded or client confirm.
 */
export async function activateMembershipFromCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<CheckoutActivationResult> {
  const sessionId = session.id;

  if (!checkoutSessionIsPaid(session)) {
    console.warn("[stripe] checkout activation skipped: payment not paid", {
      sessionId,
      paymentStatus: session.payment_status,
    });
    return { ok: true, activated: false, sessionId, reason: "payment_pending" };
  }

  const stripe = getStripe();
  const { userId, role, planId: resolvedPlanId, priceId } =
    await resolveCheckoutActivationContext(session);
  const planId = normalizeCatalogPlanId(resolvedPlanId) ?? resolvedPlanId;

  console.log("[stripe] activating membership from checkout", {
    sessionId,
    userId,
    role,
    planId,
    priceId,
    paymentStatus: session.payment_status,
    metadata: session.metadata ?? {},
  });

  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

  let subscription: Stripe.Subscription | null = null;
  if (session.subscription) {
    const subId =
      typeof session.subscription === "string" ? session.subscription : session.subscription.id;
    subscription = await stripe.subscriptions.retrieve(subId);
  }

  const resolvedPriceId = priceId ?? resolveStripePriceId(planId);
  const billingInterval = billingIntervalFromPlanId(planId) ?? "one_time";
  const startDate = subscription
    ? periodStartIso(subscription) ?? new Date().toISOString()
    : new Date().toISOString();
  const endDate = subscription
    ? periodEndIso(subscription)
    : computeMembershipEndDate(billingInterval, new Date(startDate));

  const status: MembershipStatus = "active";

  const result = await upsertUserMembershipAsAdmin({
    userId,
    role,
    planId,
    status,
    startDate,
    endDate,
    autoRenew: Boolean(subscription) && !subscription?.cancel_at_period_end,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription?.id ?? null,
    stripePriceId: resolvedPriceId,
    stripeCheckoutSessionId: session.id,
    sendConfirmationEmail: true,
  });

  if (!result.ok) {
    console.error("[stripe] checkout membership upsert failed", {
      sessionId,
      userId,
      role,
      planId,
      error: result.error,
      code: result.code ?? null,
    });
    return { ok: false, error: result.error, code: result.code ?? null };
  }

  console.log("[membership] checkout activation succeeded", {
    sessionId,
    userId,
    role,
    planId,
    status: result.membership.status,
    endDate: result.membership.end_date,
  });

  return {
    ok: true,
    activated: true,
    sessionId,
    userId,
    role,
    planId,
  };
}
