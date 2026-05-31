import { careTypeOptions, sizeOptions } from "@/lib/legacy/search-filters";
import {
  formatPetTypeLabel,
  normalizePetTypeList,
  petTypeOptions,
} from "@/lib/pet-type-options";
import { formatDateListShort } from "@/lib/date-format";
import { normalizeAvailabilityDates } from "@/lib/pet-availability";
import {
  emergencyContactRelationshipFromDetails,
  parseEmergencyContact,
  type EmergencyContact,
} from "@/lib/trust-safety";
import {
  formatExperienceLevelLabel,
  formatPetTypesWillingComfort,
  formatPreferredCareLocationLabel,
} from "@/lib/pet-care-labels";
import { formatPreferredPetWeightSizes } from "@/lib/pet-weight";
import {
  formatListWithOtherDisplay,
  isOtherOptionValue,
  strFromOtherField,
} from "@/lib/other-option";

/** `profiles.details.pet_care_preferences` */
export type PetCarePreferences = {
  pet_types_willing_to_care_for?: string[];
  pet_types_willing_other?: string | null;
  preferred_pet_sizes?: string[];
  experience_level?: string | null;
  pet_types_previously_borrowed?: string[];
  pet_types_previously_borrowed_other?: string | null;
  willing_special_medical_needs?: boolean | null;
  willing_behavioral_quirks?: boolean | null;
  willing_seniors?: boolean | null;
  willing_puppies_kittens?: boolean | null;
  available_care_types?: string[];
  available_care_types_other?: string | null;
  preferred_care_location?: string | null;
};

/** `profiles.details.living_situation` */
export type LivingSituationDetails = {
  living_type?: string | null;
  living_type_other?: string | null;
  has_pets_at_home?: boolean | null;
  pets_at_home_notes?: string | null;
  has_children?: boolean | null;
  yard_garden_access?: boolean | null;
  nearby_park_access?: boolean | null;
};

/** `profiles.details.availability` */
export type ProfileAvailabilityDetails = {
  preferred_days_times?: string[] | string | null;
  duration_of_care_preferred?: string | null;
  selected_dates?: string[];
  notes?: string | null;
  /** @deprecated legacy schedule fields */
  weekdays?: string | null;
  weekends?: string | null;
  next_available_dates?: string | null;
};

/** @deprecated — use PetCarePreferences */
export type CarePreferences = {
  pet_types?: string[];
  pet_sizes?: string[];
  care_types?: string[];
  experience?: string | null;
  care_location?: string | null;
  experience_tags?: string[];
};

/** @deprecated — use LivingSituationDetails */
export type LivingSituation = {
  home_type?: string | null;
  has_other_pets?: boolean | null;
  has_children?: boolean | null;
  has_garden?: boolean | null;
  has_nearby_park?: boolean | null;
};

/** @deprecated — use ProfileAvailabilityDetails */
export type ProfileAvailabilitySchedule = ProfileAvailabilityDetails & {
  selected_dates: string[];
};

export type ProfileDetails = {
  /** Private — `profiles.details.emergency_contact` (relationship; name/phone also in columns). */
  emergency_contact?: EmergencyContact;
  /** When name/phone live only in columns, relationship may still be in details JSON. */
  emergency_contact_relationship?: string;
  /** Public gallery URLs (`profiles.details.profile_photos`), max 6 */
  profile_photos?: string[];
  pet_care_preferences?: PetCarePreferences;
  availability?: ProfileAvailabilityDetails;
  living_situation?: LivingSituationDetails;
  /** @deprecated parsed schedule alias */
  availability_schedule?: ProfileAvailabilityDetails;
  availability_notes?: string | null;
  /** @deprecated flat string at root of details */
  availability_legacy?: string | null;
  /** @deprecated */
  care_preferences?: CarePreferences;
  care_location?: string | null;
  pet_types?: string[];
  pet_sizes?: string[];
  care_types?: string[];
  experience?: string | null;
  experience_tags?: string[];
  home_type?: string | null;
  has_other_pets?: boolean | null;
  has_children?: boolean | null;
  has_garden?: boolean | null;
  has_nearby_park?: boolean | null;
};

function strFrom(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length ? t : null;
}

