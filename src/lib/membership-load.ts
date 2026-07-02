import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
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

const MEMBERSHIP_CORE_SELECT =
  "id, user_id, role, plan_id, status, start_date, end_date, auto_renew";

/** Optional Stripe columns — omitted when migrations/env are behind (never plan_name / checkout session). */
const MEMBERSHIP_OPTIONAL_SELECT = [
  "stripe_customer_id",
  "stripe_subscription_id",
  "stripe_price_id",
] as const;

const MEMBERSHIP_SELECT = [MEMBERSHIP_CORE_SELECT, ...MEMBERSHIP_OPTIONAL_SELECT].join(", ");

function selectWithoutColumns(removed: readonly string[]): string {
  let select = MEMBERSHIP_SELECT;
  for (const col of removed) {
    select = select.replace(`, ${col}`, "");
  }
  return select;
}

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
    stripe_customer_id:
      data.stripe_customer_id == null ? null : String(data.stripe_customer_id),
    stripe_subscription_id:
      data.stripe_subscription_id == null ? null : String(data.stripe_subscription_id),
    stripe_price_id: data.stripe_price_id == null ? null : String(data.stripe_price_id),
    stripe_checkout_session_id:
      data.stripe_checkout_session_id == null || data.stripe_checkout_session_id === undefined
        ? null
        : String(data.stripe_checkout_session_id),
  };
}

export async function fetchUserMembershipRows(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserMembership[]> {
  const stripped: string[] = [];
  let select = MEMBERSHIP_SELECT;
  let { data, error } = await supabase
    .from("user_memberships")
    .select(select)
    .eq("user_id", userId);

  while (error && isMissingColumnError(error)) {
    const missing =
      MEMBERSHIP_OPTIONAL_SELECT.find(
        (col) =>
          !stripped.includes(col) && select.includes(col) && isMissingColumnError(error!, col),
      ) ??
      MEMBERSHIP_OPTIONAL_SELECT.find((col) => !stripped.includes(col) && select.includes(col));
    if (!missing) break;
    stripped.push(missing);
    console.warn(`[membership] retrying load without column ${missing}`);
    select = selectWithoutColumns(stripped);
    ({ data, error } = await supabase
      .from("user_memberships")
      .select(select)
      .eq("user_id", userId));
  }

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
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
