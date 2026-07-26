import {
  isMembershipActive,
  PLAN_BILLING_INTERVAL,
  type MembershipRole,
  type UserMembership,
} from "@/lib/membership";

export const ONE_TIME_INITIAL_VALIDITY_DAYS = 7;
export const ONE_TIME_RESTART_VALIDITY_MONTHS = 1;

export type OneTimeMembershipFields = {
  linked_booking_id: string | null;
  consumed_at: string | null;
  cancellation_restart_used: boolean;
};

export type OneTimeMembershipRow = Pick<
  UserMembership,
  "plan_id" | "status" | "start_date" | "end_date"
> &
  OneTimeMembershipFields;

export function isOneTimePlanId(planId: string | null | undefined): boolean {
  if (!planId?.trim()) return false;
  return PLAN_BILLING_INTERVAL[planId.trim()] === "one_time";
}

export function addDaysIso(from: Date, days: number): string {
  const end = new Date(from);
  end.setUTCDate(end.getUTCDate() + days);
  return end.toISOString();
}

export function addMonthsIso(from: Date, months: number): string {
  const end = new Date(from);
  end.setUTCMonth(end.getUTCMonth() + months);
  return end.toISOString();
}

/** Initial One-Time window: 7 days from payment/activation. */
export function computeOneTimeInitialEndDate(start: Date): string {
  return addDaysIso(start, ONE_TIME_INITIAL_VALIDITY_DAYS);
}

/** After linked booking cancellation (once): 1 calendar month from cancellation time. */
export function computeOneTimeRestartEndDate(cancelledAt: Date): string {
  return addMonthsIso(cancelledAt, ONE_TIME_RESTART_VALIDITY_MONTHS);
}

export function emptyOneTimeFields(): OneTimeMembershipFields {
  return {
    linked_booking_id: null,
    consumed_at: null,
    cancellation_restart_used: false,
  };
}

export function oneTimeFieldsFromRow(
  row: Partial<OneTimeMembershipFields> | null | undefined,
): OneTimeMembershipFields {
  return {
    linked_booking_id: row?.linked_booking_id ?? null,
    consumed_at: row?.consumed_at ?? null,
    cancellation_restart_used: Boolean(row?.cancellation_restart_used),
  };
}

export function isOneTimeMembershipConsumed(row: OneTimeMembershipRow): boolean {
  return Boolean(row.consumed_at) || row.status === "expired";
}

/**
 * Active One-Time membership: base date/status checks plus not consumed.
 * Linked bookings do not deactivate access while care is in progress.
 */
export function isOneTimeMembershipActive(
  row: OneTimeMembershipRow,
  now = new Date(),
): boolean {
  if (!isOneTimePlanId(row.plan_id)) return false;
  if (isOneTimeMembershipConsumed(row)) return false;
  return isMembershipActive(row as UserMembership, now);
}

/**
 * Whether the user may send or accept a new care arrangement on One-Time.
 * Pending requests do not consume; rejected/declined never linked.
 */
export function canOneTimeStartNewArrangement(
  row: OneTimeMembershipRow,
  now = new Date(),
): boolean {
  if (!isOneTimePlanId(row.plan_id)) return true;
  if (!isOneTimeMembershipActive(row, now)) return false;
  if (row.linked_booking_id) return false;
  return true;
}

export const ONE_TIME_ARRANGEMENT_LOCKED_MESSAGE =
  "Your One-Time membership is already linked to a care arrangement. Complete or cancel it before starting another.";

export const ONE_TIME_ENTITLEMENT_EXHAUSTED_MESSAGE =
  "Your One-Time membership entitlement has been used. Purchase a new plan to book again.";

export type OneTimeBookingCancelRestartInput = {
  membership: OneTimeMembershipRow;
  bookingId: string;
  cancelledAt: string;
};

export type OneTimeBookingCancelRestartResult =
  | { action: "none"; reason: string }
  | {
      action: "restart";
      startDate: string;
      endDate: string;
      cancellationRestartUsed: true;
      linkedBookingId: null;
    }
  | {
      action: "exhaust";
      consumedAt: string;
      status: "expired";
      linkedBookingId: null;
    };

/**
 * Idempotent: linked booking cancel may restart once; a second cancel exhausts entitlement.
 */
export function planOneTimeBookingCancellationUpdate(
  input: OneTimeBookingCancelRestartInput,
): OneTimeBookingCancelRestartResult {
  const { membership, bookingId, cancelledAt } = input;

  if (!isOneTimePlanId(membership.plan_id)) {
    return { action: "none", reason: "not_one_time" };
  }

  if (membership.linked_booking_id !== bookingId) {
    return { action: "none", reason: "not_linked_to_booking" };
  }

  if (membership.consumed_at) {
    return { action: "none", reason: "already_consumed" };
  }

  const cancelledAtDate = new Date(cancelledAt);
  if (Number.isNaN(cancelledAtDate.getTime())) {
    return { action: "none", reason: "invalid_cancelled_at" };
  }

  if (!membership.cancellation_restart_used) {
    return {
      action: "restart",
      startDate: cancelledAtDate.toISOString(),
      endDate: computeOneTimeRestartEndDate(cancelledAtDate),
      cancellationRestartUsed: true,
      linkedBookingId: null,
    };
  }

  return {
    action: "exhaust",
    consumedAt: cancelledAtDate.toISOString(),
    status: "expired",
    linkedBookingId: null,
  };
}

export type OneTimeBookingCompleteUpdate = {
  consumedAt: string;
  status: "expired";
  linkedBookingId: string;
};

export function planOneTimeBookingCompletionUpdate(
  membership: OneTimeMembershipRow,
  bookingId: string,
  completedAt: string,
): OneTimeBookingCompleteUpdate | null {
  if (!isOneTimePlanId(membership.plan_id)) return null;
  if (membership.consumed_at) return null;
  if (membership.linked_booking_id !== bookingId) return null;

  const completedAtDate = new Date(completedAt);
  const consumedAt = Number.isNaN(completedAtDate.getTime())
    ? new Date().toISOString()
    : completedAtDate.toISOString();

  return {
    consumedAt,
    status: "expired",
    linkedBookingId: bookingId,
  };
}

export function planOneTimeBookingLinkUpdate(
  membership: OneTimeMembershipRow,
  bookingId: string,
): { linkedBookingId: string } | null {
  if (!isOneTimePlanId(membership.plan_id)) return null;
  if (isOneTimeMembershipConsumed(membership)) return null;
  if (membership.linked_booking_id) return null;
  return { linkedBookingId: bookingId };
}

export function membershipRoleForBookingParticipant(
  userId: string,
  petParentId: string,
  petFriendId: string,
): MembershipRole | null {
  if (userId === petParentId) return "pet_parent";
  if (userId === petFriendId) return "pet_friend";
  return null;
}
