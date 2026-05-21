import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { formatPetAgeFromDateOfBirth, isIsoDateString } from "@/lib/pet-age";
import { formatPetAvailabilitySummary, normalizeAvailabilityDates } from "@/lib/pet-availability";
import { pickCareTypesFromRow, normalizeCareTypes } from "@/lib/pet-care-type";
import { formatNearbyLocation } from "@/lib/location-public";
import { formatSupabaseError } from "@/lib/profile-load";
import { speciesDisplayLabel, speciesEmoji, type PetSpecies } from "@/lib/pet-data";
import { pickPrimaryPhotoUrl, sortPetPhotoUrls } from "@/lib/pet-photos";
import {
  normalizePetWeightStorageValue,
  petWeightCategoryShortLabel,
} from "@/lib/pet-weight";

const PET_PHOTO_SELECT = "pet_photos ( public_url, is_primary, sort_order )";

/** Full select for pet intro cards (uses pets.care_type). */
export const PET_INTRO_SELECT =
  `id, name, species, breed, age_label, date_of_birth, size_label, location, temperament, energy_level, requires_medication, feeding_schedule, walk_needs, health_characteristics, positive_traits, challenging_traits, additional_notes, care_type, availability, availability_dates, is_active, details, ${PET_PHOTO_SELECT}`;

const PET_INTRO_SELECT_CORE =
  `id, name, species, breed, age_label, size_label, location, temperament, care_type, availability, availability_dates, is_active, details, ${PET_PHOTO_SELECT}`;

const PET_INTRO_SELECT_MINIMAL =
  `id, name, species, breed, location, is_active, details, ${PET_PHOTO_SELECT}`;

const PET_INTRO_SELECT_TIERS = [PET_INTRO_SELECT, PET_INTRO_SELECT_CORE, PET_INTRO_SELECT_MINIMAL] as const;

export type PetIntroDisplay = {
  id: string;
  name: string;
  species: PetSpecies;
  breed: string | null;
  speciesLabel: string;
  ageLabel: string | null;
  /** Canonical weight key (e.g. `5_10_kg`) for filters — legacy values normalized when possible. */
  sizeLabel: string | null;
  /** Short weight band for cards: “5–10 kg”. */
  weightDisplayShort: string | null;
  locationArea: string | null;
  careDatesSummary: string | null;
  availabilityDates: string[];
  careTypes: string[];
  /** Up to 3 short lines for dashboard/public/list cards (not full bio). */
  compactLines: string[];
  careSummary: string;
  primaryPhotoUrl: string | null;
  photoUrls: string[];
  isActive: boolean;
};

type PetPhotoJoin = {
  public_url: string | null;
  is_primary: boolean;
  sort_order: number;
};

export type PetIntroRow = Record<string, unknown>;

function strFrom(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t || null;
}

