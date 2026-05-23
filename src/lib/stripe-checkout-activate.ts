import "server-only";

import type Stripe from "stripe";
import {
  billingIntervalFromPlanId,
  computeMembershipEndDate,
  resolveStripePriceId,
  normalizeCatalogPlanId,
} from "@/lib/stripe-plans";
import {
  MEMBERSHIP_TABLE,
  upsertUserMembershipAsAdmin,
  type MembershipPayloadAttempted,
} from "@/lib/membership-activate";
import type { MembershipRole, MembershipStatus } from "@/lib/membership";
import type { SupabaseErrorDetail } from "@/lib/supabase-errors";
import {
  isWebhookHandlerError,
  WebhookHandlerError,
} from "@/lib/stripe-webhook-handler-error";
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
  | {
      ok: false;
      error: string;
      code?: string | null;
      step: string;
      supabaseError?: SupabaseErrorDetail | null;
      payloadAttempted?: MembershipPayloadAttempted | null;
    };

/**
 * Activate membership from a Stripe Checkout Session (webhook or confirm-membership).
 * Skips DB write when payment is not yet paid — wait for async_payment_succeeded or client confirm.
 */
export async function activateMembershipFromCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<CheckoutActivationResult> {
  const sessionId = session.id;

  console.log("[stripe] checkout.session metadata", {
    sessionId,
    paymentStatus: session.payment_status,
    metadata: session.metadata ?? {},
    clientReferenceId: session.client_reference_id ?? null,
  });

  if (!checkoutSessionIsPaid(session)) {
    console.warn("[stripe] checkout activation skipped: payment not paid", {
      sessionId,
      paymentStatus: session.payment_status,
    });
    return { ok: true, activated: false, sessionId, reason: "payment_pending" };
  }

  const stripe = getStripe();
  let userId: string;
  let role: MembershipRole;
  let resolvedPlanId: string;
  let priceId: string | null;
  try {
    ({ userId, role, planId: resolvedPlanId, priceId } =
      await resolveCheckoutActivationContext(session));
  } catch (err) {
    if (isWebhookHandlerError(err)) throw err;
    const message = err instanceof Error ? err.message : String(err);
    console.error("[stripe] checkout activation context failed", {
      sessionId,
      message,
      metadata: session.metadata ?? {},
    });
    throw new WebhookHandlerError(message, {
      step: "resolve_checkout_context",
      code: "resolve_checkout_context",
    });
  }
  const planId = normalizeCatalogPlanId(resolvedPlanId) ?? resolvedPlanId;

  if (!userId?.trim()) {
    const error = `[stripe] checkout ${sessionId}: missing user_id after resolution`;
    console.error("[stripe] checkout activation aborted", { sessionId, metadata: session.metadata ?? {} });
    return { ok: false, error, code: "missing_user_id", step: "validate_user_id" };
  }

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
    try {
      subscription = await stripe.subscriptions.retrieve(subId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[stripe] subscription retrieve failed", { sessionId, subId, message });
      return { ok: false, error: message, step: "stripe_subscription_retrieve" };
    }
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
      table: MEMBERSHIP_TABLE,
      userId,
      role,
      planId,
      error: result.error,
      code: result.code ?? null,
      supabaseError: result.supabaseError ?? null,
    });
    return {
      ok: false,
      error: result.error,
      code: result.code ?? null,
      step: result.step ?? "upsert_user_memberships",
      supabaseError: result.supabaseError ?? null,
      payloadAttempted: result.payloadAttempted ?? null,
    };
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

export function throwCheckoutActivationFailure(
  sessionId: string,
  result: Extract<CheckoutActivationResult, { ok: false }>,
): never {
  throw new WebhookHandlerError(result.error, {
    step: result.step,
    code: result.code ?? result.supabaseError?.code ?? null,
    supabaseError: result.supabaseError ?? null,
    sessionId,
    payloadAttempted: result.payloadAttempted ?? null,
  });
}
