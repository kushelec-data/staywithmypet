import type { PetProfileFormInput } from "@/lib/pet-data";
import { toDbSpecies } from "@/lib/pet-data";
import { breedFormStateFromStored } from "@/lib/pet-breeds";
import { normalizePetWeightStorageValue } from "@/lib/pet-weight";
import { normalizeAvailabilityDates } from "@/lib/pet-availability";
import { normalizePetDobToIso } from "@/lib/pet-date-of-birth";
import { pickCareTypesFromRow } from "@/lib/pet-care-type";

type PetDbRecord = Record<string, unknown>;

function details(record: PetDbRecord): Record<string, unknown> {
  const fromDetails = record.details;
  if (fromDetails && typeof fromDetails === "object" && !Array.isArray(fromDetails)) {
    return fromDetails as Record<string, unknown>;
  }
  const pd = record.profile_details;
  return pd && typeof pd === "object" && !Array.isArray(pd) ? (pd as Record<string, unknown>) : {};
}

function str(record: PetDbRecord, key: string, fallback = ""): string {
  const v = record[key] ?? details(record)[key];
  return typeof v === "string" ? v : fallback;
}

function strArr(record: PetDbRecord, key: string): string[] {
  const v = record[key] ?? details(record)[key];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function numOpt(record: PetDbRecord, key: string): number | null {
  const v = record[key] ?? details(record)[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function strOptDetails(record: PetDbRecord, key: string): string | null {
  const v = details(record)[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export function mapPetRecordToFormInput(record: PetDbRecord): PetProfileFormInput {
  const speciesForm =
    str(record, "species_form") ||
    (typeof record.species === "string" ? record.species : "other");
  const storedBreed = str(record, "breed");
  const { breedSelection, breedOther } = breedFormStateFromStored(speciesForm, storedBreed);

  return {
    name: str(record, "name"),
    speciesForm,
    species: toDbSpecies(speciesForm),
    breedSelection,
    breedOther,
    dateOfBirth: normalizePetDobToIso(str(record, "date_of_birth") || str(record, "age_label")),
    gender: str(record, "gender"),
    size: normalizePetWeightStorageValue(str(record, "size_label")) ?? "5_10_kg",
    energyLevel: str(record, "energy_level") || "Medium",
    temperament: strArr(record, "temperament"),
    requiresMedication: (() => {
      const value = record.requires_medication ?? details(record).requires_medication;
      return typeof value === "boolean" ? value : false;
    })(),
    healthCharacteristics: str(record, "health_characteristics"),
    feedingSchedule: str(record, "feeding_schedule"),
    walkNeeds: str(record, "walk_needs") || "None",
    eatingHabits: str(record, "eating_habits"),
    positiveTraits: str(record, "positive_traits"),
    challengingTraits: str(record, "challenging_traits"),
    additionalNotes: str(record, "additional_notes"),
    friendRequirements: strArr(record, "friend_requirements"),
    availability: str(record, "availability"),
    careLocation: str(record, "care_location"),
    careTypes: pickCareTypesFromRow(record, details(record)),
    careTypesOther: strOptDetails(record, "care_types_other") ?? "",
    genderOther: strOptDetails(record, "gender_other") ?? "",
    location: str(record, "location"),
    availabilityDates: normalizeAvailabilityDates(
      record.availability_dates ?? details(record).availability_dates,
    ),
    address: str(record, "address"),
    latitude: numOpt(record, "latitude"),
    longitude: numOpt(record, "longitude"),
    googlePlaceId: strOptDetails(record, "google_place_id"),
  };
}
