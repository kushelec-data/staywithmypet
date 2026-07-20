import { formatCareTypeLabels } from "@/lib/care-type-options";
import {
  excludeMarketplaceOwnPets,
  filterPetsWhoseOwnerHasActivePetParentMembership,
  userHasActiveMembership,
} from "@/lib/marketplace-membership";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { resolveCityCenter } from "@/lib/estonia-city-coords";
import { formatPetAvailabilitySummary, normalizeAvailabilityDates } from "@/lib/pet-availability";
import { getPetCardTagline } from "@/lib/pet-card-tagline";
import { mapRowToPetIntro, type PetIntroDisplay, type PetIntroRow } from "@/lib/pet-intro";
import { pickCareTypesFromRow } from "@/lib/pet-care-type";
import { blurCoordinates } from "@/lib/map-privacy";
import { parseCoord } from "@/lib/parse-coord";
import type { SearchMapMarker } from "@/lib/search-map-markers";
import { isPetMarketplaceMinimumEligible } from "@/lib/profile-marketplace-eligibility";
import { formatSupabaseError } from "@/lib/profile-load";
import {
  petMatchesActivity,
  petMatchesAvailability,
  petMatchesBreeds,
  petMatchesCareLocation,
  petMatchesCareTypes,
  petMatchesEnergy,
  petMatchesLanguages,
  petMatchesSizes,
  petMatchesSpeciesKeys,
  petMatchesTemperament,
  petMatchesVerified,
  type PetSearchFilterable,
} from "@/lib/pet-search-match";
import type { Pet } from "@/lib/pets";
import { speciesEmoji } from "@/lib/pet-data";

export type { SearchMapMarker as PetMapMarker } from "@/lib/search-map-markers";

export type PublicSearchPet = PetIntroDisplay &
  PetSearchFilterable & {
    /** Privacy-blurred coordinates for public map only (never exact address). */
    mapPosition: { lat: number; lng: number } | null;
    ownerId: string;
    ownerName: string;
    ownerAvatarUrl: string | null;
    ownerProfileHref: string;
    ownerRatingAvg: number;
    ownerRatingCount: number;
    pricePerNight: number;
    ratingAvg: number;
    ratingCount: number;
    availabilityNotes: string | null;
    personalityTags: string[];
    gender: string | null;
    genderOther?: string | null;
    careTypesOther?: string | null;
    spayedNeutered: boolean;
    healthCharacteristics: string | null;
    positiveTraits: string | null;
    challengingTraits: string | null;
    feedingSchedule: string | null;
    eatingHabits: string | null;
    friendRequirements: string[];
    /** Owner-written description (additional_notes). */
    additionalNotes: string | null;
  };

export type PetSearchFilterState = {
  location: string;
  species: string[];
  breeds: string[];
  sizes: string[];
  energyLevels: string[];
  temperaments: string[];
  activityNeeds: string[];
  careLocation: string;
  careTypes: string[];
  verifiedOnly: boolean;
  availabilityDates: string[];
  languages: string[];
};

export const emptyPetSearchFilters = (): PetSearchFilterState => ({
  location: "",
  species: [],
  breeds: [],
  sizes: [],
  energyLevels: [],
  temperaments: [],
  activityNeeds: [],
  careLocation: "",
  careTypes: [],
  verifiedOnly: false,
  availabilityDates: [],
  languages: [],
});

const PUBLIC_PET_PHOTO_SELECT =
  "pet_photos ( public_url, is_primary, sort_order, object_position_x, object_position_y, photo_scale )";

/** Fallback when crop columns are not migrated yet (defaults to 50%/50%, scale 1 in mappers). */
const PUBLIC_PET_PHOTO_SELECT_LEGACY = "pet_photos ( public_url, is_primary, sort_order )";

