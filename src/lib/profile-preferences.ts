import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchUserProfile, formatSupabaseError } from "@/lib/profile-load";
import { parseProfileDetails } from "@/lib/profile-details";
import {
  mergePetFriendIntoDetails,
  petFriendFormFromDetails,
  type PetFriendProfileFormInput,
} from "@/lib/profile-friend-form";
import type { ProfileRow } from "@/lib/profile-utils";

/** @deprecated — use PetFriendProfileFormInput via profile edit */
export type PreferencesFormInput = PetFriendProfileFormInput;

export function preferencesFromDetails(detailsRaw: unknown): PetFriendProfileFormInput {
  return petFriendFormFromDetails(parseProfileDetails(detailsRaw));
}

export function buildDetailsPatch(
  input: PetFriendProfileFormInput,
  existingDetailsRaw: unknown,
): Record<string, unknown> {
  return mergePetFriendIntoDetails(existingDetailsRaw, input);
}

export async function saveProfilePreferences(
  supabase: SupabaseClient,
  userId: string,
  input: PetFriendProfileFormInput,
  currentProfile: ProfileRow,
): Promise<ProfileRow> {
  void currentProfile;
  const { data: row, error: loadError } = await supabase
    .from("profiles")
    .select("details")
    .eq("id", userId)
    .maybeSingle();

  if (loadError) {
    throw new Error(formatSupabaseError(loadError));
  }

  const detailsPatch = buildDetailsPatch(input, row?.details ?? {});

  const { error } = await supabase
    .from("profiles")
    .update({
      details: detailsPatch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    throw new Error(formatSupabaseError(error));
  }

  const reloaded = await fetchUserProfile(supabase, userId);
  if (!reloaded) {
    throw new Error("Preferences saved but profile could not be reloaded.");
  }
  return reloaded;
}
