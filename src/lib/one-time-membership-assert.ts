import type { SupabaseClient } from "@supabase/supabase-js";
import type { MembershipRole } from "@/lib/membership";
import { MEMBERSHIP_CORE_SELECT } from "@/lib/membership-load";
import { isMissingColumnError } from "@/lib/supabase-errors";
import {
  canOneTimeStartNewArrangement,
  isOneTimeMembershipActive,
  isOneTimePlanId,
  type OneTimeMembershipRow,
} from "@/lib/one-time-membership";

function mapOneTimeRow(data: Record<string, unknown>): OneTimeMembershipRow {
  return {
    plan_id: String(data.plan_id ?? ""),
    status: data.status as OneTimeMembershipRow["status"],
    start_date: String(data.start_date),
    end_date: data.end_date == null ? null : String(data.end_date),
    linked_booking_id:
      data.linked_booking_id == null ? null : String(data.linked_booking_id),
    consumed_at: data.consumed_at == null ? null : String(data.consumed_at),
    cancellation_restart_used: Boolean(data.cancellation_restart_used),
  };
}

async function loadOneTimeMembershipForRole(
  userId: string,
  role: MembershipRole,
  supabase: SupabaseClient,
): Promise<OneTimeMembershipRow | null> {
  const { data, error } = await supabase
    .from("user_memberships")
    .select(MEMBERSHIP_CORE_SELECT)
    .eq("user_id", userId)
    .eq("role", role)
    .maybeSingle();

  if (error) {
    if (isMissingColumnError(error, "linked_booking_id")) {
      const { data: fallback, error: fallbackError } = await supabase
        .from("user_memberships")
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
    return null;
  }

  if (!data) return null;
  return mapOneTimeRow(data as Record<string, unknown>);
}

/** Guard before send/accept: throws if One-Time cannot start another arrangement. */
export async function assertOneTimeCanStartArrangement(
  userId: string,
  role: MembershipRole,
  supabase: SupabaseClient,
): Promise<void> {
  const membership = await loadOneTimeMembershipForRole(userId, role, supabase);
  if (!membership || !isOneTimePlanId(membership.plan_id)) return;

  if (!isOneTimeMembershipActive(membership)) {
    throw new Error(
      "Your One-Time membership is not active. Purchase a plan on the Membership page.",
    );
  }

  if (!canOneTimeStartNewArrangement(membership)) {
    if (membership.linked_booking_id) {
      throw new Error(
        "Your One-Time membership is already linked to a care arrangement. Complete or cancel it before starting another.",
      );
    }
    throw new Error(
      "Your One-Time membership entitlement has been used. Purchase a new plan to book again.",
    );
  }
}

export async function assertOneTimeCanStartArrangementForBookingParticipants(
  petParentId: string,
  petFriendId: string,
  supabase: SupabaseClient,
): Promise<void> {
  await assertOneTimeCanStartArrangement(petParentId, "pet_parent", supabase);
  await assertOneTimeCanStartArrangement(petFriendId, "pet_friend", supabase);
}