const PUBLIC_PET_SELECT =
  "id, name, species, breed, other_breed, age_label, date_of_birth, size_label, location, latitude, longitude, temperament, energy_level, requires_medication, feeding_schedule, eating_habits, walk_needs, health_characteristics, positive_traits, challenging_traits, additional_notes, friend_requirements, care_type, care_location, availability, availability_dates, is_active, is_public, price_per_night_cents, rating_avg, rating_count, owner_id, details, " +
  `${PUBLIC_PET_PHOTO_SELECT}, profiles!pets_owner_id_fkey ( id, display_name, avatar_url, is_public, role, languages, location, latitude, longitude, details, rating_avg, rating_count )`;

const PUBLIC_PET_SELECT_WITHOUT_OTHER = PUBLIC_PET_SELECT.replace("other_breed, ", "");

const PUBLIC_PET_SELECT_WITHOUT_IS_PUBLIC = PUBLIC_PET_SELECT.replace("is_public, ", "");

const PUBLIC_PET_SELECT_LEGACY = PUBLIC_PET_SELECT.replace(
  PUBLIC_PET_PHOTO_SELECT,
  PUBLIC_PET_PHOTO_SELECT_LEGACY,
);

const PUBLIC_PET_SELECT_LEGACY_WITHOUT_IS_PUBLIC = PUBLIC_PET_SELECT_WITHOUT_IS_PUBLIC.replace(
  PUBLIC_PET_PHOTO_SELECT,
  PUBLIC_PET_PHOTO_SELECT_LEGACY,
);

const PUBLIC_PET_SELECT_TIERS = [
  PUBLIC_PET_SELECT,
  PUBLIC_PET_SELECT_WITHOUT_OTHER,
  PUBLIC_PET_SELECT_WITHOUT_IS_PUBLIC,
  PUBLIC_PET_SELECT_WITHOUT_IS_PUBLIC.replace("other_breed, ", ""),
  PUBLIC_PET_SELECT_LEGACY,
  PUBLIC_PET_SELECT_LEGACY_WITHOUT_IS_PUBLIC,
] as const;

function selectIncludesIsPublic(select: string): boolean {
  return /\bis_public\b/.test(select);
}

type OwnerJoin = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  is_public: boolean;
  role?: string | null;
  languages?: string[] | null;
  location?: string | null;
  latitude?: unknown;
  longitude?: unknown;
  details?: unknown;
  rating_avg?: number | null;
  rating_count?: number | null;
};

function strFrom(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t || null;
}

/** Resolve true coords then blur for public map — never expose exact home location. */
function resolvePublicMapPosition(
  row: PetIntroRow,
  owner: OwnerJoin | null,
  petId: string,
  locationArea: string | null,
): { lat: number; lng: number } | null {
  let lat = parseCoord(row.latitude);
  let lng = parseCoord(row.longitude);

  if (lat == null || lng == null) {
    lat = parseCoord(owner?.latitude);
    lng = parseCoord(owner?.longitude);
  }

  if (lat == null || lng == null) {
    const fallbackLabel = locationArea ?? strFrom(row.location) ?? strFrom(owner?.location);
    const city = resolveCityCenter(fallbackLabel);
    if (!city) return null;
    lat = city.lat;
    lng = city.lng;
  }

  return blurCoordinates(lat, lng, petId);
}

