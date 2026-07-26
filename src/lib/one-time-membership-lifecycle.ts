import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  emptyOneTimeFields,
  isOneTimePlanId,
  membershipRoleForBookingParticipant,
  planOneTimeBookingCancellationUpdate,
  planOneTimeBookingCompletionUpdate,
  planOneTimeBookingLinkUpdate,
  type OneTimeMembershipRow,
} from "@/lib/one-time-membership";
import { MEMBERSHIP_CORE_SELECT } from "@/lib/membership-load";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingColumnError } from "@/lib/supabase-errors";
import type { MembershipRole, MembershipStatus } from "@/lib/membership";

const MEMBERSHIP_TABLE = "user_memberships";
const MEMBERSHIP_ONE_TIME_SELECT = MEMBERSHIP_CORE_SELECT;

type BookingParticipantRow = {
  id: string;
  pet_parent_id: string;
  pet_friend_id: string;
  cancelled_at: string | null;
  status: string;
  completed_at: string | null;
};

function mapOneTimeRow(data: Record<string, unknown>): OneTimeMembershipRow & {
  id: string;
  user_id: string;
  role: MembershipRole;
} {
  return {
    id: String(data.id),
    user_id: String(data.user_id),
    role: data.role as MembershipRole,
    plan_id: String(data.plan_id ?? ""),
    status: data.status as MembershipStatus,
    start_date: String(data.start_date),
    end_date: data.end_date == null ? null : String(data.end_date),
    linked_booking_id:
      data.linked_booking_id == null ? null : String(data.linked_booking_id),
    consumed_at: data.consumed_at == null ? null : String(data.consumed_at),
    cancellation_restart_used: Boolean(data.cancellation_restart_used),
  };
}

async function loadMembershipForRole(
  userId: string,
  role: MembershipRole,
  supabase?: SupabaseClient,
): Promise<(OneTimeMembershipRow & { id: string; user_id: string; role: MembershipRole }) | null> {
  const client = supabase ?? createAdminClient();
  if (!client) return null;

  const { data, error } = await client
    .from(MEMBERSHIP_TABLE)
    .select(MEMBERSHIP_ONE_TIME_SELECT)
    .eq("user_id", userId)
    .eq("role", role)
    .maybeSingle();

  if (error) {
    if (isMissingColumnError(error, "linked_booking_id")) {
      const { data: fallback, error: fallbackError } = await client
        .from(MEMBERSHIP_TABLE)
        .select("id, user_id, role, plan_id, status, start_date, end_date, auto_renew")
        .eq("user_id", userId)
        .eq("role", role)
        .maybeSingle();
      if (fallbackError || !fallback) return null;
      return mapOneTimeRow({
        ...(fallback as Record<string, unknown>),
        linked_booking_id: null,
        consumed_at: null,
        cancellation_restart_used: false,
      });
    }
    console.error("[one-time-membership] load failed", {
      userId,
      role,
      message: error.message,
    });
    return null;
  }

  if (!data) return null;
  return mapOneTimeRow(data as Record<string, unknown>);
}

async function loadBooking(bookingId: string): Promise<BookingParticipantRow | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("bookings")
    .select("id, pet_parent_id, pet_friend_id, cancelled_at, status, completed_at")
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !data) {
    console.error("[one-time-membership] booking load failed", {
      bookingId,
      message: error?.message,
    });
    return null;
  }

  return data as BookingParticipantRow;
}

async function loadBookingByRequestId(requestId: string): Promise<BookingParticipantRow | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("bookings")
    .select("id, pet_parent_id, pet_friend_id, cancelled_at, status, completed_at")
    .eq("request_id", requestId)
    .maybeSingle();

  if (error || !data) return null;
  return data as BookingParticipantRow;
}

async function patchMembership(
  membershipId: string,
  patch: Record<string, unknown>,
): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;

  const { error } = await admin
    .from(MEMBERSHIP_TABLE)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", membershipId);

  if (error) {
    if (isMissingColumnError(error)) return false;
    console.error("[one-time-membership] patch failed", {
      membershipId,
      message: error.message,
    });
    return false;
  }

  return true;
}

/** Reset One-Time lifecycle fields on a fresh purchase activation. */
export function oneTimeActivationPatch(): Record<string, unknown> {
  return { ...emptyOneTimeFields(), status: "active" };
}

