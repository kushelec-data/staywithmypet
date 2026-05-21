import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbPetToCard } from "@/lib/pet-data";
import type { Pet } from "@/lib/pets";
import { mapPetFriendSearchRow, type SearchProfile } from "@/lib/search-profiles";
import type { ProfileRole } from "@/lib/profile-setup";

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
            "id, owner_id, name, species, breed, age_label, location, price_per_night_cents, tags, rating_avg, rating_count, pet_photos ( public_url, is_primary, sort_order ), profiles ( display_name )",
          )
          .in("id", petIdList)
      : Promise.resolve({ data: [], error: null }),
    friendIdList.length
      ? supabase
          .from("profiles")
          .select(
            "id, display_name, location, bio, avatar_url, role, active_mode, rating_avg, rating_count, stay_count, languages",
          )
          .in("id", friendIdList)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (petsResult.error) throw petsResult.error;
  if (friendsResult.error) throw friendsResult.error;

  const pets = (petsResult.data ?? []).map((row, index) =>
    mapDbPetToCard(row as Parameters<typeof mapDbPetToCard>[0], index),
  );

  const friends: SearchProfile[] = (friendsResult.data ?? []).map((row) =>
    mapPetFriendSearchRow({
      id: row.id,
      display_name: row.display_name?.trim() ?? "Member",
      location: row.location,
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
  );

  return { pets, friends };
}
