import type { SupabaseClient } from "@supabase/supabase-js";
import { formatSupabaseError } from "@/lib/profile-load";

/** Payload for the owner-only profiles.is_public toggle. Never used by generic profile save. */
export function profileVisibilityUpdatePayload(isPublic: boolean): { is_public: boolean } {
  return { is_public: isPublic };
}

/**
 * Direct /users/[id] access: public profiles are visible to anyone;
 * hidden profiles are visible only to the owner.
 */
export function canViewerSeePublicMemberProfile(
  isPublic: boolean,
  profileId: string,
  viewerId: string | null | undefined,
): boolean {
  if (isPublic) return true;
  return Boolean(viewerId && viewerId === profileId);
}

/** Owner-only: explicit public profile visibility. Does not touch pets.is_public. */
export async function updateProfilePublicVisibility(
  supabase: SupabaseClient,
  userId: string,
  isPublic: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update(profileVisibilityUpdatePayload(isPublic))
    .eq("id", userId);

  if (error) {
    throw new Error(formatSupabaseError(error));
  }
}
