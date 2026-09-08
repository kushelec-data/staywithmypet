/**
 * Canonical care location preference for Pet Friend and Pet Parent profiles.
 * Stored as `profiles.details.care_location_preference` (normalized IDs, never translated strings).
 * Also mirrored to `details.pet_care_preferences.preferred_care_location` on Pet Friend save.
 */

export const CARE_LOCATION_PREFERENCE_VALUES = [
  "pet_friend_home",
  "pet_owner_home",
  "flexible",
] as const;

export type CareLocationPreference = (typeof CARE_LOCATION_PREFERENCE_VALUES)[number];

export const CARE_LOCATION_QUERY_KEY = "careLocation";

export const CARE_LOCATION_PREFERENCE_OPTIONS = [
  { value: "pet_friend_home", label: "At Pet Friend's home" },
  { value: "pet_owner_home", label: "At Pet Owner's home" },
  { value: "flexible", label: "Either / Flexible" },
] as const satisfies readonly { value: CareLocationPreference; label: string }[];

const CANONICAL = new Set<string>(CARE_LOCATION_PREFERENCE_VALUES);

const LEGACY_TO_CANONICAL: Record<string, CareLocationPreference> = {
  pet_friend_home: "pet_friend_home",
  pet_owner_home: "pet_owner_home",
  flexible: "flexible",
  at_my_home: "pet_friend_home",
  at_pet_parent_home: "pet_owner_home",
  "at pet friend's home": "pet_friend_home",
  "at pet borrower's home": "pet_friend_home",
  "at my home": "pet_friend_home",
  "at pet owner's home": "pet_owner_home",
  "at pet parent's home": "pet_owner_home",
  "at pet parent home": "pet_owner_home",
  "either / flexible": "flexible",
  either: "flexible",
  "flexible — either home works": "flexible",
  "flexible - either home works": "flexible",
};

function normKey(s: string): string {
  return s.trim().toLowerCase().replace(/[’']/g, "'");
}

export function isCareLocationPreference(value: unknown): value is CareLocationPreference {
  return typeof value === "string" && CANONICAL.has(value);
}

/** Parse a stored or form value. Unknown / empty → null (never invents flexible). */
export function normalizeCareLocationPreference(
  raw: string | null | undefined,
): CareLocationPreference | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  if (CANONICAL.has(t)) return t as CareLocationPreference;
  const mapped = LEGACY_TO_CANONICAL[normKey(t)] ?? LEGACY_TO_CANONICAL[t];
  if (mapped) return mapped;
  const byLabel = CARE_LOCATION_PREFERENCE_OPTIONS.find(
    (o) => normKey(o.label) === normKey(t),
  );
  return byLabel?.value ?? null;
}

export function formatCareLocationPreferenceLabel(
  raw: string | null | undefined,
): string | null {
  const value = normalizeCareLocationPreference(raw);
  if (!value) return null;
  return CARE_LOCATION_PREFERENCE_OPTIONS.find((o) => o.value === value)?.label ?? null;
}

/** Short chip suffix, e.g. "Pet Friend's home". */
export function formatCareLocationPreferenceChipValue(
  raw: string | null | undefined,
): string | null {
  const value = normalizeCareLocationPreference(raw);
  if (value === "pet_friend_home") return "Pet Friend's home";
  if (value === "pet_owner_home") return "Pet Owner's home";
  if (value === "flexible") return "Either / Flexible";
  return null;
}

export function parseCareLocationQuery(
  value: string | null | undefined,
): CareLocationPreference | "" {
  return normalizeCareLocationPreference(value) ?? "";
}

/**
 * Marketplace filter:
 * - empty filter → all profiles (including null/unknown)
 * - pet_friend_home → pet_friend_home OR flexible
 * - pet_owner_home → pet_owner_home OR flexible
 * - flexible → flexible only
 * Null/unknown is never compatible when the filter is active.
 */
export function matchesCareLocationPreferenceFilter(
  profilePreference: string | null | undefined,
  selected: string | null | undefined,
): boolean {
  const filter = normalizeCareLocationPreference(selected);
  if (!filter) return true;
  const stored = normalizeCareLocationPreference(profilePreference);
  if (!stored) return false;
  if (filter === "flexible") return stored === "flexible";
  return stored === filter || stored === "flexible";
}

export function applyCareLocationPreferenceToDetails(
  base: Record<string, unknown>,
  raw: string | null | undefined,
): Record<string, unknown> {
  const value = normalizeCareLocationPreference(raw);
  if (value) {
    base.care_location_preference = value;
  } else {
    delete base.care_location_preference;
  }

  const nested = base.pet_care_preferences;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const next = { ...(nested as Record<string, unknown>) };
    if (value) next.preferred_care_location = value;
    else delete next.preferred_care_location;
    base.pet_care_preferences = next;
  }

  return base;
}