function strArrFrom(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

function boolFrom(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return null;
}

function parsePetCarePreferences(raw: unknown): PetCarePreferences | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;

  const pet_types_willing_to_care_for = normalizePetTypeList(
    strArrFrom(o.pet_types_willing_to_care_for ?? o.pet_types),
  );
  const preferred_pet_sizes = strArrFrom(o.preferred_pet_sizes ?? o.pet_sizes);
  const available_care_types = strArrFrom(o.available_care_types ?? o.care_types);
  const pet_types_previously_borrowed = normalizePetTypeList(
    strArrFrom(o.pet_types_previously_borrowed ?? o.experience_tags),
  );

  const care: PetCarePreferences = {
    pet_types_willing_to_care_for,
    pet_types_willing_other: strFromOtherField(o.pet_types_willing_other) || null,
    preferred_pet_sizes,
    experience_level: strFrom(o.experience_level ?? o.experience),
    pet_types_previously_borrowed,
    pet_types_previously_borrowed_other: strFromOtherField(o.pet_types_previously_borrowed_other) || null,
    willing_special_medical_needs: boolFrom(o.willing_special_medical_needs),
    willing_behavioral_quirks: boolFrom(o.willing_behavioral_quirks),
    willing_seniors: boolFrom(o.willing_seniors),
    willing_puppies_kittens: boolFrom(o.willing_puppies_kittens),
    available_care_types,
    available_care_types_other: strFromOtherField(o.available_care_types_other) || null,
    preferred_care_location: strFrom(o.preferred_care_location ?? o.care_location),
  };

  const hasData =
    pet_types_willing_to_care_for.length > 0 ||
    preferred_pet_sizes.length > 0 ||
    available_care_types.length > 0 ||
    pet_types_previously_borrowed.length > 0 ||
    Boolean(care.experience_level) ||
    Boolean(care.preferred_care_location) ||
    care.willing_special_medical_needs !== null ||
    care.willing_behavioral_quirks !== null ||
    care.willing_seniors !== null ||
    care.willing_puppies_kittens !== null;

  return hasData ? care : undefined;
}

function parseLivingSituation(raw: unknown): LivingSituationDetails | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const living: LivingSituationDetails = {
    living_type: strFrom(o.living_type ?? o.home_type),
    living_type_other: strFromOtherField(o.living_type_other) || null,
    has_pets_at_home: boolFrom(o.has_pets_at_home ?? o.has_other_pets),
    pets_at_home_notes: strFrom(o.pets_at_home_notes),
    has_children: boolFrom(o.has_children),
    yard_garden_access: boolFrom(o.yard_garden_access ?? o.has_garden),
    nearby_park_access: boolFrom(o.nearby_park_access ?? o.has_nearby_park),
  };
  const hasData =
    Boolean(living.living_type) ||
    living.has_pets_at_home !== null ||
    Boolean(living.pets_at_home_notes) ||
    living.has_children !== null ||
    living.yard_garden_access !== null ||
    living.nearby_park_access !== null;
  return hasData ? living : undefined;
}

function parseAvailabilityFromRaw(o: Record<string, unknown>): ProfileAvailabilityDetails {
  const noteFallback = strFrom(o.availability_notes);
  const raw = o.availability;
  if (typeof raw === "string") {
    const t = raw.trim();
    return {
      preferred_days_times: null,
      duration_of_care_preferred: null,
      selected_dates: [],
      notes: t || noteFallback,
    };
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const a = raw as Record<string, unknown>;
    const preferredRaw = a.preferred_days_times;
    let preferred_days_times: string[] | string | null = null;
    if (Array.isArray(preferredRaw)) {
      preferred_days_times = strArrFrom(preferredRaw);
    } else if (typeof preferredRaw === "string") {
      preferred_days_times = preferredRaw.trim() || null;
    }
    return {
      preferred_days_times,
      duration_of_care_preferred: strFrom(a.duration_of_care_preferred),
      weekdays: strFrom(a.weekdays),
      weekends: strFrom(a.weekends),
      next_available_dates: strFrom(a.next_available_dates) ?? strFrom(a.nextAvailableDates),
      selected_dates: normalizeAvailabilityDates(a.selected_dates),
      notes: strFrom(a.notes) ?? noteFallback,
    };
  }
  return {
    preferred_days_times: null,
    duration_of_care_preferred: null,
    selected_dates: [],
    notes: noteFallback,
  };
}