function strArrFrom(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

function detailsOf(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

function pickStr(column: unknown, details: Record<string, unknown>, key: string): string | null {
  return strFrom(column) ?? strFrom(details[key]);
}

function pickBool(column: unknown, details: Record<string, unknown>, key: string): boolean | null {
  if (typeof column === "boolean") return column;
  const d = details[key];
  if (typeof d === "boolean") return d;
  if (d === 1 || d === "1" || d === "true") return true;
  if (d === 0 || d === "0" || d === "false") return false;
  return null;
}

function pickTemperament(row: PetIntroRow, details: Record<string, unknown>): string[] {
  const col = row.temperament ?? details.temperament;
  if (Array.isArray(col)) return strArrFrom(col);
  if (typeof col === "string" && col.trim()) {
    return normalizeCareTypes(col);
  }
  return [];
}

function normalizeSpecies(raw: unknown): PetSpecies {
  if (raw === "dog" || raw === "cat" || raw === "rabbit" || raw === "bird" || raw === "other") {
    return raw;
  }
  return "other";
}

function formatTraitList(parts: string[]): string {
  const unique = [...new Set(parts.map((p) => p.trim()).filter(Boolean))];
  if (!unique.length) return "";
  if (unique.length === 1) return unique[0].toLowerCase();
  if (unique.length === 2) return `${unique[0].toLowerCase()} and ${unique[1].toLowerCase()}`;
  return `${unique.slice(0, -1).join(", ").toLowerCase()}, and ${unique[unique.length - 1].toLowerCase()}`;
}

function formatCareTypes(types: string[]): string {
  const labels = types.map((t) => t.trim()).filter(Boolean);
  if (!labels.length) return "";
  if (labels.length === 1) return labels[0].toLowerCase();
  if (labels.length === 2) return `${labels[0].toLowerCase()} and ${labels[1].toLowerCase()}`;
  return `${labels.slice(0, -1).join(", ").toLowerCase()}, and ${labels[labels.length - 1].toLowerCase()}`;
}

function resolveAgeLabel(row: PetIntroRow, details: Record<string, unknown>): string | null {
  const dob = strFrom(row.date_of_birth) ?? strFrom(details.date_of_birth);
  const fromDob = dob ? formatPetAgeFromDateOfBirth(dob) : null;
  if (fromDob) return fromDob;

  const age = strFrom(row.age_label) ?? strFrom(details.age_label);
  if (!age) return null;
  if (isIsoDateString(age)) {
    const parsed = formatPetAgeFromDateOfBirth(age);
    if (parsed) return parsed;
  }
  return age;
}

/** Compact facts for overview cards (max 3 lines). */
export function buildCompactPetLines(
  row: PetIntroRow,
  options: {
    locationArea: string | null;
    careDatesSummary: string | null;
    availabilityDates?: string[];
    careTypes: string[];
    weightShort: string | null;
    ageDisplay: string | null;
  },
): string[] {
  const details = detailsOf(row.details);
  const breed = strFrom(row.breed);
  const species = normalizeSpecies(row.species);
  const typeLabel = breed && species !== "other" ? breed : speciesDisplayLabel(species, breed);
  const weightShort = options.weightShort;
  const ageDisplay = options.ageDisplay;

  const lines: string[] = [];

  const metaLine = [typeLabel, weightShort, ageDisplay].filter(Boolean).join(" · ");
  if (metaLine) lines.push(metaLine);

  const careParts: string[] = [];
  if (options.careTypes.length) {
    careParts.push(`Needs ${options.careTypes.join(", ").toLowerCase()}`);
  }
  if (options.careDatesSummary?.trim() && !options.availabilityDates?.length) {
    careParts.push(options.careDatesSummary.trim());
  }
  if (careParts.length) lines.push(careParts.join(" · "));

  const walkNeeds = pickStr(row.walk_needs, details, "walk_needs");
  const requiresMed = pickBool(row.requires_medication, details, "requires_medication");
  const line3: string[] = [];
  if (walkNeeds) {
    const normalized = walkNeeds.trim().toLowerCase() === "none" ? "none" : walkNeeds.trim().toLowerCase();
    line3.push(`Walks: ${normalized}`);
  }
  if (requiresMed !== null) {
    line3.push(`Medication: ${requiresMed ? "yes" : "no"}`);
  }
  if (line3.length) lines.push(line3.join(" · "));

  return lines.slice(0, 3);
}

/** Full narrative for pet detail/edit contexts only. */
export function buildPetCareSummary(row: PetIntroRow): string {
  const details = detailsOf(row.details);
  const name = strFrom(row.name) ?? "This pet";

  const breed = strFrom(row.breed);
  const species = normalizeSpecies(row.species);
  const speciesLabel = speciesDisplayLabel(species, breed);
  const displayType = breed && species !== "other" ? breed : speciesLabel;
  const rawSize = pickStr(row.size_label, details, "size_label");
  const weightKey = normalizePetWeightStorageValue(rawSize);
  const weightShort = weightKey ? petWeightCategoryShortLabel(weightKey) : null;

  const temperamentCol = pickTemperament(row, details);
  const positive = pickStr(row.positive_traits, details, "positive_traits");
  const challenging = pickStr(row.challenging_traits, details, "challenging_traits");
  const energy = pickStr(row.energy_level, details, "energy_level");

  const traitParts: string[] = [...temperamentCol];
  if (positive) traitParts.push(positive);
  if (energy) traitParts.push(`${energy} energy`);
  if (challenging) traitParts.push(challenging);

  const careTypes = pickCareTypesFromRow(row, details);
  const dates = normalizeAvailabilityDates(
    row.availability_dates ?? details.availability_dates,
  );
  const availabilityNotes = strFrom(row.availability) ?? strFrom(details.availability_notes);

  const feeding = pickStr(row.feeding_schedule, details, "feeding_schedule");
  const walkNeeds = pickStr(row.walk_needs, details, "walk_needs");
  const requiresMed = pickBool(row.requires_medication, details, "requires_medication");
  const health = pickStr(row.health_characteristics, details, "health_characteristics");
  const notes = pickStr(row.additional_notes, details, "additional_notes");

  const traitPhrase = formatTraitList(traitParts);

  let intro = `${name} is`;
  if (weightShort) intro += ` a ${weightShort}`;
  intro += ` ${displayType}`;
  if (traitPhrase) intro += ` who is ${traitPhrase}`;
  intro += ".";

  const extras: string[] = [];

  if (careTypes.length) {
    let need = `Needs ${formatCareTypes(careTypes)} support`;
    if (dates.length) need += " on selected dates";
    else if (availabilityNotes) need += ` (${availabilityNotes})`;
    extras.push(need);
  } else if (dates.length) {
    extras.push("Care needed on selected dates");
  } else if (availabilityNotes) {
    extras.push(availabilityNotes);
  }

  if (feeding) extras.push(`Feeding: ${feeding}`);
  if (walkNeeds) extras.push(`Walks: ${walkNeeds}`);
  if (requiresMed === true) extras.push("Medication: Yes");
  else if (requiresMed === false) extras.push("Medication: No");
  if (health) extras.push(health);
  if (notes && extras.length < 3) extras.push(notes);

  const hasContent =
    Boolean(weightShort || displayType || traitPhrase || careTypes.length || dates.length) ||
    Boolean(feeding || walkNeeds || requiresMed !== null || health || notes);

  if (!hasContent) return "Care details not added yet.";

  if (!traitPhrase && !weightShort && !displayType) {
    if (!extras.length) return "Care details not added yet.";
    return extras.map((e) => (e.endsWith(".") ? e : `${e}.`)).join(" ");
  }

  const tail = extras.map((e) => (e.endsWith(".") ? e : `${e}.`)).join(" ");
  return tail ? `${intro} ${tail}` : intro;
}

export function mapRowToPetIntro(
  row: PetIntroRow,
  options: { publicLocation?: boolean } = {},
): PetIntroDisplay {
  const details = detailsOf(row.details);
  const species = normalizeSpecies(row.species);
  const breed = strFrom(row.breed);
  const dates = normalizeAvailabilityDates(
    row.availability_dates ?? details.availability_dates,
  );
  const availNotes = strFrom(row.availability) ?? strFrom(details.availability_notes);
  const locationRaw = strFrom(row.location);
  const locationArea = options.publicLocation
    ? formatNearbyLocation(locationRaw)
    : locationRaw;

  const photos =
    "pet_photos" in row && Array.isArray(row.pet_photos)
      ? (row.pet_photos as PetPhotoJoin[])
      : [];

  const rawSize = pickStr(row.size_label, details, "size_label");
  const weightKey = normalizePetWeightStorageValue(rawSize);
  const sizeLabelForRow = weightKey ?? rawSize;
  const weightDisplayShort = weightKey ? petWeightCategoryShortLabel(weightKey) : null;
  const ageLabel = resolveAgeLabel(row, details);

  return {
    id: String(row.id ?? ""),
    name: strFrom(row.name) ?? "Pet",
    species,
    breed,
    speciesLabel: speciesDisplayLabel(species, breed),
    ageLabel,
    sizeLabel: sizeLabelForRow,
    weightDisplayShort,
    locationArea,
    careDatesSummary: formatPetAvailabilitySummary(dates, availNotes),
    availabilityDates: dates,
    careTypes: pickCareTypesFromRow(row, details),
    compactLines: buildCompactPetLines(row, {
      locationArea,
      careDatesSummary: formatPetAvailabilitySummary(dates, availNotes),
      availabilityDates: dates,
      careTypes: pickCareTypesFromRow(row, details),
      weightShort: weightDisplayShort,
      ageDisplay: ageLabel,
    }),
    careSummary: buildPetCareSummary(row),
    photoUrls: sortPetPhotoUrls(photos),
    primaryPhotoUrl: pickPrimaryPhotoUrl(photos),
    isActive: row.is_active !== false,
  };
}

async function queryPetIntroRows(
  supabase: SupabaseClient,
  ownerId: string,
  activeOnly: boolean,
): Promise<PetIntroRow[]> {
  let lastError: PostgrestError | null = null;

  for (const select of PET_INTRO_SELECT_TIERS) {
    let query = supabase
      .from("pets")
      .select(select as string)
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const result = await query;

    if (!result.error) {
      return (result.data ?? []) as unknown as PetIntroRow[];
    }

    if (!/column/i.test(result.error.message)) {
      throw new Error(formatSupabaseError(result.error));
    }

    lastError = result.error;
  }

  if (lastError) {
    throw new Error(formatSupabaseError(lastError));
  }
  throw new Error("Could not load pets.");
}

export async function fetchOwnerPetIntros(
  supabase: SupabaseClient,
  ownerId: string,
  options: { activeOnly?: boolean; publicLocation?: boolean } = {},
): Promise<PetIntroDisplay[]> {
  const rows = await queryPetIntroRows(supabase, ownerId, Boolean(options.activeOnly));

  return rows.map((row) =>
    mapRowToPetIntro(row, { publicLocation: options.publicLocation }),
  );
}

export { speciesEmoji };