/** Link One-Time memberships for both participants when a booking is confirmed. */
export async function linkOneTimeMembershipsForConfirmedBooking(
  bookingId: string,
): Promise<void> {
  const booking = await loadBooking(bookingId);
  if (!booking) return;

  const participants: Array<{ userId: string; role: MembershipRole }> = [
    { userId: booking.pet_parent_id, role: "pet_parent" },
    { userId: booking.pet_friend_id, role: "pet_friend" },
  ];

  for (const { userId, role } of participants) {
    const membership = await loadMembershipForRole(userId, role);
    if (!membership || !isOneTimePlanId(membership.plan_id)) continue;

    const link = planOneTimeBookingLinkUpdate(membership, bookingId);
    if (!link) continue;

    await patchMembership(membership.id, {
      linked_booking_id: link.linkedBookingId,
    });

    console.info("[one-time-membership] linked to booking", {
      membershipId: membership.id,
      userId,
      role,
      bookingId,
    });
  }
}

export async function linkOneTimeMembershipsForRequest(requestId: string): Promise<void> {
  const booking = await loadBookingByRequestId(requestId);
  if (!booking) return;
  await linkOneTimeMembershipsForConfirmedBooking(booking.id);
}

/** Apply cancellation restart or exhaustion for linked One-Time memberships. */
export async function handleOneTimeBookingCancelled(bookingId: string): Promise<void> {
  const booking = await loadBooking(bookingId);
  if (!booking?.cancelled_at) return;

  const admin = createAdminClient();
  if (!admin) return;

  const { data: rows, error } = await admin
    .from(MEMBERSHIP_TABLE)
    .select(MEMBERSHIP_ONE_TIME_SELECT)
    .eq("linked_booking_id", bookingId);

  if (error) {
    if (!isMissingColumnError(error)) {
      console.error("[one-time-membership] cancel lookup failed", {
        bookingId,
        message: error.message,
      });
    }
    return;
  }

  for (const raw of rows ?? []) {
    const membership = mapOneTimeRow(raw as Record<string, unknown>);
    if (!isOneTimePlanId(membership.plan_id)) continue;

    const planned = planOneTimeBookingCancellationUpdate({
      membership,
      bookingId,
      cancelledAt: booking.cancelled_at,
    });

    if (planned.action === "none") continue;

    if (planned.action === "restart") {
      await patchMembership(membership.id, {
        linked_booking_id: planned.linkedBookingId,
        cancellation_restart_used: planned.cancellationRestartUsed,
        start_date: planned.startDate,
        end_date: planned.endDate,
        status: "active",
      });
      console.info("[one-time-membership] restart after cancellation", {
        membershipId: membership.id,
        bookingId,
        endDate: planned.endDate,
      });
      continue;
    }

    await patchMembership(membership.id, {
      linked_booking_id: planned.linkedBookingId,
      consumed_at: planned.consumedAt,
      status: planned.status,
    });
    console.info("[one-time-membership] exhausted after second cancellation", {
      membershipId: membership.id,
      bookingId,
    });
  }
}

/** Mark linked One-Time memberships consumed when booking completes. */
export async function handleOneTimeBookingCompleted(bookingId: string): Promise<void> {
  const booking = await loadBooking(bookingId);
  if (!booking) return;

  const completedAt =
    booking.completed_at ??
    (booking.status === "completed" ? new Date().toISOString() : null);
  if (!completedAt) return;

  const admin = createAdminClient();
  if (!admin) return;

  const { data: rows, error } = await admin
    .from(MEMBERSHIP_TABLE)
    .select(MEMBERSHIP_ONE_TIME_SELECT)
    .eq("linked_booking_id", bookingId);

  if (error) {
    if (!isMissingColumnError(error)) {
      console.error("[one-time-membership] complete lookup failed", {
        bookingId,
        message: error.message,
      });
    }
    return;
  }

  for (const raw of rows ?? []) {
    const membership = mapOneTimeRow(raw as Record<string, unknown>);
    const planned = planOneTimeBookingCompletionUpdate(
      membership,
      bookingId,
      completedAt,
    );
    if (!planned) continue;

    await patchMembership(membership.id, {
      consumed_at: planned.consumedAt,
      status: planned.status,
    });
    console.info("[one-time-membership] consumed on completion", {
      membershipId: membership.id,
      bookingId,
    });
  }
}

export { membershipRoleForBookingParticipant };
