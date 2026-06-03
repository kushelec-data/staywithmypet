import { formatBookingDates, formatDate } from "@/lib/date-format";
import { normalizeAvailabilityDates } from "@/lib/pet-availability";
import type { PublicSearchPet } from "@/lib/public-pet-search";
import { speciesDisplayLabel, genderDisplayLabel } from "@/lib/pet-data";
import { formatListWithOtherDisplay } from "@/lib/other-option";

export type PublicDetailGroup = {
  label: string;
  items: string[];
};

export type PublicCareColumns = {
  services: string[];
  walks: string[];
  medication: string[];
};

export type PublicQuickInfoItem = {
  label: string;
  value: string;
};

export type PublicPetQuickFact = {
  icon: "age" | "gender" | "health";
  label: string;
};

function titleCaseCareLabel(value: string): string {
  const t = value.trim();
  if (!t) return "";
  return t
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function buildPublicPetSubtitle(pet: PublicSearchPet): string {
  const weight = pet.weightDisplayShort?.trim() || null;
  return [pet.breed ?? pet.speciesLabel, weight, pet.locationArea].filter(Boolean).join(" · ");
}

export function buildPublicPetChips(pet: PublicSearchPet): string[] {
  const chips: string[] = [];
  const species = speciesDisplayLabel(pet.species, pet.breed);
  if (species) chips.push(species);
  if (pet.weightDisplayShort?.trim()) chips.push(pet.weightDisplayShort.trim());
  for (const tag of pet.personalityTags.slice(0, 4)) {
    if (tag.trim()) chips.push(tag.trim());
  }
  if (pet.availabilityDates.length > 0) chips.push("Available");
  return [...new Set(chips)];
}

function normalizeDisplayText(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function isDuplicatePublicPetAbout(about: string, shortBio: string | null): boolean {
  if (!shortBio?.trim()) return false;
  const a = normalizeDisplayText(about);
  const b = normalizeDisplayText(shortBio);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 24 && b.includes(a)) return true;
  if (b.length >= 24 && a.includes(b)) return true;
  return false;
}

export function buildPublicPetShortBio(pet: PublicSearchPet): string | null {
  const custom = pet.additionalNotes?.trim();
  if (custom) {
    const trimmed = custom.replace(/\s+/g, " ").trim();
    if (trimmed.length <= 220) return trimmed;
    const sentences = trimmed.match(/[^.!?]+[.!?]+/g) ?? [trimmed];
    return sentences.slice(0, 2).join(" ").trim();
  }

  const about = buildPublicPetAutoAboutText(pet);
  if (about) {
    const trimmed = about.replace(/\s+/g, " ").trim();
    if (trimmed.length <= 220) return trimmed;
    const sentences = trimmed.match(/[^.!?]+[.!?]+/g) ?? [trimmed];
    return sentences.slice(0, 2).join(" ").trim();
  }

  const traits = pet.personalityTags.slice(0, 2);
  if (traits.length) {
    const weight = pet.weightDisplayShort?.toLowerCase();
    const type = (pet.breed ?? pet.speciesLabel)?.toLowerCase() ?? "pet";
    return `${pet.name} is${weight ? ` a ${weight}` : ""} ${type} who is ${traits.join(" and ").toLowerCase()}.`;
  }

  return null;
}

export function buildPublicPetQuickFacts(pet: PublicSearchPet): PublicPetQuickFact[] {
  const facts: PublicPetQuickFact[] = [];
  if (pet.ageLabel?.trim()) {
    facts.push({ icon: "age", label: pet.ageLabel.trim() });
  }
  const genderLabel = genderDisplayLabel(pet.gender, pet.genderOther);
  if (genderLabel) {
    facts.push({ icon: "gender", label: genderLabel });
  }
  if (pet.spayedNeutered) {
    facts.push({ icon: "health", label: "Spayed / neutered" });
  } else if (/neutered|spayed/i.test(genderLabel)) {
    facts.push({ icon: "health", label: genderLabel });
  }
  return facts;
}

export function buildPublicPetCareColumns(pet: PublicSearchPet): PublicCareColumns {
  const services = formatListWithOtherDisplay(pet.careTypes, pet.careTypesOther)
    .map(titleCaseCareLabel)
    .filter(Boolean);
  const walks = pet.walkNeeds?.trim()
    ? [pet.walkNeeds.trim()]
    : ["None"];
  const medication =
    pet.requiresMedication === true
      ? ["Needs medication"]
      : pet.requiresMedication === false
        ? ["No medication"]
        : ["Not specified"];

  return { services, walks, medication };
}

export function buildPublicPetAvailabilityChips(pet: PublicSearchPet): string[] {
  const chips: string[] = [];
  const dates = normalizeAvailabilityDates(pet.availabilityDates);
  if (dates.length) {
    chips.push("Next available");
    const label = formatBookingDates(dates, { includeDayCount: false });
    if (label) chips.push(label);
  }
  const notes = pet.availabilityNotes?.trim();
  if (notes) chips.push(notes);
  return chips;
}

export function buildPublicPetQuickInfo(pet: PublicSearchPet): PublicQuickInfoItem[] {
  const items: PublicQuickInfoItem[] = [];
  if (pet.breed?.trim()) items.push({ label: "Breed", value: pet.breed.trim() });
  else if (pet.speciesLabel) items.push({ label: "Breed", value: pet.speciesLabel });
  const w = pet.weightDisplayShort?.trim();
  if (w) items.push({ label: "Weight", value: w });
  if (pet.energyLevel?.trim()) items.push({ label: "Energy level", value: pet.energyLevel.trim() });
  const goodWith = pet.positiveTraits?.trim() || pet.healthCharacteristics?.trim();
  if (goodWith) items.push({ label: "Good with", value: goodWith });
  if (pet.ageLabel?.trim()) items.push({ label: "Age", value: pet.ageLabel.trim() });
  return items.slice(0, 5);
}

/** @deprecated use buildPublicPetCareColumns */
export function buildPublicPetCareGroups(pet: PublicSearchPet): PublicDetailGroup[] {
  const cols = buildPublicPetCareColumns(pet);
  const groups: PublicDetailGroup[] = [];
  if (cols.services.length) groups.push({ label: "Services", items: cols.services });
  if (cols.walks.length) groups.push({ label: "Walks", items: cols.walks });
  if (cols.medication.length) groups.push({ label: "Medication", items: cols.medication });
  return groups;
}

export function buildPublicPetAvailabilityItems(pet: PublicSearchPet): string[] {
  return [
    ...normalizeAvailabilityDates(pet.availabilityDates).map((iso) => formatDate(iso)),
    ...(pet.availabilityNotes?.trim() ? [pet.availabilityNotes.trim()] : []),
  ];
}

/** Auto-generated care summary (not owner-written notes). */
export function buildPublicPetAutoAboutText(pet: PublicSearchPet): string | null {
  const summary = pet.careSummary?.trim();
  if (!summary) return null;

  const headerBits = [pet.name, pet.breed, pet.speciesLabel, pet.weightDisplayShort, pet.locationArea]
    .filter(Boolean)
    .map((s) => s!.toLowerCase());

  const lower = summary.toLowerCase();
  const looksLikeHeaderRepeat =
    headerBits.length >= 2 && headerBits.every((bit) => lower.includes(bit));
  if (looksLikeHeaderRepeat && pet.compactLines.length <= 2) {
    return null;
  }

  const introMatch = summary.match(/^[^.!?]+[.!?]/);
  return introMatch ? introMatch[0].trim() : summary;
}

/** About section body: custom description, or auto text when it does not repeat the hero. */
export function resolvePublicPetAboutSection(
  pet: PublicSearchPet,
  shortBio: string | null,
): string | null {
  const custom = pet.additionalNotes?.trim();
  if (custom) return custom;

  const auto = buildPublicPetAutoAboutText(pet);
  if (!auto) return null;
  if (isDuplicatePublicPetAbout(auto, shortBio)) return null;
  return auto;
}

/** @deprecated use resolvePublicPetAboutSection */
export function buildPublicPetAboutText(pet: PublicSearchPet): string | null {
  return buildPublicPetAutoAboutText(pet);
}
