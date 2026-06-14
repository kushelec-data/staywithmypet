import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveCityCenter } from "@/lib/estonia-city-coords";
import { formatNearbyLocation } from "@/lib/location-public";
import { resolveProfilePublicLocation } from "@/lib/profile-location";
import { blurCoordinates } from "@/lib/map-privacy";
import { parseCoord } from "@/lib/parse-coord";
import type { SearchMapMarker } from "@/lib/search-map-markers";
import type { PetFriendSearchFilterable } from "@/lib/pet-friend-search-match";
import { buildPetFriendPreferenceChips } from "@/lib/pet-friend-card-chips";
import {
  parseProfileDetails,
  resolvedAvailability,
  resolvedLivingSituation,
  resolvedPetCarePreferences,
} from "@/lib/profile-details";
import { resolveActiveMode, type ProfileActiveMode } from "@/lib/profile-mode";
import type { ProfileRole } from "@/lib/profile-setup";

export type SearchProfile = PetFriendSearchFilterable & {
  id: string;
  displayName: string;
  location: string | null;
  bio: string | null;
  avatarUrl: string | null;
  role: ProfileRole;
  activeMode: ProfileActiveMode;
  ratingAvg: number;
  ratingCount: number;
  stayCount: number;
  preferenceChips: string[];
  /** Privacy-blurred coordinates for public map only (never exact address). */
  mapPosition: { lat: number; lng: number } | null;
};

/** @deprecated use fetchPetFriendSearchProfiles */
export type SearchProfileTab = "pet_parent" | "pet_friend";

function isListableProfile(row: {
  display_name: string;
  bio: string | null;
  location: string | null;
  public_location?: string | null;
  city?: string | null;
  country?: string | null;
  google_place_id?: string | null;
  latitude?: unknown;
  longitude?: unknown;
}): boolean {
  const hasLocation = Boolean(
    resolveProfilePublicLocation(row) || row.location?.trim(),
  );
  return Boolean(row.display_name?.trim() && row.bio?.trim() && hasLocation);
}

/** Pet Friends discoverable on /find-care (not pure Pet Parents). */
export function isDiscoverablePetFriend(row: {
  role: ProfileRole;
  active_mode: string | null | undefined;
}): boolean {
  if (row.role === "pet_parent") return false;
  if (row.role === "pet_friend") return true;
  return resolveActiveMode("both", row.active_mode) === "pet_friend";
}

/** @deprecated inverted — use fetchPetFriendSearchProfiles for /find-care */
export function profileTabForSearchMode(mode: "pets" | "care"): SearchProfileTab {
  return mode === "care" ? "pet_friend" : "pet_parent";
}

type PetFriendSearchRow = {
  id: string;
  display_name: string;
  location: string | null;
  public_location?: string | null;
  city?: string | null;
  country?: string | null;
  google_place_id?: string | null;
  latitude?: unknown;
  longitude?: unknown;
  bio: string | null;
  avatar_url: string | null;
  role: ProfileRole;
  active_mode: string | null;
  rating_avg: number | string | null;
  rating_count: number | null;
  stay_count: number | null;
  languages?: string[] | null;
  details?: unknown;
};

/** Resolve profile coords then blur for public map — never expose exact home location. */
function resolveFriendMapPosition(
  row: Pick<PetFriendSearchRow, "id" | "location" | "latitude" | "longitude">,
  locationArea: string | null,
): { lat: number; lng: number } | null {
  let lat = parseCoord(row.latitude);
  let lng = parseCoord(row.longitude);

  if (lat == null || lng == null) {
    const fallbackLabel = locationArea ?? row.location?.trim() ?? null;
    const city = resolveCityCenter(fallbackLabel);
    if (!city) return null;
    lat = city.lat;
    lng = city.lng;
  }

  return blurCoordinates(lat, lng, row.id);
}

function profileEmailVerified(detailsRaw: unknown): boolean {
  if (!detailsRaw || typeof detailsRaw !== "object") return false;
  return (detailsRaw as Record<string, unknown>).email_verified === true;
}

export function mapPetFriendSearchRow(row: PetFriendSearchRow): SearchProfile {
  const role = row.role;
  const activeMode = resolveActiveMode(role, row.active_mode);
  const publicLocation = resolveProfilePublicLocation(row);
  const rawLocation = publicLocation ?? row.location?.trim() ?? null;
  const locationArea = publicLocation ?? formatNearbyLocation(rawLocation) ?? rawLocation;
  const details = parseProfileDetails(row.details);
  const availability = resolvedAvailability(details);
  const care = resolvedPetCarePreferences(details);
  const living = resolvedLivingSituation(details);
  const bio = row.bio?.trim() ?? "";

  return {
    id: row.id,
    displayName: row.display_name.trim(),
    location: locationArea,
    mapPosition: resolveFriendMapPosition(row, locationArea),
    bio: bio || null,
    avatarUrl: row.avatar_url,
    role,
    activeMode,
    ratingAvg: Number(row.rating_avg) || 0,
    ratingCount: row.rating_count ?? 0,
    stayCount: row.stay_count ?? 0,
    preferenceChips: buildPetFriendPreferenceChips(details),
    petTypesAccepted: care.pet_types_willing_to_care_for ?? [],
    careTypesOffered: care.available_care_types ?? [],
    experienceLevel: care.experience_level ?? null,
    livingType: living.living_type ?? null,
    hasGarden: living.yard_garden_access ?? null,
    hasPetsAtHome: living.has_pets_at_home ?? null,
    hasChildren: living.has_children ?? null,
    languages: Array.isArray(row.languages)
      ? row.languages.filter((l): l is string => typeof l === "string")
      : [],
    emailVerified: profileEmailVerified(row.details),
    availabilityDates: availability.selected_dates ?? [],
    locationHaystack: [rawLocation, row.display_name, bio].filter(Boolean).join(" ").toLowerCase(),
    bioHaystack: bio.toLowerCase(),
  };
}

/** Public Pet Friend listings for Pet Parents on /find-care. */
export async function fetchPetFriendSearchProfiles(
  supabase: SupabaseClient,
): Promise<SearchProfile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, display_name, location, public_location, city, country, google_place_id, latitude, longitude, bio, avatar_url, role, active_mode, rating_avg, rating_count, stay_count, languages, details",
    )
    .eq("is_public", true)
    .in("role", ["pet_friend", "both"])
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? [])
    .filter(isListableProfile)
    .filter((row) =>
      isDiscoverablePetFriend({
        role: row.role as ProfileRole,
        active_mode: row.active_mode,
      }),
    )
    .map((row) =>
      mapPetFriendSearchRow({
        ...row,
        role: row.role as ProfileRole,
      }),
    );
}

export function searchProfileToMapMarker(profile: SearchProfile): SearchMapMarker | null {
  if (!profile.mapPosition) return null;
  return {
    id: profile.id,
    variant: "friends",
    name: profile.displayName,
    locationArea: profile.location,
    photoUrl: profile.avatarUrl,
    lat: profile.mapPosition.lat,
    lng: profile.mapPosition.lng,
    href: `/users/${profile.id}`,
    ratingAvg: profile.ratingAvg,
    ratingCount: profile.ratingCount,
    careTypes: profile.careTypesOffered,
  };
}

/** @deprecated use fetchPetFriendSearchProfiles */
export async function fetchSearchProfiles(
  supabase: SupabaseClient,
  tab: SearchProfileTab,
): Promise<SearchProfile[]> {
  if (tab === "pet_friend") {
    return fetchPetFriendSearchProfiles(supabase);
  }
  return [];
}
