import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchOwnerPetIntros } from "@/lib/pet-intro";
import { fetchUserProfile } from "@/lib/profile-load";
import { resolveActiveMode } from "@/lib/profile-mode";
import {
  isProfileMarketplaceReady,
  isSinglePetMarketplaceReady,
} from "@/lib/profile-required-fields";

/** Sync `profiles.is_public` and pet listing visibility from shared required-field rules. */
export async function applyMarketplaceVisibility(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const profile = await fetchUserProfile(supabase, userId);
  if (!profile) return;

  const activeMode = resolveActiveMode(profile.role, profile.active_mode);
  const petIntros =
    activeMode === "pet_parent" ? await fetchOwnerPetIntros(supabase, userId) : [];

  const profileReady = isProfileMarketplaceReady(profile, { activeMode, petIntros });

  await supabase.from("profiles").update({ is_public: profileReady }).eq("id", userId);

  if (activeMode === "pet_parent" && petIntros.length > 0) {
    await Promise.all(
      petIntros.map((pet) =>
        supabase
          .from("pets")
          .update({
            is_public: profileReady && isSinglePetMarketplaceReady(pet),
            is_active: pet.isActive !== false,
          })
          .eq("id", pet.id)
          .eq("owner_id", userId),
      ),
    );
  }
}
