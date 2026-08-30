import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchUserProfile } from "@/lib/profile-load";

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
 * - Never writes profiles.is_public (owner toggle only — do not auto-republish).
 * - Never writes pets.is_public (owner listing toggle only).
 * - May heal pets.is_active when it is not explicitly false.
 */
export async function applyMarketplaceVisibility(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const profile = await fetchUserProfile(supabase, userId);
  if (!profile) return;

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