export function parseProfileDetails(raw: unknown): ProfileDetails {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;

  const pet_care_preferences =
    parsePetCarePreferences(o.pet_care_preferences) ??
    parsePetCarePreferences(o.care_preferences) ??
    parsePetCarePreferences(o);

  const living_situation = parseLivingSituation(o.living_situation) ?? parseLivingSituation(o);
  const availability = parseAvailabilityFromRaw(o);

  const profile_photos = strArrFrom(o.profile_photos).slice(0, 6);
  const emergency_contact = parseEmergencyContact(o) ?? undefined;
  const emergency_contact_relationship =
    emergency_contact?.relationship ?? emergencyContactRelationshipFromDetails(o) ?? undefined;

  return {
    emergency_contact,
    emergency_contact_relationship,
    profile_photos: profile_photos.length ? profile_photos : undefined,
    pet_care_preferences,
    availability,
    availability_schedule: availability,
    living_situation,
    availability_notes: strFrom(o.availability_notes),
    availability_legacy: typeof o.availability === "string" ? strFrom(o.availability) : null,
    care_preferences: undefined,
    care_location: strFrom(o.care_location),
    pet_types: strArrFrom(o.pet_types),
    pet_sizes: strArrFrom(o.pet_sizes),
    care_types: strArrFrom(o.care_types),
    experience: strFrom(o.experience),
    experience_tags: strArrFrom(o.experience_tags),
    home_type: strFrom(o.home_type),
    has_other_pets: boolFrom(o.has_other_pets),
    has_children: boolFrom(o.has_children),
    has_garden: boolFrom(o.has_garden),
    has_nearby_park: boolFrom(o.has_nearby_park),
  };
}

export function resolvedPetCarePreferences(details: ProfileDetails): PetCarePreferences {
  const nested = details.pet_care_preferences;
  return {
    pet_types_willing_to_care_for:
      nested?.pet_types_willing_to_care_for?.length
        ? nested.pet_types_willing_to_care_for
        : details.pet_types ?? [],
    pet_types_willing_other: nested?.pet_types_willing_other ?? null,
    preferred_pet_sizes:
      nested?.preferred_pet_sizes?.length ? nested.preferred_pet_sizes : details.pet_sizes ?? [],
    experience_level: nested?.experience_level ?? details.experience ?? null,
    pet_types_previously_borrowed: nested?.pet_types_previously_borrowed ?? [],
    pet_types_previously_borrowed_other: nested?.pet_types_previously_borrowed_other ?? null,
    willing_special_medical_needs: nested?.willing_special_medical_needs ?? null,
    willing_behavioral_quirks: nested?.willing_behavioral_quirks ?? null,
    willing_seniors: nested?.willing_seniors ?? null,
    willing_puppies_kittens: nested?.willing_puppies_kittens ?? null,
    available_care_types:
      nested?.available_care_types?.length ? nested.available_care_types : details.care_types ?? [],
    available_care_types_other: nested?.available_care_types_other ?? null,
    preferred_care_location:
      nested?.preferred_care_location ?? details.care_location ?? null,
  };
}

export function resolvedLivingSituation(details: ProfileDetails): LivingSituationDetails {
  const nested = details.living_situation;
  return {
    living_type: nested?.living_type ?? details.home_type ?? null,
    living_type_other: nested?.living_type_other ?? null,
    has_pets_at_home: nested?.has_pets_at_home ?? details.has_other_pets ?? null,
    pets_at_home_notes: nested?.pets_at_home_notes ?? null,
    has_children: nested?.has_children ?? details.has_children ?? null,
    yard_garden_access: nested?.yard_garden_access ?? details.has_garden ?? null,
    nearby_park_access: nested?.nearby_park_access ?? details.has_nearby_park ?? null,
  };
}

export function resolvedAvailability(details: ProfileDetails): ProfileAvailabilityDetails {
  const s = details.availability ?? details.availability_schedule ?? {};
  return {
    preferred_days_times: s.preferred_days_times ?? null,
    duration_of_care_preferred: s.duration_of_care_preferred ?? null,
    weekdays: s.weekdays ?? null,
    weekends: s.weekends ?? null,
    next_available_dates: s.next_available_dates ?? null,
    selected_dates: normalizeAvailabilityDates(s.selected_dates),
    notes: s.notes ?? details.availability_notes ?? details.availability_legacy ?? null,
  };
}

