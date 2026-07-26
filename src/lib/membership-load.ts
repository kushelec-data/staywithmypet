import type { SupabaseClient } from "@supabase/supabase-js";
import {
  emptyMembershipsByRole,
  filterActiveMembershipsByRole,
  indexMemberships,
  type UserMembership,
  type UserMembershipsByRole,
} from "@/lib/membership";
import {
  isMissingColumnError,
  isMissingRelationError,
  isPostgrestError,
  logSupabaseError,
} from "@/lib/supabase-errors";

/** Columns present in production after 20260602100000_user_memberships.sql (no Stripe columns). */
export const MEMBERSHIP_CORE_SELECT =
  "id, user_id, role, plan_id, status, start_date, end_date, auto_renew, linked_booking_id, consumed_at, cancellation_restart_used";

function mapMembershipRow(data: Record<string, unknown>): UserMembership {
  return {
    id: String(data.id),
    user_id: String(data.user_id),
    role: data.role as UserMembership["role"],
    plan_id: String(data.plan_id),
    plan_name: data.plan_name == null ? null : String(data.plan_name),
    status: data.status as UserMembership["status"],
    start_date: String(data.start_date),
    end_date: data.end_date == null ? null : String(data.end_date),
    auto_renew: Boolean(data.auto_renew),
    linked_booking_id:
      data.linked_booking_id == null ? null : String(data.linked_booking_id),
    consumed_at: data.consumed_at == null ? null : String(data.consumed_at),
    cancellation_restart_used: Boolean(data.cancellation_restart_used),
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_price_id: null,
    stripe_checkout_session_id: null,
  };
}

export async function fetchUserMembershipRows(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserMembership[]> {
  const { data, error } = await supabase
    .from("user_memberships")
    .select(MEMBERSHIP_CORE_SELECT)
    .eq("user_id", userId);

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }
    if (isMissingColumnError(error, "linked_booking_id")) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("user_memberships")
        .select("id, user_id, role, plan_id, status, start_date, end_date, auto_renew")
        .eq("user_id", userId);
      if (fallbackError) {
        logSupabaseError("fetchUserMembershipRows", fallbackError);
        throw fallbackError;
      }
      return (fallbackData ?? []).map((row) =>
        mapMembershipRow({
          ...(row as Record<string, unknown>),
          linked_booking_id: null,
          consumed_at: null,
          cancellation_restart_used: false,
        }),
      );
    }
    logSupabaseError("fetchUserMembershipRows", error);
    throw error;
  }

  return (data ?? []).map((row) =>
    mapMembershipRow(row as unknown as Record<string, unknown>),
  );
}

export async function fetchUserMemberships(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserMembershipsByRole> {
  return indexMemberships(await fetchUserMembershipRows(supabase, userId));
}

/**
 * Load active memberships from user_memberships only (no legacy profile fallback).
 * Cancelled/expired rows are omitted; never infer dual membership from profiles.role.
 */
export async function resolveUserMemberships(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserMembershipsByRole> {
  try {
    const rows = await fetchUserMembershipRows(supabase, userId);
    return filterActiveMembershipsByRole(indexMemberships(rows));
  } catch (err) {
    if (isPostgrestError(err)) {
      logSupabaseError("resolveUserMemberships", err);
    } else {
      console.error("[membership] resolveUserMemberships", err);
    }
    return emptyMembershipsByRole();
  }
}
