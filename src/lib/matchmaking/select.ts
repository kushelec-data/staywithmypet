import { MATCH_MAX_PER_USER, MATCH_MIN_SCORE } from "@/lib/matchmaking/types";
import { pairKey, relationshipKey } from "@/lib/matchmaking/score";

export type RankedPair = {
  petParentId: string;
  petFriendId: string;
  petId: string;
  score: number;
  reasons: string[];
  availabilityConflict?: boolean;
};

/** Live request statuses that hard-block matchmaking. Historical statuses do not. */
export const LIVE_REQUEST_BLOCK_STATUSES = ["pending", "accepted"] as const;

/** Live booking statuses that hard-block matchmaking. Completed/cancelled do not. */
export const LIVE_BOOKING_BLOCK_STATUSES = ["upcoming", "active"] as const;

type RelationshipRow = {
  pet_parent_id?: string | null;
  pet_friend_id?: string | null;
  status?: string | null;
};

export function isLiveRequestBlockStatus(status: string | null | undefined): boolean {
  return status === "pending" || status === "accepted";
}

export function isLiveBookingBlockStatus(status: string | null | undefined): boolean {
  return status === "upcoming" || status === "active";
}

/** Build hard-blocks from live requests and bookings only. Conversations are ignored. */
export function collectBlockedRelationships(input: {
  requests?: RelationshipRow[];
  bookings?: RelationshipRow[];
}): Set<string> {
  const blocked = new Set<string>();
  for (const row of input.requests ?? []) {
    if (!isLiveRequestBlockStatus(row.status)) continue;
    if (row.pet_parent_id && row.pet_friend_id) {
      blocked.add(relationshipKey(String(row.pet_parent_id), String(row.pet_friend_id)));
    }
  }
  for (const row of input.bookings ?? []) {
    if (!isLiveBookingBlockStatus(row.status)) continue;
    if (row.pet_parent_id && row.pet_friend_id) {
      blocked.add(relationshipKey(String(row.pet_parent_id), String(row.pet_friend_id)));
    }
  }
  return blocked;
}

export function shouldSkipRelationship(
  parentId: string,
  friendId: string,
  blockedRelationships: Set<string>,
): boolean {
  return blockedRelationships.has(relationshipKey(parentId, friendId));
}

export function shouldSkipCooldown(
  parentId: string,
  friendId: string,
  petId: string,
  recentPairKeys: Set<string>,
): boolean {
  return recentPairKeys.has(pairKey(parentId, friendId, petId));
}

export function selectWeeklyMatches(
  pairs: RankedPair[],
  maxPerUser = MATCH_MAX_PER_USER,
  minScore = MATCH_MIN_SCORE,
): RankedPair[] {
  const qualifying = pairs
    .filter((pair) => !pair.availabilityConflict && pair.score >= minScore)
    .sort((a, b) => b.score - a.score || a.petId.localeCompare(b.petId));

  const parentCount = new Map<string, number>();
  const friendCount = new Map<string, number>();
  const selected: RankedPair[] = [];
  const seen = new Set<string>();

  for (const pair of qualifying) {
    const key = pairKey(pair.petParentId, pair.petFriendId, pair.petId);
    if (seen.has(key)) continue;
    const parentHasRoom = (parentCount.get(pair.petParentId) ?? 0) < maxPerUser;
    const friendHasRoom = (friendCount.get(pair.petFriendId) ?? 0) < maxPerUser;
    if (!parentHasRoom || !friendHasRoom) continue;
    seen.add(key);
    selected.push(pair);
    parentCount.set(pair.petParentId, (parentCount.get(pair.petParentId) ?? 0) + 1);
    friendCount.set(pair.petFriendId, (friendCount.get(pair.petFriendId) ?? 0) + 1);
  }

  return selected;
}

export function matchesForRecipient(pairs: RankedPair[], userId: string): RankedPair[] {
  return pairs
    .filter((pair) => pair.petParentId === userId || pair.petFriendId === userId)
    .sort((a, b) => b.score - a.score)
    .slice(0, MATCH_MAX_PER_USER);
}
