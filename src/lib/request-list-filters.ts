import type { RequestRow } from "@/types/database";

/** Simple `.eq(column, userId)` queries — merged in JS (no nested PostgREST `.or()`). */
export const INCOMING_REQUEST_COLUMNS = [
  "receiver_id",
  "pet_friend_id",
  "pet_parent_id",
] as const;

export const OUTGOING_REQUEST_COLUMNS = ["sender_id", "pet_parent_id", "pet_friend_id"] as const;

export type RequestParticipantColumn =
  | (typeof INCOMING_REQUEST_COLUMNS)[number]
  | (typeof OUTGOING_REQUEST_COLUMNS)[number];

/** Legacy rows: null sender/receiver — default parent → friend (see migrations). */
export function resolveEffectiveSenderReceiver(row: RequestRow): {
  senderId: string | null;
  receiverId: string | null;
} {
  if (row.sender_id || row.receiver_id) {
    return { senderId: row.sender_id, receiverId: row.receiver_id };
  }

  if (row.pet_parent_id && row.pet_friend_id && row.pet_parent_id !== row.pet_friend_id) {
    return { senderId: row.pet_parent_id, receiverId: row.pet_friend_id };
  }

  return { senderId: null, receiverId: null };
}

export function isIncomingRequest(row: RequestRow, userId: string): boolean {
  const { senderId, receiverId } = resolveEffectiveSenderReceiver(row);

  if (receiverId === userId) return true;

  if (!row.sender_id && !row.receiver_id) {
    if (row.pet_friend_id === userId) return true;
    if (row.pet_parent_id === userId && row.pet_friend_id && row.pet_friend_id !== userId) {
      return true;
    }
  }

  if (receiverId && receiverId !== userId) return false;
  if (senderId === userId) return false;

  return false;
}

export function isOutgoingRequest(row: RequestRow, userId: string): boolean {
  const { senderId, receiverId } = resolveEffectiveSenderReceiver(row);

  if (senderId === userId) return true;

  if (!row.sender_id && !row.receiver_id) {
    if (row.pet_parent_id === userId) return true;
    if (row.pet_friend_id === userId && row.pet_parent_id && row.pet_parent_id !== userId) {
      return true;
    }
  }

  if (senderId && senderId !== userId) return false;
  if (receiverId === userId && senderId !== userId) return false;

  return false;
}
