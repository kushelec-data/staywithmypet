import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import {
  emptyMembershipsByRole,
  indexMemberships,
  type UserMembership,
  type UserMembershipsByRole,
} from "@/lib/membership";
import { isMissingRelationError } from "@/lib/supabase-errors";

const MEMBERSHIP_SELECT =
  "id, user_id, role, plan_id, plan_name, status, start_date, end_date, auto_renew, stripe_customer_id, stripe_subscription_id, stripe_price_id";

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
  };
}

export async function fetchUserMemberships(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserMembershipsByRole> {
  const { data, error } = await supabase
    .from("user_memberships")
    .select(MEMBERSHIP_SELECT)
    .eq("user_id", userId);

  if (error) {
    if (isMissingRelationError(error)) {
      return emptyMembershipsByRole();
    }
    throw error;
  }

  const rows = (data ?? []).map((row) => mapMembershipRow(row as Record<string, unknown>));
  return indexMemberships(rows);
}

export function formatMembershipLoadError(error: PostgrestError | Error): string {
  if (!("code" in error)) return error.message;
  return [error.message, error.details, error.hint, error.code].filter(Boolean).join(" — ");
}
