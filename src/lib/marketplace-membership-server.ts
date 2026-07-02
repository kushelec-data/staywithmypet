import type { MembershipRole } from "@/lib/membership";
import { createAdminClient } from "@/lib/supabase/admin";

const ACTIVE_MEMBERSHIP_SELECT = "user_id, status, end_date";

function todayUtcIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function membershipEndDateIsValid(endDate: string | null, today: string): boolean {
  if (!endDate) return true;
  return endDate.slice(0, 10) >= today;
}

/** Load active marketplace membership user IDs from user_memberships (service role). */
export async function loadActiveMembershipUserIds(
  role: MembershipRole,
): Promise<Set<string>> {
  const admin = createAdminClient();
  if (!admin) {
    console.error("[marketplace] active membership load skipped: missing service role key");
    return new Set();
  }

  const today = todayUtcIsoDate();

  const { data, error } = await admin
    .from("user_memberships")
    .select(ACTIVE_MEMBERSHIP_SELECT)
    .eq("role", role)
    .eq("status", "active");

  if (error) {
    console.error("[marketplace] user_memberships active load failed", {
      role,
      message: error.message,
    });
    return new Set();
  }

  const userIds = new Set<string>();
  for (const row of data ?? []) {
    const userId = row.user_id == null ? "" : String(row.user_id);
    if (!userId) continue;
    const endDate = row.end_date == null ? null : String(row.end_date);
    if (membershipEndDateIsValid(endDate, today)) {
      userIds.add(userId);
    }
  }

  return userIds;
}
