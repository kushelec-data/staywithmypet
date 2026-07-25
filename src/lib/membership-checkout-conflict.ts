import type Stripe from "stripe";
import {
  ACTIVE_MEMBERSHIP_CHECKOUT_CONFLICT_CODE,
  isMembershipActive,
  PLAN_BILLING_INTERVAL,
  type MembershipRole,
  type MembershipStatus,
} from "@/lib/membership";

/** API + webhook typed error code when an active role membership blocks purchase. */
export { ACTIVE_MEMBERSHIP_CHECKOUT_CONFLICT_CODE };

export type ActiveMembershipCheckoutConflictCode =
  typeof ACTIVE_MEMBERSHIP_CHECKOUT_CONFLICT_CODE;

export const MEMBERSHIP_ACTIVATION_CONFLICT_CODE = "MEMBERSHIP_ACTIVATION_CONFLICT" as const;

export const ACTIVE_MEMBERSHIP_CONFLICT_MESSAGE =
  "You already have an active membership for this role. Manage or cancel it before purchasing another plan.";

export type MembershipRowForCheckoutConflict = {
  status: MembershipStatus | string;
  end_date?: string | null;
  plan_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_checkout_session_id?: string | null;
};

export function isRecurringMembershipPlan(planId: string | null | undefined): boolean {
  if (!planId?.trim()) return false;
  const interval = PLAN_BILLING_INTERVAL[planId.trim()];
  return interval === "3_months" || interval === "12_months";
}

export function isOneTimeMembershipPlan(planId: string | null | undefined): boolean {
  if (!planId?.trim()) return false;
  return PLAN_BILLING_INTERVAL[planId.trim()] === "one_time";
}

function rowAsMembership(
  row: MembershipRowForCheckoutConflict,
): { status: MembershipStatus; end_date: string | null | undefined } {
  return {
    status: row.status as MembershipStatus,
    end_date: row.end_date,
  };
}

/** Active membership with a recurring plan or Stripe subscription id. */
export function isActiveRecurringMembership(
  row: MembershipRowForCheckoutConflict | null | undefined,
): boolean {
  if (!row || !isMembershipActive(rowAsMembership(row) as Parameters<typeof isMembershipActive>[0])) return false;
  if (row.stripe_subscription_id?.trim()) return true;
  return isRecurringMembershipPlan(row.plan_id);
}

/** Active one-time membership (no recurring subscription on row). */
export function isActiveOneTimeMembership(
  row: MembershipRowForCheckoutConflict | null | undefined,
): boolean {
  if (!row || !isMembershipActive(rowAsMembership(row) as Parameters<typeof isMembershipActive>[0])) return false;
  if (row.stripe_subscription_id?.trim()) return false;
  return isOneTimeMembershipPlan(row.plan_id);
}

export type MembershipCheckoutConflictResult =
  | { blocked: false }
  | {
      blocked: true;
      code: ActiveMembershipCheckoutConflictCode;
      message: string;
      existingPlanId: string | null;
      role: MembershipRole;
    };

/**
 * Block Stripe Checkout when the role already has an active membership.
 * One-time renewals/extensions are not allowed silently — cancel or wait for expiry first.
 */
export function evaluateMembershipCheckoutConflict(
  existing: MembershipRowForCheckoutConflict | null | undefined,
  role: MembershipRole,
  _requestedPlanId: string,
): MembershipCheckoutConflictResult {
  if (!existing || !isMembershipActive(rowAsMembership(existing) as Parameters<typeof isMembershipActive>[0])) {
    return { blocked: false };
  }

  return {
    blocked: true,
    code: ACTIVE_MEMBERSHIP_CHECKOUT_CONFLICT_CODE,
    message: ACTIVE_MEMBERSHIP_CONFLICT_MESSAGE,
    existingPlanId: existing.plan_id ?? null,
    role,
  };
}

export type CheckoutActivationConflictResult =
  | { conflict: false }
  | {
      conflict: true;
      code: typeof MEMBERSHIP_ACTIVATION_CONFLICT_CODE;
      message: string;
      sessionMode: "payment" | "subscription" | "setup" | null;
      existingPlanId: string | null;
      incomingPlanId: string;
    };

/**
 * Webhook guard: do not overwrite an active membership from a conflicting checkout.
 * Especially blocks mode=payment (one-time) from clobbering an active recurring row.
 */
export function evaluateCheckoutActivationConflict(input: {
  sessionMode: Stripe.Checkout.Session["mode"] | null | undefined;
  sessionId: string;
  incomingPlanId: string;
  existing: MembershipRowForCheckoutConflict | null | undefined;
}): CheckoutActivationConflictResult {
  const { sessionMode, sessionId, incomingPlanId, existing } = input;

  if (!existing || !isMembershipActive(rowAsMembership(existing) as Parameters<typeof isMembershipActive>[0])) {
    return { conflict: false };
  }

  if (existing.stripe_checkout_session_id?.trim() === sessionId) {
    return { conflict: false };
  }

  const existingRecurring = isActiveRecurringMembership(existing);
  const incomingOneTime = isOneTimeMembershipPlan(incomingPlanId);
  const modeIsOneTimePayment = sessionMode === "payment" || incomingOneTime;

  if (modeIsOneTimePayment && existingRecurring) {
    return {
      conflict: true,
      code: MEMBERSHIP_ACTIVATION_CONFLICT_CODE,
      message:
        "One-time checkout cannot overwrite an active recurring membership for this role.",
      sessionMode: sessionMode ?? "payment",
      existingPlanId: existing.plan_id ?? null,
      incomingPlanId,
    };
  }

  if (isMembershipActive(rowAsMembership(existing) as Parameters<typeof isMembershipActive>[0])) {
    return {
      conflict: true,
      code: MEMBERSHIP_ACTIVATION_CONFLICT_CODE,
      message:
        "Checkout activation blocked: an active membership already exists for this role.",
      sessionMode: sessionMode ?? null,
      existingPlanId: existing.plan_id ?? null,
      incomingPlanId,
    };
  }

  return { conflict: false };
}
