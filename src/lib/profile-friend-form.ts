import { normalizePetTypeList } from "@/lib/pet-type-options";
import {
  mergeDetailsAvailabilityBlock,
  mergeDetailsSelectedAvailabilityDates,
  parseProfileDetails,
  resolvedAvailability,
  type PetCarePreferences,
  type ProfileAvailabilityDetails,
  type ProfileDetails,
  type LivingSituationDetails,
} from "@/lib/profile-details";
import { normalizeAvailabilityDates } from "@/lib/pet-availability";
import { strFromOtherField } from "@/lib/other-option";
import { normalizePreferredPetSizesList } from "@/lib/pet-weight";
import {
  normalizeExperienceLevelValue,
  normalizePreferredCareLocationValue,
} from "@/lib/pet-care-labels";
import {
  durationOfCareOptions,
  experienceLevelOptions,
  livingTypeOptions,
  preferredCareLocationOptions,
  preferredDaysTimesOptions,
} from "@/lib/profile-friend-options";

export type PetFriendProfileFormInput = {
  petTypesWilling: string[];
  petTypesWillingOther: string;
  preferredPetSizes: string[];
  experienceLevel: string;
  petTypesPreviouslyBorrowed: string[];
  petTypesPreviouslyBorrowedOther: string;
  willingSpecialMedicalNeeds: boolean | null;
  willingBehavioralQuirks: boolean | null;
  willingSeniors: boolean | null;
  willingPuppiesKittens: boolean | null;
  availableCareTypes: string[];
  availableCareTypesOther: string;
  preferredCareLocation: string;
  preferredDaysTimes: string[];
  durationOfCarePreferred: string;
  availabilityNotes: string;
  availabilitySelectedDates: string[];
  livingType: string;
  livingTypeOther: string;
  hasPetsAtHome: boolean | null;
  petsAtHomeNotes: string;
  hasChildren: boolean | null;
  yardGardenAccess: boolean | null;
  nearbyParkAccess: boolean | null;
};

export const emptyPetFriendProfileForm = (): PetFriendProfileFormInput => ({
  petTypesWilling: [],
  petTypesWillingOther: "",
  preferredPetSizes: [],
  experienceLevel: experienceLevelOptions[0].value,
  petTypesPreviouslyBorrowed: [],
  petTypesPreviouslyBorrowedOther: "",
  willingSpecialMedicalNeeds: null,
  willingBehavioralQuirks: null,
  willingSeniors: null,
  willingPuppiesKittens: null,
  availableCareTypes: [],
  availableCareTypesOther: "",
  preferredCareLocation: preferredCareLocationOptions[2].value,
  preferredDaysTimes: [],
  durationOfCarePreferred: durationOfCareOptions[durationOfCareOptions.length - 1],
  availabilityNotes: "",
  availabilitySelectedDates: [],
  livingType: livingTypeOptions[0],
  livingTypeOther: "",
  hasPetsAtHome: null,
  petsAtHomeNotes: "",
  hasChildren: null,
  yardGardenAccess: null,
  nearbyParkAccess: null,
});

function parseDaysTimes(raw: ProfileAvailabilityDetails): string[] {
  const direct = raw.preferred_days_times;
  if (Array.isArray(direct)) {
    return direct.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  }
  if (typeof direct === "string" && direct.trim()) {
    return direct.split(/[,·]/).map((s) => s.trim()).filter(Boolean);
  }
  const legacy: string[] = [];
  if (raw.weekdays?.trim()) legacy.push(`Weekdays: ${raw.weekdays.trim()}`);
  if (raw.weekends?.trim()) legacy.push(`Weekends: ${raw.weekends.trim()}`);
  return legacy;
}

