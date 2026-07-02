import type { SupabaseClient } from "@supabase/supabase-js";
import type { MembershipRole } from "@/lib/membership";

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

async function fetchActiveMembershipUserIds(role: MembershipRole): Promise<Set<string>> {
  try {
    const response = await fetch(
      `/api/marketplace/active-membership-user-ids?role=${encodeURIComponent(role)}`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      console.warn("[marketplace] membership API request failed", {
        role,
        status: response.status,
      });
      return new Set();
    }

    const payload = (await response.json()) as { userIds?: unknown };
    const userIds = Array.isArray(payload.userIds) ? payload.userIds : [];
    return new Set(
      userIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0),
    );
  } catch (error) {
    console.warn("[marketplace] membership API request error", {
      role,
      message: error instanceof Error ? error.message : String(error),
    });
    return new Set();
  }
}

export async function userHasActiveMembership(
  _supabase: SupabaseClient,
  userId: string,
  role: MembershipRole,
): Promise<boolean> {
  const trimmed = userId.trim();
  if (!trimmed) return false;
  const activeIds = await fetchActiveMembershipUserIds(role);
  return activeIds.has(trimmed);
}

export async function filterProfilesWithActivePetFriendMembership<T extends { id: string }>(
  _supabase: SupabaseClient,
  profiles: T[],
): Promise<T[]> {
  const candidateCount = profiles.length;
  const activeIds = await fetchActiveMembershipUserIds("pet_friend");
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
  const activeIds = await fetchActiveMembershipUserIds("pet_parent");
  const filtered = pets.filter((pet) => activeIds.has(pet.ownerId));

  logMarketplaceFilter("find-pets", {
    candidateCount,
    activeMembershipUserIdsCount: activeIds.size,
    finalCount: filtered.length,
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
