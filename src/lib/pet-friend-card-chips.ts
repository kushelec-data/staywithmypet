import {
  formatExperienceLevelLabel,
  formatPetTypesWillingComfort,
} from "@/lib/pet-care-labels";
import {
  formatPetTypeLabel,
  resolvedPetCarePreferences,
  type ProfileDetails,
} from "@/lib/profile-details";

const SMALL_PET_TYPES = new Set(["rabbit", "bird", "other", "fish", "reptile"]);

/** Short preference chips for Pet Friend listing cards (max ~5). */
export function buildPetFriendPreferenceChips(details: ProfileDetails | null | undefined): string[] {
  const care = resolvedPetCarePreferences(details ?? {});
  const chips: string[] = [];
  const types = new Set(care.pet_types_willing_to_care_for ?? []);

  for (const comfort of formatPetTypesWillingComfort(care.pet_types_willing_to_care_for ?? [])) {
    if (chips.length >= 5) break;
    if (!chips.includes(comfort)) chips.push(comfort);
  }

  const hasSmallType = [...types].some((t) => SMALL_PET_TYPES.has(t));
  const hasSmallSize = (care.preferred_pet_sizes ?? []).some((s) =>
    /under_5_kg|^small$|5_10_kg|small|tiny|under.?5/i.test(s),
  );
  if (hasSmallType || hasSmallSize) chips.push("Small pets OK");

  if (care.willing_seniors === true) chips.push("Senior pets OK");
  if (care.willing_puppies_kittens === true) chips.push("Puppy friendly");

  if (types.has("rabbit") && !chips.includes("Small pets OK")) {
    chips.push(`Good with ${formatPetTypeLabel("rabbit").toLowerCase()}`);
  }

  const experienceLabel = formatExperienceLevelLabel(care.experience_level);
  if (experienceLabel && chips.length < 5 && !chips.includes(experienceLabel)) {
    chips.push(experienceLabel);
  }

  if (care.willing_behavioral_quirks === true && chips.length < 5) {
    chips.push("Patient with quirks");
  }

  if (care.willing_special_medical_needs === true && chips.length < 5) {
    chips.push("Medical needs OK");
  }

  for (const careType of care.available_care_types ?? []) {
    if (chips.length >= 5) break;
    const label = careType.replace(/\s+/g, " ").trim();
    if (label && !chips.includes(label)) chips.push(label);
  }

  if (!chips.length && (care.available_care_types ?? []).length) {
    chips.push(...(care.available_care_types ?? []).slice(0, 3));
  }

  return chips.slice(0, 5);
}