export function petFriendFormFromDetails(
  details: ProfileDetails,
  calendarDates: string[] = [],
): PetFriendProfileFormInput {
  const care = details.pet_care_preferences;
  const avail = resolvedAvailability(details);
  const living = details.living_situation;
  const dates =
    calendarDates.length > 0
      ? calendarDates
      : normalizeAvailabilityDates(avail.selected_dates);

  return {
    petTypesWilling: normalizePetTypeList([...(care?.pet_types_willing_to_care_for ?? [])]),
    petTypesWillingOther: care?.pet_types_willing_other ?? "",
    preferredPetSizes: normalizePreferredPetSizesList([...(care?.preferred_pet_sizes ?? [])]),
    experienceLevel:
      normalizeExperienceLevelValue(care?.experience_level) ?? experienceLevelOptions[0].value,
    petTypesPreviouslyBorrowed: normalizePetTypeList([...(care?.pet_types_previously_borrowed ?? [])]),
    petTypesPreviouslyBorrowedOther: care?.pet_types_previously_borrowed_other ?? "",
    willingSpecialMedicalNeeds: care?.willing_special_medical_needs ?? null,
    willingBehavioralQuirks: care?.willing_behavioral_quirks ?? null,
    willingSeniors: care?.willing_seniors ?? null,
    willingPuppiesKittens: care?.willing_puppies_kittens ?? null,
    availableCareTypes: [...(care?.available_care_types ?? [])],
    availableCareTypesOther: care?.available_care_types_other ?? "",
    preferredCareLocation:
      normalizePreferredCareLocationValue(care?.preferred_care_location) ??
      preferredCareLocationOptions[2].value,
    preferredDaysTimes: parseDaysTimes(avail ?? {}),
    durationOfCarePreferred:
      avail?.duration_of_care_preferred ?? durationOfCareOptions[durationOfCareOptions.length - 1],
    availabilityNotes: avail?.notes ?? "",
    availabilitySelectedDates: dates,
    livingType: living?.living_type ?? livingTypeOptions[0],
    livingTypeOther: living?.living_type_other ?? "",
    hasPetsAtHome: living?.has_pets_at_home ?? null,
    petsAtHomeNotes: living?.pets_at_home_notes ?? "",
    hasChildren: living?.has_children ?? null,
    yardGardenAccess: living?.yard_garden_access ?? null,
    nearbyParkAccess: living?.nearby_park_access ?? null,
  };
}

export function petFriendFormFromDetailsRaw(
  detailsRaw: unknown,
  calendarDates: string[] = [],
): PetFriendProfileFormInput {
  return petFriendFormFromDetails(parseProfileDetails(detailsRaw), calendarDates);
}

function buildPetCarePreferences(input: PetFriendProfileFormInput): PetCarePreferences {
  return {
    pet_types_willing_to_care_for: normalizePetTypeList(input.petTypesWilling),
    pet_types_willing_other: input.petTypesWillingOther.trim() || null,
    preferred_pet_sizes: input.preferredPetSizes,
    experience_level: normalizeExperienceLevelValue(input.experienceLevel) ?? null,
    pet_types_previously_borrowed: normalizePetTypeList(input.petTypesPreviouslyBorrowed),
    pet_types_previously_borrowed_other: input.petTypesPreviouslyBorrowedOther.trim() || null,
    willing_special_medical_needs: input.willingSpecialMedicalNeeds,
    willing_behavioral_quirks: input.willingBehavioralQuirks,
    willing_seniors: input.willingSeniors,
    willing_puppies_kittens: input.willingPuppiesKittens,
    available_care_types: input.availableCareTypes,
    available_care_types_other: input.availableCareTypesOther.trim() || null,
    preferred_care_location: input.preferredCareLocation.trim() || null,
  };
}

function buildLivingSituation(input: PetFriendProfileFormInput): LivingSituationDetails {
  return {
    living_type: input.livingType.trim() || null,
    living_type_other: input.livingTypeOther.trim() || null,
    has_pets_at_home: input.hasPetsAtHome,
    pets_at_home_notes: input.petsAtHomeNotes.trim() || null,
    has_children: input.hasChildren,
    yard_garden_access: input.yardGardenAccess,
    nearby_park_access: input.nearbyParkAccess,
  };
}

export function mergePetFriendIntoDetails(
  existingDetailsRaw: unknown,
  input: PetFriendProfileFormInput,
): Record<string, unknown> {
  const parsed = parseProfileDetails(existingDetailsRaw);
  const prevAvail = parsed.availability ?? {};

  let base =
    existingDetailsRaw && typeof existingDetailsRaw === "object" && !Array.isArray(existingDetailsRaw)
      ? { ...(existingDetailsRaw as Record<string, unknown>) }
      : {};

  const schedule = {
    weekdays: prevAvail.weekdays ?? null,
    weekends: prevAvail.weekends ?? null,
    next_available_dates: prevAvail.next_available_dates ?? null,
    selected_dates: normalizeAvailabilityDates(input.availabilitySelectedDates),
    notes: input.availabilityNotes.trim() || null,
    preferred_days_times: input.preferredDaysTimes,
    duration_of_care_preferred: input.durationOfCarePreferred.trim() || null,
  };

  base = mergeDetailsAvailabilityBlock(base, schedule);
  base.pet_care_preferences = buildPetCarePreferences(input);
  base.living_situation = buildLivingSituation(input);

  delete base.care_preferences;

  return base;
}

export function mergePetFriendCalendarDates(
  existingDetailsRaw: unknown,
  selectedDates: string[],
): Record<string, unknown> {
  return mergeDetailsSelectedAvailabilityDates(existingDetailsRaw, selectedDates);
}
