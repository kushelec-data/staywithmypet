import type { SupabaseClient } from "@supabase/supabase-js";
import type { MembershipRole } from "@/lib/membership";

const LIST_RPC_BY_ROLE: Record<
  MembershipRole,
  "list_active_pet_parent_membership_user_ids" | "list_active_pet_friend_membership_user_ids"
> = {
  pet_parent: "list_active_pet_parent_membership_user_ids",
  pet_friend: "list_active_pet_friend_membership_user_ids",
};

const BATCH_RPC_BY_ROLE: Record<
  MembershipRole,
  "user_ids_with_active_pet_parent_membership" | "user_ids_with_active_pet_friend_membership"
> = {
  pet_parent: "user_ids_with_active_pet_parent_membership",
  pet_friend: "user_ids_with_active_pet_friend_membership",
};

const SINGLE_RPC_BY_ROLE: Record<
  MembershipRole,
  "has_active_pet_parent_membership" | "has_active_pet_friend_membership"
> = {
  pet_parent: "has_active_pet_parent_membership",
  pet_friend: "has_active_pet_friend_membership",
};

function parseUserIdArray(data: unknown): Set<string> {
  if (!Array.isArray(data)) return new Set();
  return new Set(
    data.filter((id): id is string => typeof id === "string" && id.trim().length > 0),
  );
}

function uniqueNonEmptyUserIds(userIds: readonly string[]): string[] {
  const out = new Set<string>();
  for (const id of userIds) {
    const trimmed = id.trim();
    if (trimmed) out.add(trimmed);
  }
  return [...out];
}

function logMarketplaceFilter(
  marketplace: "find-pets" | "find-care",
  stats: {
    candidateCount: number;
    activeMembershipUserIdsCount: number;
    finalCount: number;
    source: "list-rpc" | "batch-rpc";
  },
): void {
  console.info(`[marketplace/${marketplace}] membership filter`, stats);
}

/** All user IDs with active membership for role (security-definer list RPC). */
export async function fetchAllActiveMembershipUserIds(
  supabase: SupabaseClient,
  role: MembershipRole,
): Promise<Set<string> | null> {
  const { data, error } = await supabase.rpc(LIST_RPC_BY_ROLE[role]);

  if (error) {
    console.warn("[marketplace] list membership RPC failed", {
      role,
      rpc: LIST_RPC_BY_ROLE[role],
      error: error.message,
    });
    return null;
  }

  return parseUserIdArray(data);
}

/** Batch membership check for candidate user IDs (fallback when list RPC unavailable). */
export async function fetchUserIdsWithActiveMembership(
  supabase: SupabaseClient,
  userIds: readonly string[],
  role: MembershipRole,
): Promise<Set<string> | null> {
  const ids = uniqueNonEmptyUserIds(userIds);
  if (ids.length === 0) return new Set();

  const { data, error } = await supabase.rpc(BATCH_RPC_BY_ROLE[role], {
    p_user_ids: ids,
  });

  if (error) {
    console.warn("[marketplace] batch membership RPC failed", {
      role,
      rpc: BATCH_RPC_BY_ROLE[role],
      error: error.message,
    });
    return null;
  }

  return parseUserIdArray(data);
}

async function resolveActiveMembershipUserIds(
  supabase: SupabaseClient,
  role: MembershipRole,
  candidateUserIds: readonly string[],
): Promise<{ activeIds: Set<string>; source: "list-rpc" | "batch-rpc" }> {
  const fromList = await fetchAllActiveMembershipUserIds(supabase, role);
  if (fromList) return { activeIds: fromList, source: "list-rpc" };

  const fromBatch = await fetchUserIdsWithActiveMembership(supabase, candidateUserIds, role);
  if (fromBatch) return { activeIds: fromBatch, source: "batch-rpc" };

  throw new Error(
    "Marketplace membership filter is unavailable. Apply latest Supabase migrations and reload the API schema.",
  );
}

export async function userHasActiveMembership(
  supabase: SupabaseClient,
  userId: string,
  role: MembershipRole,
): Promise<boolean> {
  const trimmed = userId.trim();
  if (!trimmed) return false;

  const { data, error } = await supabase.rpc(SINGLE_RPC_BY_ROLE[role], {
    p_user_id: trimmed,
  });

  if (error) {
    console.warn("[marketplace] single membership RPC failed", {
      role,
      userId: trimmed,
      error: error.message,
    });
    const activeIds = await fetchAllActiveMembershipUserIds(supabase, role);
    if (activeIds) return activeIds.has(trimmed);
    const batch = await fetchUserIdsWithActiveMembership(supabase, [trimmed], role);
    if (batch) return batch.has(trimmed);
    return false;
  }

  return data === true;
}

export async function filterProfilesWithActivePetFriendMembership<T extends { id: string }>(
  supabase: SupabaseClient,
  profiles: T[],
): Promise<T[]> {
  const candidateCount = profiles.length;
  const { activeIds, source } = await resolveActiveMembershipUserIds(
    supabase,
    "pet_friend",
    profiles.map((profile) => profile.id),
  );
  const filtered = profiles.filter((profile) => activeIds.has(profile.id));

  logMarketplaceFilter("find-care", {
    candidateCount,
    activeMembershipUserIdsCount: activeIds.size,
    finalCount: filtered.length,
    source,
  });

  return filtered;
}

export async function filterPetsWhoseOwnerHasActivePetParentMembership<
  T extends { ownerId: string },
>(supabase: SupabaseClient, pets: T[]): Promise<T[]> {
  const candidateCount = pets.length;
  const { activeIds, source } = await resolveActiveMembershipUserIds(
    supabase,
    "pet_parent",
    pets.map((pet) => pet.ownerId),
  );
  const filtered = pets.filter((pet) => activeIds.has(pet.ownerId));

  logMarketplaceFilter("find-pets", {
    candidateCount,
    activeMembershipUserIdsCount: activeIds.size,
    finalCount: filtered.length,
    source,
  });

  return filtered;
}

export function excludeMarketplaceSelf<T extends { id: string }>(
  rows: T[],
  excludeUserId: string | null | undefined,
): T[] {
  const selfId = excludeUserId?.trim();
  if (!selfId) return rows;
  return rows.filter((row) => row.id !== selfId);
}

export function excludeMarketplaceOwnPets<T extends { ownerId: string }>(
  pets: T[],
  excludeOwnerId: string | null | undefined,
): T[] {
  const selfId = excludeOwnerId?.trim();
  if (!selfId) return pets;
  return pets.filter((pet) => pet.ownerId !== selfId);
}
