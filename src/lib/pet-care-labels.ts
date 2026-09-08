import {
  CARE_LOCATION_PREFERENCE_OPTIONS,
  formatCareLocationPreferenceLabel,
  normalizeCareLocationPreference,
} from "@/lib/care-location-preference";
import { formatPetTypeLabel, normalizePetTypeValue } from "@/lib/pet-type-options";
import { isOtherOptionValue } from "@/lib/other-option";

export { formatPetTypeLabel };

export type LabeledOption = { value: string; label: string };

/** Stored in `profiles.details.pet_care_preferences.experience_level`. */
export const experienceLevelOptions = [
  { value: "first_time", label: "First-time Pet Friend" },
  { value: "some_experience", label: "Some pet care experience" },
  { value: "experienced", label: "Experienced with pets" },
] as const satisfies readonly LabeledOption[];

/** Retired `experience_level` values — kept for DB reads; never shown or offered in UI. */
const DEPRECATED_EXPERIENCE_LEVELS = new Set(["seniors", "puppies_kittens", "energetic"]);

/** Canonical values: `pet_friend_home` | `pet_owner_home` | `flexible`. */
export const preferredCareLocationOptions = CARE_LOCATION_PREFERENCE_OPTIONS;

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
};

function normKey(s: string): string {
  return s.trim().toLowerCase();
}

export function normalizeExperienceLevelValue(
  raw: string | null | undefined,
): string | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  if (DEPRECATED_EXPERIENCE_LEVELS.has(t)) return null;
  if (EXPERIENCE_BY_VALUE.has(t)) return t;
  const legacy = EXPERIENCE_LEGACY_TO_VALUE[t];
  if (legacy) {
    if (DEPRECATED_EXPERIENCE_LEVELS.has(legacy)) return null;
    if (EXPERIENCE_BY_VALUE.has(legacy)) return legacy;
  }
  const byNorm = experienceLevelOptions.find((o) => normKey(o.label) === normKey(t));
  if (byNorm) return byNorm.value;
  return null;
}

export function formatExperienceLevelLabel(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const value = normalizeExperienceLevelValue(raw);
  if (!value || !EXPERIENCE_BY_VALUE.has(value)) return null;
  return EXPERIENCE_BY_VALUE.get(value)!;
}

export function normalizePreferredCareLocationValue(
  raw: string | null | undefined,
): string | null {
  return normalizeCareLocationPreference(raw);
}

export function formatPreferredCareLocationLabel(raw: string | null | undefined): string | null {
  return formatCareLocationPreferenceLabel(raw);
}

/** Human-friendly chips for `pet_types_willing_to_care_for`. */
export function formatPetTypesWillingComfort(types: string[], otherCustom?: string | null): string[] {
  const normalized = types.filter(
    (t): t is string => typeof t === "string" && t.trim().length > 0,
  );
  const set = new Set(normalized.map((t) => normalizePetTypeValue(t)));
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
    const key = normalizePetTypeValue(type);
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
  at_my_home: "At Pet Friend's home",
  at_pet_parent_home: "At Pet Owner's home",
  Either: "Either / Flexible",
  "Either / flexible": "Either / Flexible",
  "At my home": "At Pet Friend's home",
  "At pet parent's home": "At Pet Owner's home",
  "Flexible — either home works": "Either / Flexible",
};
