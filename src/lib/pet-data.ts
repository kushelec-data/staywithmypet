import type { SupabaseClient } from "@supabase/supabase-js";
import type { Pet } from "@/lib/pets";
import { formatPetAvailabilitySummary, normalizeAvailabilityDates } from "@/lib/pet-availability";
import { IMAGES, placeholderPetImage } from "@/lib/images";
import { formatSupabaseError } from "@/lib/profile-load";
import { resolveBreedForSave } from "@/lib/pet-breeds";
import { normalizePetDobToIso } from "@/lib/pet-date-of-birth";
import { pickPrimaryPhotoUrl, uploadAndAttachPetPhotos } from "@/lib/pet-photos";

export type PetSpecies = "dog" | "cat" | "rabbit" | "bird" | "other";

export type PetProfileFormInput = {
  name: string;
  speciesForm: string;
  species: PetSpecies;
  breedSelection: string;
  breedOther: string;
  dateOfBirth: string;
  gender: string;
  size: string;
  energyLevel: string;
  temperament: string[];
  requiresMedication: boolean;
  healthCharacteristics: string;
  feedingSchedule: string;
  walkNeeds: string;
  eatingHabits: string;
  positiveTraits: string;
  challengingTraits: string;
  additionalNotes: string;
  friendRequirements: string[];
  availability: string;
  careLocation: string;
  careTypes: string[];
  careTypesOther: string;
  genderOther: string;
  location: string;
  availabilityDates: string[];
  address: string;
  latitude: number | null;
  longitude: number | null;
  googlePlaceId?: string | null;
};

/** @deprecated use PetProfileFormInput */
export type NewPetInput = PetProfileFormInput;

export type UserPetRow = {
  id: string;
  name: string;
  species: PetSpecies;
  breed: string | null;
  age_label: string | null;
  location: string | null;
  size_label: string | null;
  temperament: string[];
  care_needs: string | null;
  availability: string | null;
  availabilityDates: string[];
  is_active: boolean;
  primaryPhotoUrl: string | null;
};

const speciesEnum: PetSpecies[] = ["dog", "cat", "rabbit", "bird", "other"];

export function toDbSpecies(formValue: string): PetSpecies {
  if (speciesEnum.includes(formValue as PetSpecies)) {
    return formValue as PetSpecies;
  }
  return "other";
}

export function speciesDisplayLabel(species: string, breed: string | null): string {
  if (species !== "other") return species;
  return breed?.trim() || "other";
}

export function genderDisplayLabel(gender: string | null | undefined, genderOther?: string | null): string {
  const value = gender?.trim();
  if (!value) return "";
  if (value.toLowerCase() === "other") {
    return genderOther?.trim() || "Other";
  }
  return value;
}

function buildPetDetails(input: PetProfileFormInput): Record<string, unknown> {
  const dobIso = normalizePetDobToIso(input.dateOfBirth);
  return {
    species_form: input.speciesForm,
    date_of_birth: dobIso || null,
    gender: input.gender || null,
    energy_level: input.energyLevel || null,
    requires_medication: input.requiresMedication,
    health_characteristics: input.healthCharacteristics.trim() || null,
    feeding_schedule: input.feedingSchedule.trim() || null,
    walk_needs: input.walkNeeds || null,
    eating_habits: input.eatingHabits.trim() || null,
    positive_traits: input.positiveTraits.trim() || null,
    challenging_traits: input.challengingTraits.trim() || null,
    additional_notes: input.additionalNotes.trim() || null,
    friend_requirements: input.friendRequirements,
    care_location: input.careLocation || null,
    care_type: input.careTypes,
    care_types: input.careTypes,
    care_types_other: input.careTypesOther.trim() || null,
    gender_other: input.genderOther.trim() || null,
    availability_dates: input.availabilityDates,
    address: input.address.trim() || null,
    latitude: input.latitude,
    longitude: input.longitude,
    google_place_id: input.googlePlaceId?.trim() || null,
  };
}

