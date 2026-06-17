import { formatBookingDates, formatDate } from "@/lib/date-format";
import { normalizeAvailabilityDates } from "@/lib/pet-availability";
import type { PublicSearchPet } from "@/lib/public-pet-search";
import { translatePetDisplayLabel, translatePetLocationArea, translatePetSpecies } from "@/lib/pet-display-translations";
import { genderDisplayLabel } from "@/lib/pet-data";
import { formatCareTypeLabel } from "@/lib/care-type-options";
import { translateProfileLabel, translateProfileLabels } from "@/lib/profile-translations";
import type { Locale } from "@/i18n/translations";
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


export function buildPublicPetSubtitle(pet: PublicSearchPet, locale: Locale = "en"): string {
  const weight = pet.weightDisplayShort?.trim() || null;
  const typeLabel = pet.breed?.trim()
    ? translatePetDisplayLabel(pet.breed, locale)
    : translatePetSpecies(pet.species, locale);
  return [typeLabel, weight, pet.locationArea ? translatePetLocationArea(pet.locationArea, locale) : null]
    .filter(Boolean)
    .join(" · ");
}

export function buildPublicPetChips(pet: PublicSearchPet, locale: Locale = "en"): string[] {
  const chips: string[] = [];
  const species = translatePetSpecies(pet.species, locale);
  if (species) chips.push(species);
  if (pet.weightDisplayShort?.trim()) chips.push(pet.weightDisplayShort.trim());
  for (const tag of pet.personalityTags.slice(0, 4)) {
    if (tag.trim()) chips.push(translateProfileLabel(tag.trim(), locale));
  }
  if (pet.availabilityDates.length > 0) {
    chips.push(translateProfileLabel("Available", locale));
  }
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
  if (a.startsWith(b) || b.startsWith(a)) return true;
  if (a.length >= 24 && b.includes(a)) return true;
  if (b.length >= 24 && a.includes(b)) return true;
  return false;
}

/** Hero blurb + About body without repeating the same copy. */
export function resolvePublicPetContent(pet: PublicSearchPet): {
  shortBio: string | null;
  about: string | null;
} {
  const shortBioCandidate = buildPublicPetShortBio(pet);
  const about = resolvePublicPetAboutSection(pet, shortBioCandidate);
  const shortBio =
    about && shortBioCandidate && isDuplicatePublicPetAbout(about, shortBioCandidate)
      ? null
      : shortBioCandidate;
  return { shortBio, about };
}

export function buildPublicPetShortBio(pet: PublicSearchPet): string | null {
  const custom = pet.additionalNotes?.trim();
  if (custom) {
    return null;
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

export function buildPublicPetQuickFacts(
  pet: PublicSearchPet,
  locale: Locale = "en",
): PublicPetQuickFact[] {
  const facts: PublicPetQuickFact[] = [];
  if (pet.ageLabel?.trim()) {
    facts.push({ icon: "age", label: translateProfileLabel(pet.ageLabel.trim(), locale) });
  }
  const genderLabel = genderDisplayLabel(pet.gender, pet.genderOther);
  if (genderLabel) {
    facts.push({ icon: "gender", label: translateProfileLabel(genderLabel, locale) });
  }
  if (pet.spayedNeutered) {
    facts.push({ icon: "health", label: "Spayed / neutered" });
  } else if (/neutered|spayed/i.test(genderLabel)) {
    facts.push({ icon: "health", label: genderLabel });
  }
  return facts;
}

export type PublicCareDetailItem = {
  label: string;
  value: string;
};

export type PublicPetCareDetailLabels = {
  healthDetails: string;
  feedingSchedule: string;
  feedingHabits: string;
  positiveTraits: string;
  behaviourNotes: string;
  additionalInfo: string;
  friendRequirements: string;
};

export function buildPublicPetCareDetails(
  pet: PublicSearchPet,
  locale: Locale,
  labels: PublicPetCareDetailLabels,
): PublicCareDetailItem[] {
  const items: PublicCareDetailItem[] = [];
  const push = (label: string, raw: string | null | undefined) => {
    const value = raw?.trim();
    if (!value) return;
    items.push({ label, value: translateProfileLabel(value, locale) });
  };

  push(labels.healthDetails, pet.healthCharacteristics);
  push(labels.feedingSchedule, pet.feedingSchedule);
  push(labels.feedingHabits, pet.eatingHabits);
  push(labels.positiveTraits, pet.positiveTraits);
  push(labels.behaviourNotes, pet.challengingTraits);
  push(labels.additionalInfo, pet.additionalNotes);

  if (pet.friendRequirements.length) {
    items.push({
      label: labels.friendRequirements,
      value: translateProfileLabels(pet.friendRequirements, locale).join(", "),
    });
  }

  return items;
}

export function buildPublicPetCareColumns(
  pet: PublicSearchPet,
  locale: Locale = "en",
): PublicCareColumns {
  const services = translateProfileLabels(
    formatListWithOtherDisplay(
      pet.careTypes,
      pet.careTypesOther,
      (value) => formatCareTypeLabel(value, pet.careTypesOther) ?? value,
    ).filter(Boolean),
    locale,
  );
  const walks = pet.walkNeeds?.trim()
    ? [translateProfileLabel(pet.walkNeeds.trim(), locale)]
    : [translateProfileLabel("None", locale)];
  const medication: string[] = [];
  if (pet.requiresMedication === true) {
    medication.push(translateProfileLabel("Needs medication", locale));
    const healthNotes = pet.healthCharacteristics?.trim();
    if (healthNotes) {
      medication.push(translateProfileLabel(healthNotes, locale));
    }
  } else {
    medication.push(translateProfileLabel("No medication", locale));
  }

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

export function buildPublicPetQuickInfo(
  pet: PublicSearchPet,
  locale: Locale = "en",
): PublicQuickInfoItem[] {
  const items: PublicQuickInfoItem[] = [];
  if (pet.breed?.trim()) {
    items.push({
      label: translateProfileLabel("Breed", locale),
      value: translateProfileLabel(pet.breed.trim(), locale),
    });
  } else if (pet.speciesLabel) {
    items.push({
      label: translateProfileLabel("Breed", locale),
      value: translateProfileLabel(pet.speciesLabel, locale),
    });
  }
  const w = pet.weightDisplayShort?.trim();
  if (w) {
    items.push({
      label: translateProfileLabel("Size", locale),
      value: translateProfileLabel(w, locale),
    });
  }
  if (pet.energyLevel?.trim()) {
    items.push({
      label: translateProfileLabel("Energy Level", locale),
      value: translateProfileLabel(pet.energyLevel.trim(), locale),
    });
  }
  const goodWith = pet.positiveTraits?.trim() || pet.healthCharacteristics?.trim();
  if (goodWith) {
    items.push({
      label: translateProfileLabel("Positive traits", locale),
      value: translateProfileLabel(goodWith, locale),
    });
  }
  if (pet.ageLabel?.trim()) {
    items.push({
      label: translateProfileLabel("Date of Birth", locale),
      value: translateProfileLabel(pet.ageLabel.trim(), locale),
    });
  }
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
