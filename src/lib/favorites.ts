import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbPetToCard } from "@/lib/pet-data";
import type { Pet } from "@/lib/pets";
import { mapPetFriendSearchRow, type SearchProfile } from "@/lib/search-profiles";
import type { ProfileRole } from "@/lib/profile-setup";
import {
  filterVisibleSavedFriends,
  filterVisibleSavedPets,
  type SavedFriendRowInput,
  type SavedPetRowInput,
} from "@/lib/saved-items-filter";
import { isMissingRelationError, isPostgrestError } from "@/lib/supabase-errors";

export type FavoriteTarget =
  | { type: "pet"; id: string }
  | { type: "friend"; id: string };

export type UserFavoriteIds = {
  petIds: Set<string>;
  friendIds: Set<string>;
};

export async function fetchUserFavoriteIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserFavoriteIds> {
  const { data, error } = await supabase
    .from("favorites")
    .select("pet_id, friend_profile_id")
    .eq("user_id", userId);

  if (error) throw error;

  const petIds = new Set<string>();
  const friendIds = new Set<string>();

  for (const row of data ?? []) {
    if (row.pet_id) petIds.add(row.pet_id);
    if (row.friend_profile_id) friendIds.add(row.friend_profile_id);
  }

  return { petIds, friendIds };
}

export function isFavoriteSaved(ids: UserFavoriteIds, target: FavoriteTarget): boolean {
  return target.type === "pet" ? ids.petIds.has(target.id) : ids.friendIds.has(target.id);
}

export async function toggleFavorite(
  supabase: SupabaseClient,
  userId: string,
  target: FavoriteTarget,
  currentlySaved: boolean,
): Promise<void> {
  if (target.type === "pet") {
    if (currentlySaved) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", userId)
        .eq("pet_id", target.id);
      if (error) throw error;
      return;
    }

    const { error } = await supabase.from("favorites").insert({
      user_id: userId,
      pet_id: target.id,
      friend_profile_id: null,
    });
    if (error) throw error;
    return;
  }

  if (currentlySaved) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("friend_profile_id", target.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("favorites").insert({
    user_id: userId,
    pet_id: null,
    friend_profile_id: target.id,
  });
  if (error) throw error;
}

export type SavedItems = {
  pets: Pet[];
  friends: SearchProfile[];
};

export async function fetchSavedItems(
  supabase: SupabaseClient,
  userId: string,
): Promise<SavedItems> {
  const { petIds, friendIds } = await fetchUserFavoriteIds(supabase, userId);

  const petIdList = [...petIds];
  const friendIdList = [...friendIds];

  const [petsResult, friendsResult] = await Promise.all([
    petIdList.length
      ? supabase
          .from("pets")
          .select(
            "id, owner_id, name, species, breed, age_label, location, price_per_night_cents, tags, rating_avg, rating_count, is_public, is_active, pet_photos ( public_url, is_primary, sort_order ), profiles!pets_owner_id_fkey ( display_name, is_public )",
          )
          .in("id", petIdList)
      : Promise.resolve({ data: [], error: null }),
    friendIdList.length
      ? supabase
          .from("profiles")
          .select(
            "id, display_name, location, public_location, city, country, google_place_id, latitude, longitude, bio, avatar_url, role, active_mode, rating_avg, rating_count, stay_count, languages, is_public",
          )
          .in("id", friendIdList)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (petsResult.error) throw petsResult.error;
  if (friendsResult.error) throw friendsResult.error;

  const petRows = (petsResult.data ?? []).map((row, index) =>
    mapDbPetToCard(row as Parameters<typeof mapDbPetToCard>[0], index),
  );

  const savedPetInputs: SavedPetRowInput[] = (petsResult.data ?? []).map((row, index) => {
    const typed = row as {
      is_public?: boolean | null;
      is_active?: boolean | null;
      species?: string | null;
      profiles?: { is_public?: boolean | null } | { is_public?: boolean | null }[] | null;
    };
    const ownerJoin = typed.profiles;
    const ownerProfile = Array.isArray(ownerJoin) ? ownerJoin[0] : ownerJoin;
    return {
      pet: petRows[index]!,
      isPublic: typed.is_public ?? null,
      isActive: typed.is_active ?? null,
      species: typed.species ?? null,
      ownerIsPublic: ownerProfile?.is_public ?? null,
    };
  });

  const pets = filterVisibleSavedPets(savedPetInputs);

  const savedFriendInputs: SavedFriendRowInput[] = (friendsResult.data ?? []).map((row) => ({
    profile: mapPetFriendSearchRow({
      id: row.id,
      display_name: row.display_name?.trim() ?? "Member",
      location: row.location,
      public_location: row.public_location,
      city: row.city,
      country: row.country,
      google_place_id: row.google_place_id,
      latitude: row.latitude,
      longitude: row.longitude,
      bio: row.bio,
      avatar_url: row.avatar_url,
      role: row.role as ProfileRole,
      active_mode: row.active_mode,
      rating_avg: row.rating_avg,
      rating_count: row.rating_count,
      stay_count: row.stay_count,
      languages: row.languages,
      details: undefined,
    }),
    display_name: row.display_name?.trim() ?? "Member",
    bio: row.bio,
    location: row.location,
    public_location: row.public_location,
    city: row.city,
    country: row.country,
    google_place_id: row.google_place_id,
    latitude: typeof row.latitude === "number" ? row.latitude : null,
    longitude: typeof row.longitude === "number" ? row.longitude : null,
    is_public: row.is_public,
    role: row.role as ProfileRole,
  }));

  const friends = filterVisibleSavedFriends(savedFriendInputs);

  return { pets, friends };
}

/** Count Pet Friends who saved this pet; null if favorites table unavailable or denied. */
export async function countPetSaves(
  supabase: SupabaseClient,
  petId: string,
): Promise<number | null> {
  const { count, error } = await supabase
    .from("favorites")
    .select("id", { count: "exact", head: true })
    .eq("pet_id", petId);

  if (error) {
    if (isPostgrestError(error) && isMissingRelationError(error)) return null;
    return null;
  }

  return count ?? 0;
}
