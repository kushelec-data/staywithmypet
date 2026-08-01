import type { SupabaseClient } from "@supabase/supabase-js";
import type { MembershipRole } from "@/lib/membership";
import { isMembershipActive, type UserMembership } from "@/lib/membership";
import { createAdminClient } from "@/lib/supabase/admin";

const ACTIVE_MEMBERSHIP_SELECT = "user_id, status, end_date, plan_id, consumed_at";

function logMarketplaceFilter(
  marketplace: "find-pets" | "find-care",
  stats: {
    candidateCount: number;
    activeMembershipUserIdsCount: number;
    finalCount: number;
  },
): void {
  console.info(`[marketplace/${marketplace}] membership filter`, stats);
}

function todayUtcIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function membershipEndDateIsValid(endDate: string | null, today: string): boolean {
  if (!endDate) return true;
  return endDate.slice(0, 10) >= today;
}

function rowUnlocksMarketplaceAccess(
  row: Pick<UserMembership, "status" | "end_date" | "plan_id" | "consumed_at">,
  today: string,
): boolean {
  return isMembershipActive({
    ...row,
    id: "",
    user_id: "",
    role: "pet_parent",
    plan_name: null,
    start_date: "",
    auto_renew: false,
    linked_booking_id: null,
    cancellation_restart_used: false,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_price_id: null,
    stripe_checkout_session_id: null,
  } as UserMembership);
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
    .in("status", ["active", "cancelled"]);

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
    if (
      membershipEndDateIsValid(endDate, today) &&
      rowUnlocksMarketplaceAccess(
        {
          status: row.status as UserMembership["status"],
          end_date: endDate,
          plan_id: row.plan_id == null ? "" : String(row.plan_id),
          consumed_at: row.consumed_at == null ? null : String(row.consumed_at),
        },
        today,
      )
    ) {
      userIds.add(userId);
    }
  }

  return userIds;
}

export async function userHasActiveMembership(
  _supabase: SupabaseClient,
  userId: string,
  role: MembershipRole,
): Promise<boolean> {
  const trimmed = userId.trim();
  if (!trimmed) return false;
  const activeIds = await loadActiveMembershipUserIds(role);
  return activeIds.has(trimmed);
}

export async function filterProfilesWithActivePetFriendMembership<T extends { id: string }>(
  _supabase: SupabaseClient,
  profiles: T[],
): Promise<T[]> {
  const candidateCount = profiles.length;
  const activeIds = await loadActiveMembershipUserIds("pet_friend");
  const filtered = profiles.filter((profile) => activeIds.has(profile.id));

  logMarketplaceFilter("find-care", {
    candidateCount,
    activeMembershipUserIdsCount: activeIds.size,
    finalCount: filtered.length,
  });

  return filtered;
}

export async function filterPetsWhoseOwnerHasActivePetParentMembership<
  T extends { ownerId: string },
>(_supabase: SupabaseClient, pets: T[]): Promise<T[]> {
  const candidateCount = pets.length;
  const activeIds = await loadActiveMembershipUserIds("pet_parent");
  const filtered = pets.filter((pet) => activeIds.has(pet.ownerId));

  logMarketplaceFilter("find-pets", {
    candidateCount,
    activeMembershipUserIdsCount: activeIds.size,
    finalCount: filtered.length,
  });

  return filtered;
}
