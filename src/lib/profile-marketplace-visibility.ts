import type { SupabaseClient } from "@supabase/supabase-js";
import {
  profileMeetsAnyMarketplaceMinimum,
} from "@/lib/profile-marketplace-eligibility";
import { fetchUserProfile } from "@/lib/profile-load";
import type { ProfileRole } from "@/lib/profile-setup";

type PetVisibilityRow = {
  id: string;
  name: string | null;
  species: string | null;
  is_public: boolean | null;
  is_active: boolean | null;
};

async function fetchPetVisibilityRows(
  supabase: SupabaseClient,
  ownerId: string,
): Promise<PetVisibilityRow[]> {
  const { data, error } = await supabase
    .from("pets")
    .select("id, name, species, is_public, is_active")
    .eq("owner_id", ownerId);

  if (error) {
    if (/column/i.test(error.message)) {
      const fallback = await supabase
        .from("pets")
        .select("id, name, species, is_active")
        .eq("owner_id", ownerId);
      if (fallback.error) return [];
      return (fallback.data ?? []).map((row) => ({
        id: String(row.id),
        name: row.name as string | null,
        species: row.species as string | null,
        is_public: null,
        is_active: row.is_active as boolean | null,
      }));
    }
    return [];
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    name: row.name as string | null,
    species: row.species as string | null,
    is_public: row.is_public as boolean | null,
    is_active: row.is_active as boolean | null,
  }));
}

/**
 * Sync marketplace visibility flags without retroactively hiding legacy listings.
 * - Never sets profiles.is_public or pets.is_public to false.
 * - Heals profiles wrongly demoted to is_public=false when minimum eligibility is met.
 * - Pet Find Pets listing (pets.is_public) changes only via the owner listing toggle.
 */
export async function applyMarketplaceVisibility(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const profile = await fetchUserProfile(supabase, userId);
  if (!profile) return;

  const profileInput = {
    display_name: profile.display_name,
    bio: profile.bio,
    location: profile.location,
    public_location: profile.public_location,
    city: profile.city,
    country: profile.country,
    google_place_id: profile.google_place_id,
    latitude: profile.latitude,
    longitude: profile.longitude,
    is_public: profile.is_public,
    role: profile.role as ProfileRole,
  };

  if (profile.is_public === false && profileMeetsAnyMarketplaceMinimum(profileInput)) {
    await supabase.from("profiles").update({ is_public: true }).eq("id", userId);
  }

  if (profile.role === "pet_friend") return;

  const petRows = await fetchPetVisibilityRows(supabase, userId);
  if (petRows.length === 0) return;

  await Promise.all(
    petRows.map((pet) => {
      const updates: { is_active: boolean } = {
        is_active: pet.is_active !== false,
      };

      return supabase.from("pets").update(updates).eq("id", pet.id).eq("owner_id", userId);
    }),
  );
}
