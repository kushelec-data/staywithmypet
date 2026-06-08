import type { SupabaseClient } from "@supabase/supabase-js";
import { publicProfileHref } from "@/lib/profile-completeness";
import { publicPetHref } from "@/lib/public-pet";

/** Request statuses where participants may preview profiles and message. */
export const REQUEST_ACCESS_STATUSES = ["pending", "accepted", "completed"] as const;

export function messagesHrefForRequest(requestId: string): string {
  return `/messages?request=${requestId}`;
}

export function profileHrefForParticipant(profileId: string): string {
  return publicProfileHref(profileId);
}

export function petHrefForRequestParticipant(petId: string): string {
  return publicPetHref(petId);
}

/** True when viewer and profile owner share an active care request. */
export async function usersShareActiveRequest(
  supabase: SupabaseClient,
  viewerId: string,
  profileId: string,
): Promise<boolean> {
  if (!viewerId || !profileId) return false;
  if (viewerId === profileId) return true;

  const { count, error } = await supabase
    .from("requests")
    .select("id", { count: "exact", head: true })
    .in("status", [...REQUEST_ACCESS_STATUSES])
    .or(
      `and(pet_parent_id.eq.${viewerId},pet_friend_id.eq.${profileId}),and(pet_parent_id.eq.${profileId},pet_friend_id.eq.${viewerId})`,
    );

  if (error) return false;
  return (count ?? 0) > 0;
}

/** True when viewer is on a request that references this pet. */
export async function userCanViewPetViaRequest(
  supabase: SupabaseClient,
  viewerId: string,
  petId: string,
): Promise<boolean> {
  if (!viewerId || !petId) return false;

  const { count, error } = await supabase
    .from("requests")
    .select("id", { count: "exact", head: true })
    .eq("pet_id", petId)
    .in("status", [...REQUEST_ACCESS_STATUSES])
    .or(`pet_parent_id.eq.${viewerId},pet_friend_id.eq.${viewerId}`);

  if (error) return false;
  return (count ?? 0) > 0;
}