/** @deprecated */
export function resolvedCarePreferences(details: ProfileDetails): CarePreferences {
  const p = resolvedPetCarePreferences(details);
  return {
    pet_types: p.pet_types_willing_to_care_for,
    pet_sizes: p.preferred_pet_sizes,
    care_types: p.available_care_types,
    experience: p.experience_level,
    care_location: p.preferred_care_location,
    experience_tags: p.pet_types_previously_borrowed,
  };
}

export function profileAvailabilityText(details: ProfileDetails): string | null {
  const s = resolvedAvailability(details);
  const parts: string[] = [];
  const days = Array.isArray(s.preferred_days_times)
    ? s.preferred_days_times.join(", ")
    : s.preferred_days_times?.trim();
  if (days) parts.push(days);
  if (s.duration_of_care_preferred) parts.push(s.duration_of_care_preferred);
  if (s.weekdays) parts.push(`Weekdays: ${s.weekdays}`);
  if (s.weekends) parts.push(`Weekends: ${s.weekends}`);
  if (s.next_available_dates) parts.push(`Next dates: ${s.next_available_dates}`);
  const dates = normalizeAvailabilityDates(s.selected_dates);
  if (dates.length) {
    const selected = formatDateListShort(dates, { maxShown: 5 });
    if (selected) parts.push(`Selected: ${selected}`);
  }
  if (s.notes) parts.push(s.notes);
  const joined = parts.join(" · ");
  if (joined) return joined;
  if (details.availability_legacy?.trim()) return details.availability_legacy.trim();
  return null;
}

/** ISO dates from profile availability calendar (sorted). */
export function profileCalendarSelectedDates(details: ProfileDetails): string[] {
  return normalizeAvailabilityDates(resolvedAvailability(details).selected_dates);
}

export function profileCalendarSelectedDatesSummary(
  details: ProfileDetails,
  locale?: string,
): string | null {
  const dates = profileCalendarSelectedDates(details);
  return formatDateListShort(dates, { locale, maxShown: 8 });
}

export function mergeDetailsAvailabilityBlock(
  existingDetails: unknown,
  schedule: ProfileAvailabilityDetails,
): Record<string, unknown> {
  const base =
    existingDetails && typeof existingDetails === "object" && !Array.isArray(existingDetails)
      ? { ...(existingDetails as Record<string, unknown>) }
      : {};
  const prevAvail = base.availability;
  const prevObj =
    prevAvail && typeof prevAvail === "object" && !Array.isArray(prevAvail)
      ? { ...(prevAvail as Record<string, unknown>) }
      : {};

  base.availability = {
    ...prevObj,
    preferred_days_times: schedule.preferred_days_times ?? prevObj.preferred_days_times,
    duration_of_care_preferred:
      schedule.duration_of_care_preferred ?? prevObj.duration_of_care_preferred,
    weekdays: schedule.weekdays ?? prevObj.weekdays,
    weekends: schedule.weekends ?? prevObj.weekends,
    next_available_dates: schedule.next_available_dates ?? prevObj.next_available_dates,
    selected_dates: normalizeAvailabilityDates(schedule.selected_dates),
    notes: schedule.notes ?? prevObj.notes,
  };
  return base;
}

export function mergeDetailsSelectedAvailabilityDates(
  existingDetails: unknown,
  selectedDates: string[],
): Record<string, unknown> {
  const parsed = parseProfileDetails(existingDetails);
  const avail = resolvedAvailability(parsed);
  return mergeDetailsAvailabilityBlock(existingDetails, {
    ...avail,
    selected_dates: normalizeAvailabilityDates(selectedDates),
  });
}

export type EmergencyContactInput = {
  name: string;
  phone: string;
  relationship?: string | null;
};