function buildPetRow(ownerId: string, input: PetProfileFormInput) {
  const extraTags: string[] = [];
  if (input.speciesForm !== input.species && input.speciesForm) {
    extraTags.push(`species:${input.speciesForm}`);
  }

  const careSummary = [
    input.careTypes.length ? `Care: ${input.careTypes.join(", ")}` : "",
    input.careLocation ? `Location: ${input.careLocation}` : "",
    input.friendRequirements.length ? `Requirements: ${input.friendRequirements.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const careNeeds = [
    input.healthCharacteristics.trim(),
    input.feedingSchedule.trim() ? `Feeding: ${input.feedingSchedule.trim()}` : "",
    input.walkNeeds ? `Walks: ${input.walkNeeds}` : "",
    input.eatingHabits.trim() ? `Eating: ${input.eatingHabits.trim()}` : "",
    input.positiveTraits.trim() ? `Strengths: ${input.positiveTraits.trim()}` : "",
    input.challengingTraits.trim() ? `Challenges: ${input.challengingTraits.trim()}` : "",
    input.requiresMedication ? "Requires medication: Yes" : "",
    input.additionalNotes.trim(),
    careSummary,
  ]
    .filter(Boolean)
    .join("\n");

  const dobIso = normalizePetDobToIso(input.dateOfBirth);
  const ageLabel = dobIso || null;

  const tags = [
    ...input.temperament,
    input.size,
    input.energyLevel,
    input.gender,
    ...extraTags,
  ].filter(Boolean);

  return {
    owner_id: ownerId,
    name: input.name.trim(),
    species: input.species,
    breed:
      resolveBreedForSave(input.speciesForm, input.breedSelection, input.breedOther) || null,
    age_label: ageLabel,
    date_of_birth: dobIso || null,
    gender: input.gender || null,
    size_label: input.size || null,
    energy_level: input.energyLevel || null,
    temperament: input.temperament,
    requires_medication: input.requiresMedication,
    health_characteristics: input.healthCharacteristics.trim() || null,
    feeding_schedule: input.feedingSchedule.trim() || null,
    walk_needs: input.walkNeeds || null,
    eating_habits: input.eatingHabits.trim() || null,
    positive_traits: input.positiveTraits.trim() || null,
    challenging_traits: input.challengingTraits.trim() || null,
    additional_notes: input.additionalNotes.trim() || null,
    friend_requirements: input.friendRequirements,
    care_location: input.careLocation || null,
    care_type: input.careTypes,
    care_needs: careNeeds || null,
    availability: input.availability.trim() || null,
    availability_dates: input.availabilityDates,
    location: input.location.trim() || input.address.trim() || null,
    address: input.address.trim() || null,
    latitude: input.latitude,
    longitude: input.longitude,
    description: careNeeds || null,
    details: buildPetDetails(input),
    tags,
    is_active: true,
    is_public: true,
  };
}

export async function saveNewPet(
  supabase: SupabaseClient,
  ownerId: string,
  input: PetProfileFormInput,
): Promise<string> {
  const fullRow = buildPetRow(ownerId, input);

  let { data, error } = await supabase.from("pets").insert(fullRow).select("id").single();

  if (error && /column/i.test(error.message)) {
    const {
      date_of_birth: _d,
      gender: _g,
      energy_level: _e,
      requires_medication: _rm,
      health_characteristics: _hc,
      feeding_schedule: _fs,
      walk_needs: _w,
      eating_habits: _eh,
      positive_traits: _pt,
      challenging_traits: _chal,
      additional_notes: _an,
      friend_requirements: _fr,
      care_location: _cl,
      care_type: _careType,
      availability_dates: _avd,
      address: _addr,
      latitude: _lat,
      longitude: _lng,
      details: _detailsCol,
      ...base
    } = fullRow;

    const fallback = await supabase
      .from("pets")
      .insert({
        ...base,
        details: buildPetDetails(input),
      })
      .select("id")
      .single();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw new Error(formatSupabaseError(error));
  }
  if (!data) throw new Error("Could not save pet.");
  return data.id;
}

export async function updatePetProfile(
  supabase: SupabaseClient,
  ownerId: string,
  petId: string,
  input: PetProfileFormInput,
): Promise<void> {
  const fullRow = buildPetRow(ownerId, input);
  const { owner_id: _o, is_active: _a, ...updates } = fullRow;

  let { error } = await supabase.from("pets").update(updates).eq("id", petId).eq("owner_id", ownerId);

  if (error && /column/i.test(error.message)) {
    const fallback = await supabase
      .from("pets")
      .update({
        name: fullRow.name,
        species: fullRow.species,
        breed: fullRow.breed,
        age_label: fullRow.age_label,
        size_label: fullRow.size_label,
        temperament: fullRow.temperament,
        care_needs: fullRow.care_needs,
        availability: fullRow.availability,
        availability_dates: fullRow.availability_dates,
        location: fullRow.location,
        address: fullRow.address,
        latitude: fullRow.latitude,
        longitude: fullRow.longitude,
        description: fullRow.description,
        tags: fullRow.tags,
        details: buildPetDetails(input),
      })
      .eq("id", petId)
      .eq("owner_id", ownerId);
    error = fallback.error;
  }

  if (error) {
    throw new Error(formatSupabaseError(error));
  }
}

export async function createPetWithPhotos(
  supabase: SupabaseClient,
  ownerId: string,
  input: PetProfileFormInput,
  photos: File[],
): Promise<string> {
  const petId = await saveNewPet(supabase, ownerId, input);
  try {
    if (photos.length > 0) {
      await uploadAndAttachPetPhotos(supabase, ownerId, petId, photos, input.name);
    }
  } catch (err) {
    await supabase.from("pets").delete().eq("id", petId).eq("owner_id", ownerId);
    throw err;
  }
  return petId;
}

export async function fetchPetForOwner(
  supabase: SupabaseClient,
  ownerId: string,
  petId: string,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from("pets")
    .select("*")
    .eq("id", petId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) throw new Error(formatSupabaseError(error));
  return data;
}

export async function fetchUserPets(
  supabase: SupabaseClient,
  ownerId: string,
): Promise<UserPetRow[]> {
  const extendedSelect =
    "id, name, species, breed, age_label, location, address, size_label, temperament, care_needs, availability, availability_dates, is_active, pet_photos ( public_url, is_primary, sort_order )";
  const baseSelect =
    "id, name, species, breed, age_label, location, is_active, pet_photos ( public_url, is_primary, sort_order )";

  const extended = await supabase
    .from("pets")
    .select(extendedSelect)
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  const result =
    extended.error && /column/i.test(extended.error.message)
      ? await supabase
          .from("pets")
          .select(baseSelect)
          .eq("owner_id", ownerId)
          .order("created_at", { ascending: false })
      : extended;

  if (result.error) throw new Error(formatSupabaseError(result.error));

  return (result.data ?? []).map((row) => {
    const datesRaw = "availability_dates" in row ? row.availability_dates : undefined;
    const dates = normalizeAvailabilityDates(datesRaw);
    const avail = "availability" in row ? (row.availability as string | null) : null;
    return {
      id: row.id,
      name: row.name,
      species: row.species as PetSpecies,
      breed: row.breed,
      age_label: row.age_label,
      location: row.location,
      size_label: "size_label" in row ? (row.size_label as string | null) : null,
      temperament: "temperament" in row ? ((row.temperament as string[]) ?? []) : [],
      care_needs: "care_needs" in row ? (row.care_needs as string | null) : null,
      availability: avail,
      availabilityDates: dates,
      is_active: row.is_active,
      primaryPhotoUrl: pickPrimaryPhotoUrl(
        "pet_photos" in row ? (row.pet_photos as { public_url: string | null; is_primary: boolean; sort_order: number }[]) : [],
      ),
    };
  });
}

type PetPhotoJoin = {
  public_url: string | null;
  is_primary: boolean;
  sort_order: number;
};

type PetDbRow = {
  id: string;
  owner_id?: string;
  name: string;
  species: string;
  breed: string | null;
  age_label: string | null;
  location: string | null;
  availability?: string | null;
  availability_dates?: string[] | null;
  price_per_night_cents: number;
  tags: string[] | null;
  rating_avg: number;
  rating_count: number;
  pet_photos?: PetPhotoJoin[] | null;
  profiles?: { display_name: string } | { display_name: string }[] | null;
};

function resolveParentName(profiles: PetDbRow["profiles"]): string {
  if (!profiles) return "Pet Parent";
  if (Array.isArray(profiles)) return profiles[0]?.display_name ?? "Pet Parent";
  return profiles.display_name ?? "Pet Parent";
}

export function mapDbPetToCard(pet: PetDbRow, index: number): Pet {
  const ownerKeys = Object.keys(IMAGES.profiles) as (keyof typeof IMAGES.profiles)[];
  const fallbackOwnerKey = ownerKeys[index % ownerKeys.length];
  const petParentId = pet.owner_id ?? fallbackOwnerKey;
  const speciesRaw = pet.species;
  const species: Pet["species"] =
    speciesRaw === "dog" || speciesRaw === "cat" || speciesRaw === "rabbit" || speciesRaw === "bird"
      ? speciesRaw
      : "dog";

  const primaryPhoto = pickPrimaryPhotoUrl(pet.pet_photos);
  const availabilitySummary = formatPetAvailabilitySummary(
    pet.availability_dates,
    pet.availability ?? null,
  );

  return {
    id: pet.id,
    name: pet.name,
    species,
    breed: pet.breed ?? "—",
    age: pet.age_label ?? "—",
    location: pet.location ?? "—",
    availabilitySummary,
    petParentName: resolveParentName(pet.profiles),
    petParentId,
    image: primaryPhoto ?? placeholderPetImage(pet.id),
    ownerImage: pet.owner_id ? "" : IMAGES.profiles[fallbackOwnerKey],
    pricePerNight: (pet.price_per_night_cents ?? 0) / 100,
    rating: Number(pet.rating_avg) || 0,
    reviewCount: pet.rating_count ?? 0,
    tags: pet.tags ?? [],
    placeholderColor: "#e8f5f0",
    emoji: speciesEmoji(pet.species),
  };
}

export function speciesEmoji(species: string): string {
  switch (species) {
    case "cat":
      return "🐱";
    case "rabbit":
      return "🐰";
    case "bird":
      return "🐦";
    case "dog":
    default:
      return "🐕";
  }
}

export async function fetchPublicPets(supabase: SupabaseClient): Promise<Pet[]> {
  const { fetchPublicSearchPets, publicSearchPetToCardPet } = await import(
    "@/lib/public-pet-search"
  );
  const rows = await fetchPublicSearchPets(supabase);
  return rows.map(publicSearchPetToCardPet);
}
