import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchPublicSearchPetById,
  type PublicSearchPet,
} from "@/lib/public-pet-search";

export type { PublicSearchPet as PublicPetProfile } from "@/lib/public-pet-search";

export function publicPetHref(petId: string): string {
  return `/pet/${petId}`;
}

export type PublicPetLoadResult = {
  pet: PublicSearchPet | null;
  /** Viewer is the pet owner (may preview before listing is public). */
  isOwnerPreview: boolean;
  /** Pet or owner profile is not visible to the public yet. */
  notListedPublicly: boolean;
};

/**
 * Load a pet for the public profile page.
 * Owners can preview their own pets even when not yet public.
 */
export async function fetchPublicPetProfile(
  supabase: SupabaseClient,
  petId: string,
  viewerId?: string | null,
): Promise<PublicPetLoadResult> {
  const pet = await fetchPublicSearchPetById(supabase, petId);
  if (pet) {
    return { pet, isOwnerPreview: viewerId === pet.ownerId, notListedPublicly: false };
  }

  if (!viewerId) {
    return { pet: null, isOwnerPreview: false, notListedPublicly: false };
  }

  const { data, error } = await supabase
    .from("pets")
    .select("owner_id, is_public, is_active")
    .eq("id", petId)
    .maybeSingle();

  if (error || !data || data.owner_id !== viewerId) {
    return { pet: null, isOwnerPreview: false, notListedPublicly: false };
  }

  const preview = await fetchPublicSearchPetById(supabase, petId, {
    skipVisibilityFilters: true,
  });
  if (!preview) {
    return { pet: null, isOwnerPreview: true, notListedPublicly: false };
  }

  return {
    pet: preview,
    isOwnerPreview: true,
    notListedPublicly: data.is_public === false || data.is_active === false,
  };
}