function detailsOf(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

function pickBool(column: unknown, details: Record<string, unknown>, key: string): boolean | null {
  if (typeof column === "boolean") return column;
  const d = details[key];
  if (typeof d === "boolean") return d;
  return null;
}

function pickMedicationFlag(
  column: unknown,
  details: Record<string, unknown>,
  key: string,
): boolean {
  const value = pickBool(column, details, key);
  return value === true;
}

function pickStringList(column: unknown, details: Record<string, unknown>, key: string): string[] {
  const col = column ?? details[key];
  if (Array.isArray(col)) {
    return col.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  }
  if (typeof col === "string" && col.trim()) {
    return col
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function pickTemperament(row: PetIntroRow, details: Record<string, unknown>): string[] {
  const col = row.temperament ?? details.temperament;
  if (Array.isArray(col)) return col.filter((x): x is string => typeof x === "string");
  if (typeof col === "string" && col.trim()) {
    return col.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function strArrFrom(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

function buildPersonalityTags(row: PetIntroRow, details: Record<string, unknown>): string[] {
  const energy = strFrom(row.energy_level) ?? strFrom(details.energy_level);
  const positive = strArrFrom(row.positive_traits ?? details.positive_traits);
  const tags = [...pickTemperament(row, details), ...positive];
  if (energy) tags.push(energy);
  return [...new Set(tags.map((t) => t.trim()).filter(Boolean))];
}

function ownerEmailVerified(details: unknown): boolean {
  if (!details || typeof details !== "object") return false;
  return (details as Record<string, unknown>).email_verified === true;
}

/** @deprecated Do not use profile.role for listing eligibility; enforced via user_memberships + RLS. */
export function isPetListingOwnerRole(role: string | null | undefined): boolean {
  return role === "pet_parent" || role === "both";
}

function resolveOwner(profiles: OwnerJoin | OwnerJoin[] | null): OwnerJoin | null {
  if (!profiles) return null;
  if (Array.isArray(profiles)) return profiles[0] ?? null;
  return profiles;
}

type MapPublicPetOptions = {
  /** Owner preview from dashboard — skip public listing checks. */
  skipVisibilityFilters?: boolean;
};

function mapRowToPublicSearchPet(
  row: PetIntroRow,
  options: MapPublicPetOptions = {},
): PublicSearchPet | null {
  const owner = resolveOwner(
    (row.profiles as OwnerJoin | OwnerJoin[] | null) ?? null,
  );
  if (!options.skipVisibilityFilters) {
    if (!owner?.is_public) return null;
    if ("is_public" in row && row.is_public === false) return null;
    if (row.is_active === false) return null;
    if (
      !isPetMarketplaceMinimumEligible({
        name: strFrom(row.name),
        species: strFrom(row.species),
        is_public: "is_public" in row ? (row.is_public as boolean | null) : true,
        is_active: row.is_active as boolean | null,
      })
    ) {
      return null;
    }
  } else if (!owner) {
    return null;
  }

  const intro = mapRowToPetIntro(row, { publicLocation: true });
  const details = detailsOf(row.details);
  const ownerDetails = detailsOf(owner.details);
  const dates = normalizeAvailabilityDates(
    row.availability_dates ?? details.availability_dates,
  );
  const priceCents = Number(row.price_per_night_cents ?? 0);

  const careLocation =
    strFrom(row.care_location) ??
    strFrom(details.care_location) ??
    null;

  const petId = String(row.id ?? "");

  return {
    ...intro,
    mapPosition: resolvePublicMapPosition(row, owner, petId, intro.locationArea),
    speciesForm: strFrom(details.species_form),
    breed: intro.breed,
    storedBreed: strFrom(row.breed),
    otherBreed: strFrom(row.other_breed),
    energyLevel: strFrom(row.energy_level) ?? strFrom(details.energy_level),
    temperamentTags: pickTemperament(row, details),
    requiresMedication: pickMedicationFlag(row.requires_medication, details, "requires_medication"),
    walkNeeds: strFrom(row.walk_needs) ?? strFrom(details.walk_needs),
    careLocation,
    careTypes: pickCareTypesFromRow(row, details),
    careTypesOther: strFrom(details.care_types_other),
    availabilityDates: dates,
    locationArea: intro.locationArea,
    ownerLanguages: Array.isArray(owner.languages)
      ? owner.languages.filter((l): l is string => typeof l === "string")
      : [],
    ownerEmailVerified: ownerEmailVerified(ownerDetails),
    ownerId: String(row.owner_id ?? owner.id),
    ownerName: owner.display_name?.trim() || "Pet Parent",
    ownerAvatarUrl: owner.avatar_url,
    ownerProfileHref: `/users/${owner.id}`,
    ownerRatingAvg: Number(owner.rating_avg ?? 0),
    ownerRatingCount: Number(owner.rating_count ?? 0),
    pricePerNight: priceCents / 100,
    ratingAvg: Number(row.rating_avg ?? 0),
    ratingCount: Number(row.rating_count ?? 0),
    availabilityNotes:
      strFrom(row.availability) ?? strFrom(details.availability_notes),
    personalityTags: buildPersonalityTags(row, details),
    gender: strFrom(details.gender) ?? strFrom(row.gender),
    genderOther: strFrom(details.gender_other),
    spayedNeutered:
      details.spayed_neutered === true ||
      details.is_spayed_neutered === true ||
      /neutered|spayed/i.test(strFrom(details.gender) ?? strFrom(row.gender) ?? ""),
    healthCharacteristics:
      strFrom(row.health_characteristics) ?? strFrom(details.health_characteristics),
    positiveTraits: strFrom(row.positive_traits) ?? strFrom(details.positive_traits),
    challengingTraits: strFrom(row.challenging_traits) ?? strFrom(details.challenging_traits),
    feedingSchedule: strFrom(row.feeding_schedule) ?? strFrom(details.feeding_schedule),
    eatingHabits: strFrom(row.eating_habits) ?? strFrom(details.eating_habits),
    friendRequirements: pickStringList(row.friend_requirements, details, "friend_requirements"),
    additionalNotes:
      strFrom(row.additional_notes) ?? strFrom(details.additional_notes),
  };
}

/**
 * Upper bound on rows fetched for the public marketplace in a single query.
 * Filters (location, care type, etc.) are applied client-side over this set,
 * so the cap must be generous, but it prevents an unbounded scan of the entire
 * active-pet table as inventory grows. Newest listings are prioritised via the
 * created_at ordering below.
 */
export const PUBLIC_PET_RESULT_CAP = 200;

async function queryPublicPets(supabase: SupabaseClient) {
  let lastError: PostgrestError | null = null;

  for (const select of PUBLIC_PET_SELECT_TIERS) {
    let query = supabase
      .from("pets")
      .select(select)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(PUBLIC_PET_RESULT_CAP);

    if (selectIncludesIsPublic(select)) {
      query = query.eq("is_public", true);
    }

    const result = await query;

    if (!result.error) return result;

    if (!/column/i.test(result.error.message)) {
      return result;
    }

    lastError = result.error;
  }

  return { data: null, error: lastError };
}

export type FetchPublicSearchPetsOptions = {
  /** Omit the signed-in user's own pets from marketplace results. */
  excludeOwnerId?: string | null;
};

export async function fetchPublicSearchPets(
  supabase: SupabaseClient,
  options: FetchPublicSearchPetsOptions = {},
): Promise<PublicSearchPet[]> {
  const result = await queryPublicPets(supabase);
  if (result.error) throw new Error(formatSupabaseError(result.error));

  const mapped = (result.data ?? [])
    .map((row) => mapRowToPublicSearchPet(row as unknown as PetIntroRow))
    .filter((p): p is PublicSearchPet => p !== null);

  const withoutSelf = excludeMarketplaceOwnPets(mapped, options.excludeOwnerId);
  return filterPetsWhoseOwnerHasActivePetParentMembership(supabase, withoutSelf);
}

export async function fetchPublicSearchPetById(
  supabase: SupabaseClient,
  petId: string,
  options: MapPublicPetOptions = {},
): Promise<PublicSearchPet | null> {
  let lastError: PostgrestError | null = null;

  for (const select of PUBLIC_PET_SELECT_TIERS) {
    const result = await supabase.from("pets").select(select).eq("id", petId).maybeSingle();

    if (!result.error) {
      if (!result.data) return null;
      const pet = mapRowToPublicSearchPet(result.data as unknown as PetIntroRow, options);
      if (!pet) return null;
      if (!options.skipVisibilityFilters) {
        const ownerEligible = await userHasActiveMembership(supabase, pet.ownerId, "pet_parent");
        if (!ownerEligible) return null;
      }
      return pet;
    }

    if (!/column/i.test(result.error.message)) {
      throw new Error(formatSupabaseError(result.error));
    }

    lastError = result.error;
  }

  if (lastError) {
    throw new Error(formatSupabaseError(lastError));
  }

  return null;
}

export function filterPublicSearchPets(
  pets: PublicSearchPet[],
  filters: PetSearchFilterState,
): PublicSearchPet[] {
  const loc = filters.location.trim().toLowerCase();

  return pets.filter((pet) => {
    if (loc) {
      const area = (pet.locationArea ?? "").toLowerCase();
      if (!area.includes(loc)) return false;
    }

    if (!petMatchesSpeciesKeys(pet, filters.species)) return false;
    if (!petMatchesBreeds(pet, filters.breeds)) return false;
    if (!petMatchesSizes(pet, filters.sizes)) return false;
    if (!petMatchesEnergy(pet, filters.energyLevels)) return false;
    if (!petMatchesTemperament(pet, filters.temperaments)) return false;
    if (!petMatchesActivity(pet, filters.activityNeeds)) return false;

    if (filters.careLocation) {
      if (!petMatchesCareLocation(pet, [filters.careLocation])) return false;
    }

    if (!petMatchesCareTypes(pet, filters.careTypes)) return false;
    if (!petMatchesLanguages(pet, filters.languages)) return false;
    if (!petMatchesVerified(pet, filters.verifiedOnly)) return false;
    if (!petMatchesAvailability(pet, filters.availabilityDates)) {
      return false;
    }

    return true;
  });
}

export function publicSearchPetToMapMarker(pet: PublicSearchPet): SearchMapMarker | null {
  if (!pet.mapPosition) return null;
  return {
    id: pet.id,
    variant: "pets",
    name: pet.name,
    locationArea: pet.locationArea,
    photoUrl: pet.primaryPhotoUrl,
    lat: pet.mapPosition.lat,
    lng: pet.mapPosition.lng,
    href: `/pet/${pet.id}`,
  };
}

export function publicSearchPetToCardPet(pet: PublicSearchPet): Pet {
  const speciesCard =
    pet.species === "dog" ||
    pet.species === "cat" ||
    pet.species === "rabbit" ||
    pet.species === "bird"
      ? pet.species
      : "dog";

  return {
    id: pet.id,
    name: pet.name,
    species: speciesCard,
    breed: pet.breed ?? pet.speciesLabel,
    age: pet.ageLabel ?? "—",
    location: pet.locationArea ?? "—",
    availabilitySummary: pet.careDatesSummary,
    petParentName: pet.ownerName,
    petParentId: pet.ownerId,
    image: pet.primaryPhotoUrl ?? "",
    imagePosition: pet.primaryPhotoPosition,
    photoPositions: pet.photoPositions,
    ownerImage: pet.ownerAvatarUrl ?? "",
    pricePerNight: pet.pricePerNight,
    rating: pet.ratingAvg,
    reviewCount: pet.ratingCount,
    tags: formatCareTypeLabels(pet.careTypes, pet.careTypesOther),
    placeholderColor: "#e8f5f0",
    emoji: speciesEmoji(pet.species),
    sizeLabel: pet.sizeLabel,
    weightDisplayShort: pet.weightDisplayShort,
    careSummary: pet.compactLines.slice(0, 2).join(" · ") || pet.careSummary,
    photoUrls: pet.photoUrls,
    availabilityDates: pet.availabilityDates,
    cardTagline: getPetCardTagline(pet.id),
  };
}