export function mergeDetailsTrustFlags(
  existingDetails: unknown,
  emailVerified: boolean,
  options?: {
    phoneVerified?: boolean;
    emergencyContact?: EmergencyContactInput | null;
  },
): Record<string, unknown> {
  const base =
    existingDetails && typeof existingDetails === "object" && !Array.isArray(existingDetails)
      ? { ...(existingDetails as Record<string, unknown>) }
      : {};
  base.email_verified = emailVerified;
  if (options?.phoneVerified !== undefined) {
    base.phone_verified = options.phoneVerified;
  }
  if (options && "emergencyContact" in options) {
    const ec = options.emergencyContact;
    if (ec?.name?.trim() && ec.phone?.trim()) {
      base.emergency_contact = {
        name: ec.name.trim(),
        phone: ec.phone.trim(),
        relationship: ec.relationship?.trim() || null,
      };
    } else if (ec === null) {
      delete base.emergency_contact;
    } else if (ec?.relationship?.trim()) {
      const prev =
        base.emergency_contact &&
        typeof base.emergency_contact === "object" &&
        !Array.isArray(base.emergency_contact)
          ? { ...(base.emergency_contact as Record<string, unknown>) }
          : {};
      base.emergency_contact = {
        ...prev,
        relationship: ec.relationship.trim(),
      };
    } else {
      delete base.emergency_contact;
    }
  }
  return base;
}

export function mergeDetailsGooglePlace(
  existingDetails: unknown,
  placeId: string | null | undefined,
): Record<string, unknown> {
  const base =
    existingDetails && typeof existingDetails === "object" && !Array.isArray(existingDetails)
      ? { ...(existingDetails as Record<string, unknown>) }
      : {};
  if (placeId?.trim()) {
    base.google_place_id = placeId.trim();
  } else {
    delete base.google_place_id;
  }
  return base;
}

export function formatLivingTypeLabel(
  value: string | null | undefined,
  otherCustom?: string | null,
): string | null {
  if (!value?.trim()) return null;
  if (isOtherOptionValue(value)) {
    return otherCustom?.trim() || "Other";
  }
  return value.trim();
}

export function formatCareTypeLabel(value: string, otherCustom?: string | null): string {
  if (isOtherOptionValue(value)) {
    return otherCustom?.trim() || "Other";
  }
  return value.trim();
}

export function formatYesNo(value: boolean | null | undefined): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "Not set";
}

export function carePreferenceDisplayGroups(details: ProfileDetails): {
  petTypes: string[];
  careTypes: string[];
  petSizes: string[];
  experience: string[];
} {
  const care = resolvedPetCarePreferences(details);
  const experience: string[] = [];
  const experienceLabel = formatExperienceLevelLabel(care.experience_level);
  if (experienceLabel) experience.push(experienceLabel);
  const locationLabel = formatPreferredCareLocationLabel(care.preferred_care_location);
  if (locationLabel) experience.push(locationLabel);
  for (const t of care.pet_types_previously_borrowed ?? []) {
    if (typeof t !== "string" || !t.trim()) continue;
    const label = formatPetTypeLabel(t, care.pet_types_previously_borrowed_other);
    if (label.trim()) experience.push(`Previously cared for ${label.toLowerCase()}`);
  }
  return {
    petTypes: formatPetTypesWillingComfort(
      care.pet_types_willing_to_care_for ?? [],
      care.pet_types_willing_other,
    ),
    careTypes: formatListWithOtherDisplay(
      care.available_care_types ?? [],
      care.available_care_types_other,
    ),
    petSizes: formatPreferredPetWeightSizes(care.preferred_pet_sizes ?? []),
    experience,
  };
}

export function hasCarePreferences(details: ProfileDetails): boolean {
  const groups = carePreferenceDisplayGroups(details);
  return (
    groups.petTypes.length > 0 ||
    groups.careTypes.length > 0 ||
    groups.petSizes.length > 0 ||
    groups.experience.length > 0 ||
    Boolean(resolvedPetCarePreferences(details).preferred_care_location)
  );
}

export function hasLivingSituation(details: ProfileDetails): boolean {
  const living = resolvedLivingSituation(details);
  return (
    Boolean(living.living_type) ||
    living.has_pets_at_home !== null ||
    living.has_children !== null ||
    living.yard_garden_access !== null ||
    living.nearby_park_access !== null
  );
}

/** @deprecated use profileAvailabilityText */
export function profileAvailabilityLabel(details: ProfileDetails): string | null {
  return profileAvailabilityText(details);
}

/** @deprecated use carePreferenceDisplayGroups */
export function carePreferenceTags(details: ProfileDetails): string[] {
  const g = carePreferenceDisplayGroups(details);
  return [...g.petTypes, ...g.careTypes, ...g.petSizes, ...g.experience];
}

export { careTypeOptions, formatPetTypeLabel, petTypeOptions, sizeOptions };
