import { petTypeOptions } from "@/lib/legacy/search-filters";
import { isOtherOptionValue } from "@/lib/other-option";

function formatPetTypeLabel(value: string, otherCustom?: string | null): string {
  if (isOtherOptionValue(value)) {
    return otherCustom?.trim() || "Other";
  }
  return petTypeOptions.find((o) => o.value === value)?.label ?? value;
}

export type LabeledOption = { value: string; label: string };

/** Stored in `profiles.details.pet_care_preferences.experience_level`. */
export const experienceLevelOptions = [
  { value: "first_time", label: "First-time Pet Friend" },
  { value: "some_experience", label: "Some pet care experience" },
  { value: "experienced", label: "Experienced with pets" },
  { value: "seniors", label: "Comfortable with senior pets" },
  { value: "puppies_kittens", label: "Comfortable with puppies/kittens" },
  { value: "energetic", label: "Confident with energetic pets" },
] as const satisfies readonly LabeledOption[];

/** Stored in `profiles.details.pet_care_preferences.preferred_care_location`. */
export const preferredCareLocationOptions = [
  { value: "at_my_home", label: "At my home" },
  { value: "at_pet_parent_home", label: "At pet parent's home" },
  { value: "flexible", label: "Flexible — either home works" },
] as const satisfies readonly LabeledOption[];

const EXPERIENCE_BY_VALUE = new Map<string, string>(
  experienceLevelOptions.map((o) => [o.value, o.label]),
);

const EXPERIENCE_LEGACY_TO_VALUE: Record<string, string> = {
  Beginner: "first_time",
  beginner: "first_time",
  "First-time Pet Friend": "first_time",
  "Some experience": "some_experience",
  "Some pet care experience": "some_experience",
  Intermediate: "some_experience",
  intermediate: "some_experience",
  "Experienced sitter": "experienced",
  "Experienced with pets": "experienced",
  Experienced: "experienced",
  "Very experienced": "experienced",
  "Comfortable with senior pets": "seniors",
  "Comfortable with puppies/kittens": "puppies_kittens",
  "Confident with energetic pets": "energetic",
};

const CARE_LOCATION_BY_VALUE = new Map<string, string>(
  preferredCareLocationOptions.map((o) => [o.value, o.label]),
);

const CARE_LOCATION_LEGACY_TO_VALUE: Record<string, string> = {
  Either: "flexible",
  either: "flexible",
  "Either / flexible": "flexible",
  "Flexible — either home works": "flexible",
  Flexible: "flexible",
  "At my home": "at_my_home",
  "At pet parent's home": "at_pet_parent_home",
  "At pet parent home": "at_pet_parent_home",
};

function normKey(s: string): string {
  return s.trim().toLowerCase();
}

export function normalizeExperienceLevelValue(
  raw: string | null | undefined,
): string | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  if (EXPERIENCE_BY_VALUE.has(t)) return t;
  if (EXPERIENCE_LEGACY_TO_VALUE[t]) return EXPERIENCE_LEGACY_TO_VALUE[t];
  const byNorm = experienceLevelOptions.find((o) => normKey(o.label) === normKey(t));
  if (byNorm) return byNorm.value;
  return t;
}

export function formatExperienceLevelLabel(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const value = normalizeExperienceLevelValue(raw);
  if (value && EXPERIENCE_BY_VALUE.has(value)) return EXPERIENCE_BY_VALUE.get(value)!;
  return raw.trim();
}

export function normalizePreferredCareLocationValue(
  raw: string | null | undefined,
): string | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  if (CARE_LOCATION_BY_VALUE.has(t)) return t;
  if (CARE_LOCATION_LEGACY_TO_VALUE[t]) return CARE_LOCATION_LEGACY_TO_VALUE[t];
  const byNorm = preferredCareLocationOptions.find((o) => normKey(o.label) === normKey(t));
  if (byNorm) return byNorm.value;
  return t;
}

export function formatPreferredCareLocationLabel(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const value = normalizePreferredCareLocationValue(raw);
  if (value && CARE_LOCATION_BY_VALUE.has(value)) return CARE_LOCATION_BY_VALUE.get(value)!;
  return raw.trim();
}

/** Human-friendly chips for `pet_types_willing_to_care_for`. */
export function formatPetTypesWillingComfort(types: string[], otherCustom?: string | null): string[] {
  const normalized = types.filter((t) => t.trim().length > 0);
  const set = new Set(normalized.map((t) => t.trim().toLowerCase()));
  const chips: string[] = [];
  const otherText = otherCustom?.trim();

  if (set.has("dog") && set.has("cat")) {
    chips.push("Comfortable with dogs and cats");
    set.delete("dog");
    set.delete("cat");
  } else {
    if (set.has("dog")) {
      chips.push("Comfortable with dogs");
      set.delete("dog");
    }
    if (set.has("cat")) {
      chips.push("Comfortable with cats");
      set.delete("cat");
    }
  }

  for (const type of normalized) {
    const key = type.trim().toLowerCase();
    if (set.has(key)) {
      if (isOtherOptionValue(type)) {
        chips.push(
          otherText
            ? `Comfortable with ${otherText.toLowerCase()}`
            : "Comfortable with other pets",
        );
      } else {
        chips.push(`Comfortable with ${formatPetTypeLabel(type).toLowerCase()}`);
      }
      set.delete(key);
    }
  }

  return chips;
}

/** Value → display label map for experience (includes legacy DB values). */
export const experienceLevelValueToLabel: Record<string, string> = {
  ...Object.fromEntries(experienceLevelOptions.map((o) => [o.value, o.label])),
  Beginner: "First-time Pet Friend",
  "Some experience": "Some pet care experience",
  "Experienced sitter": "Experienced with pets",
  "Very experienced": "Experienced with pets",
  Intermediate: "Some pet care experience",
};

/** Value → display label map for care location (includes legacy DB values). */
export const preferredCareLocationValueToLabel: Record<string, string> = {
  ...Object.fromEntries(preferredCareLocationOptions.map((o) => [o.value, o.label])),
  Either: "Flexible — either home works",
  "Either / flexible": "Flexible — either home works",
};
