import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import {
  emptyMembershipsByRole,
  indexMemberships,
  type UserMembership,
  type UserMembershipsByRole,
} from "@/lib/membership";
import {
  isMissingColumnError,
  isMissingRelationError,
  logSupabaseError,
} from "@/lib/supabase-errors";

const MEMBERSHIP_CORE_SELECT =
  "id, user_id, role, plan_id, status, start_date, end_date, auto_renew";

/** Optional columns from 20260603100000 + 20260605120000 — omitted when migrations are behind. */
const MEMBERSHIP_OPTIONAL_SELECT = [
  "plan_name",
  "stripe_customer_id",
  "stripe_subscription_id",
  "stripe_price_id",
  "stripe_checkout_session_id",
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

export async function fetchUserMemberships(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserMembershipsByRole> {
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
      return emptyMembershipsByRole();
    }
    logSupabaseError("fetchUserMemberships", error);
    throw error;
  }

  const rows = (data ?? []).map((row) =>
    mapMembershipRow(row as unknown as Record<string, unknown>),
  );
  return indexMemberships(rows);
}

export function formatMembershipLoadError(error: PostgrestError | Error): string {
  if (!("code" in error)) return error.message;
  return [error.message, error.details, error.hint, error.code].filter(Boolean).join(" — ");
}
