/**
 * PostgREST `.or()` filters for listing requests.
 * Includes legacy rows where sender_id/receiver_id were backfilled incorrectly
 * but pet_parent_id / pet_friend_id / sender_id still identify the true direction.
 */

export function requestListFilterOr(
  userId: string,
  direction: "incoming" | "outgoing",
): string {
  if (direction === "incoming") {
    return [
      `receiver_id.eq.${userId}`,
      `and(pet_friend_id.eq.${userId},sender_id.eq.pet_parent_id)`,
      `and(pet_parent_id.eq.${userId},sender_id.eq.pet_friend_id)`,
    ].join(",");
  }

  return [
    `sender_id.eq.${userId}`,
    `and(pet_parent_id.eq.${userId},sender_id.eq.pet_parent_id)`,
    `and(pet_friend_id.eq.${userId},sender_id.eq.pet_friend_id)`,
  ].join(",");
}
