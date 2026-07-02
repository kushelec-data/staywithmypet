import type { SupabaseClient } from "@supabase/supabase-js";
import type { MembershipRole } from "@/lib/membership";

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

function uniqueNonEmptyUserIds(userIds: readonly string[]): string[] {
  const out = new Set<string>();
  for (const id of userIds) {
    const trimmed = id.trim();
    if (trimmed) out.add(trimmed);
  }
  return [...out];
}

/** Batch membership check via security-definer RPC (reads user_memberships server-side). */
export async function fetchUserIdsWithActiveMembership(
  supabase: SupabaseClient,
  userIds: readonly string[],
  role: MembershipRole,
): Promise<Set<string>> {
  const ids = uniqueNonEmptyUserIds(userIds);
  if (ids.length === 0) return new Set();

  const { data, error } = await supabase.rpc(BATCH_RPC_BY_ROLE[role], {
    p_user_ids: ids,
  });

  if (error) {
    console.error("[marketplace] batch membership filter failed", { role, error: error.message });
    return new Set();
  }

  const eligibleIds = Array.isArray(data) ? data : [];
  return new Set(
    eligibleIds.filter((id): id is string => typeof id === "string" && id.length > 0),
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
    console.error("[marketplace] membership check failed", { role, userId: trimmed, error: error.message });
    return false;
  }

  return data === true;
}

export async function filterProfilesWithActivePetFriendMembership<T extends { id: string }>(
  supabase: SupabaseClient,
  profiles: T[],
): Promise<T[]> {
  const eligible = await fetchUserIdsWithActiveMembership(
    supabase,
    profiles.map((profile) => profile.id),
    "pet_friend",
  );
  return profiles.filter((profile) => eligible.has(profile.id));
}

export async function filterPetsWhoseOwnerHasActivePetParentMembership<
  T extends { ownerId: string },
>(supabase: SupabaseClient, pets: T[]): Promise<T[]> {
  const eligible = await fetchUserIdsWithActiveMembership(
    supabase,
    pets.map((pet) => pet.ownerId),
    "pet_parent",
  );
  return pets.filter((pet) => eligible.has(pet.ownerId));
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
