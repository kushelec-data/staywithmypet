import "server-only";

import type Stripe from "stripe";
import { safeLogError, safeLogInfo, safeLogWarn } from "@/lib/security/safe-log";
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
import { createAdminClient } from "@/lib/supabase/admin";
import { isMembershipActive, type MembershipRole, type MembershipStatus } from "@/lib/membership";
import { isMissingColumnError, type SupabaseErrorDetail } from "@/lib/supabase-errors";
import {
  isWebhookHandlerError,
  WebhookHandlerError,
} from "@/lib/stripe-webhook-handler-error";
import { getStripe } from "@/lib/stripe";
import {
  evaluateCheckoutActivationConflict,
  MEMBERSHIP_ACTIVATION_CONFLICT_CODE,
} from "@/lib/membership-checkout-conflict";
import { resolveCheckoutActivationContext } from "@/lib/stripe-webhook-resolve";
import { isOneTimePlanId } from "@/lib/one-time-membership";

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
      ok: true;
      activated: false;
      sessionId: string;
      reason: "membership_conflict";
      code: typeof MEMBERSHIP_ACTIVATION_CONFLICT_CODE;
      userId: string;
      role: string;
      planId: string;
    }
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

  safeLogInfo("[stripe] checkout.session metadata", {
    sessionId,
    paymentStatus: session.payment_status,
    metadata: session.metadata ?? {},
    clientReferenceId: session.client_reference_id ?? null,
  });

  if (!checkoutSessionIsPaid(session)) {
    safeLogWarn("[stripe] checkout activation skipped: payment not paid", {
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
    safeLogError("[stripe] checkout activation context failed", {
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

  const admin = createAdminClient();
  if (admin) {
    let existingRow: Record<string, unknown> | null = null;
    const fullSelect =
      "status, end_date, plan_id, stripe_subscription_id, stripe_checkout_session_id";
    const { data: fullRow, error: fullError } = await admin
      .from(MEMBERSHIP_TABLE)
      .select(fullSelect)
      .eq("user_id", userId)
      .eq("role", role)
      .maybeSingle();

    if (!fullError) {
      existingRow = fullRow as Record<string, unknown> | null;
    } else if (isMissingColumnError(fullError)) {
      const { data: coreRow } = await admin
        .from(MEMBERSHIP_TABLE)
        .select("status, end_date, plan_id")
        .eq("user_id", userId)
        .eq("role", role)
        .maybeSingle();
      existingRow = coreRow as Record<string, unknown> | null;
    }

    const existingForConflict = existingRow
      ? {
          status: String(existingRow.status),
          end_date:
            existingRow.end_date == null ? null : String(existingRow.end_date),
          plan_id: existingRow.plan_id == null ? null : String(existingRow.plan_id),
          stripe_subscription_id:
            typeof existingRow.stripe_subscription_id === "string"
              ? existingRow.stripe_subscription_id
              : null,
          stripe_checkout_session_id:
            typeof existingRow.stripe_checkout_session_id === "string"
              ? existingRow.stripe_checkout_session_id
              : null,
        }
      : null;

    if (
      existingForConflict?.stripe_checkout_session_id === sessionId &&
      isMembershipActive(existingForConflict as Parameters<typeof isMembershipActive>[0])
    ) {
      safeLogInfo("[stripe] checkout session already activated (idempotent)", {
        sessionId,
        userId,
        role,
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

    const activationConflict = evaluateCheckoutActivationConflict({
      sessionMode: session.mode,
      sessionId,
      incomingPlanId: planId,
      existing: existingForConflict,
    });

    if (activationConflict.conflict) {
      safeLogWarn("[stripe] checkout activation conflict — membership not overwritten", {
        sessionId,
        userId,
        role,
        sessionMode: session.mode,
        incomingPlanId: planId,
        existingPlanId: activationConflict.existingPlanId,
        code: activationConflict.code,
        message: activationConflict.message,
      });
      return {
        ok: true,
        activated: false,
        sessionId,
        reason: "membership_conflict",
        code: activationConflict.code,
        userId,
        role,
        planId,
      };
    }
  }

  if (!userId?.trim()) {
    const error = `[stripe] checkout ${sessionId}: missing user_id after resolution`;
    safeLogError("[stripe] checkout activation aborted", { sessionId, metadata: session.metadata ?? {} });
    return { ok: false, error, code: "missing_user_id", step: "validate_user_id" };
  }

  safeLogInfo("[stripe] activating membership from checkout", {
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
      safeLogError("[stripe] subscription retrieve failed", { sessionId, subId, message });
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
    source: "stripe_checkout",
    sendConfirmationEmail: true,
    ...(isOneTimePlanId(planId)
      ? {
          linkedBookingId: null,
          consumedAt: null,
          cancellationRestartUsed: false,
        }
      : {}),
  });

  if (!result.ok) {
    safeLogError("[stripe] checkout membership upsert failed", {
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

  safeLogInfo("[membership] checkout activation succeeded", {
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
