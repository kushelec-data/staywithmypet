import { getWordCount, isBioWordCountValid } from "@/lib/bio-words";
import { validatePetDateOfBirthDisplay } from "@/lib/pet-date-of-birth";
import { petIntroHasDisplayPhoto, type PetIntroDisplay } from "@/lib/pet-intro";
import {
  parseProfileDetails,
  profileCalendarSelectedDates,
  resolvedLivingSituation,
  resolvedPetCarePreferences,
  type PetCarePreferences,
  type ProfileDetails,
} from "@/lib/profile-details";
import { isDiscoverableOnFindCare } from "@/lib/profile-marketplace-eligibility";
import { hasSavedProfileLocation, validateProfileLocationForSave, type ProfileLocationFormState } from "@/lib/profile-location";
import { profileLanguagesOtherMissing } from "@/lib/profile-languages";
import { resolveActiveMode, type ProfileActiveMode } from "@/lib/profile-mode";
import type { PetFriendProfileFormInput } from "@/lib/profile-friend-form";
import type { ProfileRole } from "@/lib/profile-setup";
import type { ProfileRow } from "@/lib/profile-utils";
import { profileMeetsAnyMarketplaceMinimum } from "@/lib/profile-marketplace-eligibility";

/** Shared required-field ids — single source for completeness, visibility, and forms. */
export type ProfileRequiredFieldId =
  | "display_name"
  | "profile_photo"
  | "location"
  | "bio"
  | "languages"
  | "pet_listing"
  | "pet_name"
  | "pet_species"
  | "pet_age"
  | "pet_size"
  | "pet_photo"
  | "pet_personality"
  | "pet_care_needs"
  | "pet_availability"
  | "experience"
  | "pet_types"
  | "pet_sizes"
  | "care_services"
  | "availability"
  | "service_area"
  | "care_preference_toggles";

export type ProfileRequiredFieldScope = "common" | "pet_parent" | "pet_friend";

export type ProfileRequiredFieldDef = {
  id: ProfileRequiredFieldId;
  scope: ProfileRequiredFieldScope;
  /** i18n key under `profileRequiredFields.items` */
  labelKey: ProfileRequiredFieldId;
  /** DOM id for scroll/focus on validation */
  focusId?: string;
  href?: string;
};

export const COMMON_REQUIRED_FIELDS: ProfileRequiredFieldDef[] = [
  { id: "display_name", scope: "common", labelKey: "display_name", focusId: "display_name" },
  { id: "profile_photo", scope: "common", labelKey: "profile_photo", focusId: "profile-avatar-upload" },
  { id: "location", scope: "common", labelKey: "location", focusId: "profile-location-input" },
  { id: "bio", scope: "common", labelKey: "bio", focusId: "bio" },
  { id: "languages", scope: "common", labelKey: "languages", focusId: "profile-languages" },
];

export const PET_PARENT_REQUIRED_FIELDS: ProfileRequiredFieldDef[] = [
  { id: "pet_listing", scope: "pet_parent", labelKey: "pet_listing", href: "/pets/new" },
  { id: "pet_name", scope: "pet_parent", labelKey: "pet_name", href: "/pets" },
  { id: "pet_species", scope: "pet_parent", labelKey: "pet_species", href: "/pets" },
  { id: "pet_age", scope: "pet_parent", labelKey: "pet_age", href: "/pets" },
  { id: "pet_size", scope: "pet_parent", labelKey: "pet_size", href: "/pets" },
  { id: "pet_photo", scope: "pet_parent", labelKey: "pet_photo", href: "/pets" },
  { id: "pet_personality", scope: "pet_parent", labelKey: "pet_personality", href: "/pets" },
  { id: "pet_care_needs", scope: "pet_parent", labelKey: "pet_care_needs", href: "/pets" },
  { id: "pet_availability", scope: "pet_parent", labelKey: "pet_availability", href: "/pets" },
];

export const PET_FRIEND_REQUIRED_FIELDS: ProfileRequiredFieldDef[] = [
  { id: "experience", scope: "pet_friend", labelKey: "experience", focusId: "friend-experience-level" },
  { id: "pet_types", scope: "pet_friend", labelKey: "pet_types", focusId: "friend-pet-types" },
  { id: "pet_sizes", scope: "pet_friend", labelKey: "pet_sizes", focusId: "friend-pet-sizes" },
  { id: "care_services", scope: "pet_friend", labelKey: "care_services", focusId: "friend-care-services" },
  { id: "availability", scope: "pet_friend", labelKey: "availability", focusId: "friend-availability-calendar" },
  { id: "service_area", scope: "pet_friend", labelKey: "service_area", focusId: "friend-service-area" },
  {
    id: "care_preference_toggles",
    scope: "pet_friend",
    labelKey: "care_preference_toggles",
    focusId: "friend-care-preference-toggles",
  },
];

export function requiredFieldsForMode(activeMode: ProfileActiveMode): ProfileRequiredFieldDef[] {
  const fields = [...COMMON_REQUIRED_FIELDS];
  if (activeMode === "pet_parent") {
    fields.push(...PET_PARENT_REQUIRED_FIELDS);
  } else {
    fields.push(...PET_FRIEND_REQUIRED_FIELDS);
  }
  return fields;
}

export type ProfileRequiredFieldStatus = {
  id: ProfileRequiredFieldId;
  labelKey: ProfileRequiredFieldId;
  done: boolean;
  focusId?: string;
  href?: string;
};

export type ProfileRequiredFieldsResult = {
  fields: ProfileRequiredFieldStatus[];
  completedCount: number;
  totalCount: number;
  percent: number;
  missing: ProfileRequiredFieldStatus[];
  /** Strict profile completion — used for UX guidance, not marketplace listing. */
  marketplaceReady: boolean;
  /** Minimum fields required to appear on Find Care / Find Pets. */
  marketplaceMinimumEligible: boolean;
};

export type EvaluateRequiredFieldsInput = {
  profile: Pick<
    ProfileRow,
    | "display_name"
    | "avatar_url"
    | "bio"
    | "location"
    | "public_location"
    | "city"
    | "country"
    | "google_place_id"
    | "latitude"
    | "longitude"
    | "languages"
    | "role"
  > & {
    active_mode?: ProfileActiveMode | null;
    details?: ProfileDetails | Record<string, unknown> | null;
    is_public?: boolean | null;
  };
  activeMode?: ProfileActiveMode;
  petIntros?: PetIntroDisplay[];
};

function hasLanguages(profile: EvaluateRequiredFieldsInput["profile"]): boolean {
  return (profile.languages?.length ?? 0) > 0;
}

function petFieldSatisfied(
  petIntros: PetIntroDisplay[],
  check: (pet: PetIntroDisplay) => boolean,
): boolean {
  return petIntros.some(check);
}

function petHasValidName(pet: PetIntroDisplay): boolean {
  const name = pet.name?.trim();
  return Boolean(name && name !== "Pet");
}

function petHasSpecies(pet: PetIntroDisplay): boolean {
  return Boolean(pet.species);
}

function petHasAge(pet: PetIntroDisplay): boolean {
  return Boolean(pet.ageLabel?.trim());
}

function petHasSize(pet: PetIntroDisplay): boolean {
  return Boolean(pet.sizeLabel?.trim());
}

function petHasPhoto(pet: PetIntroDisplay): boolean {
  return petIntroHasDisplayPhoto(pet);
}

function petHasPersonality(pet: PetIntroDisplay): boolean {
  return pet.hasPersonality === true;
}

function petHasCareNeeds(pet: PetIntroDisplay): boolean {
  return pet.careTypes.length > 0;
}

function petHasAvailability(pet: PetIntroDisplay): boolean {
  return pet.availabilityDates.length > 0 || Boolean(pet.careDatesSummary?.trim());
}

export function isSinglePetMarketplaceReady(pet: PetIntroDisplay): boolean {
  return (
    petHasValidName(pet) &&
    petHasSpecies(pet) &&
    petHasAge(pet) &&
    petHasSize(pet) &&
    petHasPhoto(pet) &&
    petHasPersonality(pet) &&
    petHasCareNeeds(pet) &&
    petHasAvailability(pet)
  );
}

function hasCarePreferenceAnswer(care: PetCarePreferences): boolean {
  return hasAnyCarePreferenceToggle(care);
}

/** At least one yes/no care preference answered. */
export function hasAnyCarePreferenceToggle(care: PetCarePreferences | undefined): boolean {
  if (!care) return false;
  return (
    care.willing_special_medical_needs !== null ||
    care.willing_behavioral_quirks !== null ||
    care.willing_seniors !== null ||
    care.willing_puppies_kittens !== null
  );
}

function friendDetailsChecks(details: ProfileDetails) {
  const care = resolvedPetCarePreferences(details);
  const dates = profileCalendarSelectedDates(details);
  return {
    experience: Boolean(care.experience_level?.trim()),
    petTypes: (care.pet_types_willing_to_care_for?.length ?? 0) > 0,
    petSizes: (care.preferred_pet_sizes?.length ?? 0) > 0,
    careServices: (care.available_care_types?.length ?? 0) > 0,
    availability: dates.length > 0,
    serviceArea: Boolean(care.preferred_care_location?.trim()),
    careToggles: hasAnyCarePreferenceToggle(care),
  };
}

function friendFormChecks(form: PetFriendProfileFormInput) {
  return {
    experience: Boolean(form.experienceLevel?.trim()),
    petTypes: form.petTypesWilling.length > 0,
    petSizes: form.preferredPetSizes.length > 0,
    careServices: form.availableCareTypes.length > 0,
    availability: form.availabilitySelectedDates.length > 0,
    serviceArea: Boolean(form.preferredCareLocation?.trim()),
    careToggles: hasAnyCarePreferenceToggle({
      willing_special_medical_needs: form.willingSpecialMedicalNeeds,
      willing_behavioral_quirks: form.willingBehavioralQuirks,
      willing_seniors: form.willingSeniors,
      willing_puppies_kittens: form.willingPuppiesKittens,
    }),
  };
}

export type PetFriendFindCareListingInput = Pick<
  ProfileRow,
  | "display_name"
  | "location"
  | "public_location"
  | "city"
  | "country"
  | "google_place_id"
  | "latitude"
  | "longitude"
  | "role"
> & {
  is_public?: boolean | null;
  details?: ProfileDetails | Record<string, unknown> | null;
};

/** Find Care listing gate — Pet Friend profile sections complete (membership not required). */
export function isPetFriendFindCareListingEligible(
  profile: PetFriendFindCareListingInput,
): boolean {
  if (profile.is_public === false) return false;
  if (!isDiscoverableOnFindCare(profile)) return false;
  if (!profile.display_name?.trim()) return false;
  if (!hasSavedProfileLocation(profile)) return false;

  const details = parseProfileDetails(profile.details);
  const friendChecks = friendDetailsChecks(details);
  const living = resolvedLivingSituation(details);
  const hasLivingSituation = Boolean(living.living_type?.trim());

  return (
    friendChecks.experience &&
    friendChecks.petTypes &&
    friendChecks.petSizes &&
    friendChecks.careServices &&
    friendChecks.availability &&
    friendChecks.serviceArea &&
    friendChecks.careToggles &&
    hasLivingSituation
  );
}

function isFieldDone(
  id: ProfileRequiredFieldId,
  profile: EvaluateRequiredFieldsInput["profile"],
  petIntros: PetIntroDisplay[],
  friendChecks: ReturnType<typeof friendDetailsChecks>,
): boolean {
  switch (id) {
    case "display_name":
      return Boolean(profile.display_name?.trim());
    case "profile_photo":
      return Boolean(profile.avatar_url?.trim());
    case "location":
      return hasSavedProfileLocation(profile);
    case "bio":
      return isBioWordCountValid(getWordCount(profile.bio ?? ""));
    case "languages":
      return hasLanguages(profile);
    case "pet_listing":
      return petIntros.length > 0;
    case "pet_name":
      return petFieldSatisfied(petIntros, petHasValidName);
    case "pet_species":
      return petFieldSatisfied(petIntros, petHasSpecies);
    case "pet_age":
      return petFieldSatisfied(petIntros, petHasAge);
    case "pet_size":
      return petFieldSatisfied(petIntros, petHasSize);
    case "pet_photo":
      return petFieldSatisfied(petIntros, petHasPhoto);
    case "pet_personality":
      return petFieldSatisfied(petIntros, petHasPersonality);
    case "pet_care_needs":
      return petFieldSatisfied(petIntros, petHasCareNeeds);
    case "pet_availability":
      return petFieldSatisfied(petIntros, petHasAvailability);
    case "experience":
      return friendChecks.experience;
    case "pet_types":
      return friendChecks.petTypes;
    case "pet_sizes":
      return friendChecks.petSizes;
    case "care_services":
      return friendChecks.careServices;
    case "availability":
      return friendChecks.availability;
    case "service_area":
      return friendChecks.serviceArea;
    case "care_preference_toggles":
      return friendChecks.careToggles;
  }
}

export function evaluateProfileRequiredFields(
  input: EvaluateRequiredFieldsInput,
): ProfileRequiredFieldsResult {
  const activeMode =
    input.activeMode ?? resolveActiveMode(input.profile.role, input.profile.active_mode);
  const petIntros = input.petIntros ?? [];
  const details = parseProfileDetails(input.profile.details);
  const friendChecks = friendDetailsChecks(details);
  const defs = requiredFieldsForMode(activeMode);

  const fields: ProfileRequiredFieldStatus[] = defs.map((def) => ({
    id: def.id,
    labelKey: def.labelKey,
    done: isFieldDone(def.id, input.profile, petIntros, friendChecks),
    focusId: def.focusId,
    href: def.href,
  }));

  const completedCount = fields.filter((f) => f.done).length;
  const totalCount = fields.length;
  const percent = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
  const missing = fields.filter((f) => !f.done);

  const commonComplete = fields
    .filter((f) => COMMON_REQUIRED_FIELDS.some((c) => c.id === f.id))
    .every((f) => f.done);

  let roleComplete = true;
  if (activeMode === "pet_parent") {
    roleComplete = petIntros.some(isSinglePetMarketplaceReady);
  } else {
    roleComplete = fields
      .filter((f) => PET_FRIEND_REQUIRED_FIELDS.some((c) => c.id === f.id))
      .every((f) => f.done);
  }

  return {
    fields,
    completedCount,
    totalCount,
    percent,
    missing,
    marketplaceReady: commonComplete && roleComplete,
    marketplaceMinimumEligible: profileMeetsAnyMarketplaceMinimum({
      display_name: input.profile.display_name,
      bio: input.profile.bio,
      location: input.profile.location,
      public_location: input.profile.public_location,
      city: input.profile.city,
      country: input.profile.country,
      google_place_id: input.profile.google_place_id,
      latitude: input.profile.latitude,
      longitude: input.profile.longitude,
      is_public: input.profile.is_public,
      role: input.profile.role,
    }),
  };
}

/** @deprecated Strict completion only — use `profileMeetsAnyMarketplaceMinimum` for listing eligibility. */
export function isProfileMarketplaceReady(
  profile: EvaluateRequiredFieldsInput["profile"],
  options: { activeMode?: ProfileActiveMode; petIntros?: PetIntroDisplay[] } = {},
): boolean {
  return evaluateProfileRequiredFields({ profile, ...options }).marketplaceReady;
}

/** Basic profile form slice (setup + edit basic section). */
export type BasicProfileFormSlice = {
  displayName: string;
  avatarUrl: string | null;
  profileLocation: ProfileLocationFormState;
  bio: string;
  languages: string[];
  languagesOther: string;
};

export type RequiredFieldValidationIssue = {
  id: ProfileRequiredFieldId;
  focusId?: string;
};

export function validateBasicProfileFormSlice(
  slice: BasicProfileFormSlice,
): RequiredFieldValidationIssue[] {
  const issues: RequiredFieldValidationIssue[] = [];
  if (!slice.displayName.trim()) {
    issues.push({ id: "display_name", focusId: "display_name" });
  }
  if (!slice.avatarUrl?.trim()) {
    issues.push({ id: "profile_photo", focusId: "profile-avatar-upload" });
  }
  if (!validateProfileLocationForSave(slice.profileLocation).ok) {
    issues.push({ id: "location", focusId: "profile-location-input" });
  }
  if (!isBioWordCountValid(getWordCount(slice.bio))) {
    issues.push({ id: "bio", focusId: "bio" });
  }
  if (slice.languages.length === 0) {
    issues.push({ id: "languages", focusId: "profile-languages" });
  }
  if (profileLanguagesOtherMissing(slice.languages, slice.languagesOther)) {
    issues.push({ id: "languages", focusId: "profile-languages-other" });
  }
  return issues;
}

export function validatePetFriendFormSlice(
  form: PetFriendProfileFormInput,
  options: { scope?: "all" | "profile" | "availability" } = {},
): RequiredFieldValidationIssue[] {
  const scope = options.scope ?? "all";
  const checks = friendFormChecks(form);
  const issues: RequiredFieldValidationIssue[] = [];
  if (scope === "all" || scope === "profile") {
    if (!checks.experience) issues.push({ id: "experience", focusId: "friend-experience-level" });
    if (!checks.petTypes) issues.push({ id: "pet_types", focusId: "friend-pet-types" });
    if (!checks.petSizes) issues.push({ id: "pet_sizes", focusId: "friend-pet-sizes" });
    if (!checks.careServices) issues.push({ id: "care_services", focusId: "friend-care-services" });
    if (!checks.serviceArea) issues.push({ id: "service_area", focusId: "friend-service-area" });
    if (!checks.careToggles) {
      issues.push({ id: "care_preference_toggles", focusId: "friend-care-preference-toggles" });
    }
  }
  if (scope === "all" || scope === "availability") {
    if (!checks.availability) issues.push({ id: "availability", focusId: "friend-availability-calendar" });
  }
  return issues;
}

/** Pet profile form slice (new/edit pet) — mirrors marketplace pet field rules. */
export type PetProfileFormSlice = {
  name: string;
  speciesForm: string;
  dateOfBirthDisplay: string;
  size: string;
  temperament: string[];
  positiveTraits: string;
  challengingTraits: string;
  additionalNotes: string;
  energyLevel: string;
  careTypes: string[];
  availabilityDates: string[];
  availabilityNotes: string;
  hasPhoto: boolean;
};

function formHasPersonality(slice: PetProfileFormSlice): boolean {
  return (
    slice.temperament.length > 0 ||
    Boolean(slice.positiveTraits.trim()) ||
    Boolean(slice.challengingTraits.trim()) ||
    Boolean(slice.additionalNotes.trim()) ||
    Boolean(slice.energyLevel.trim())
  );
}

export function validatePetProfileFormSlice(
  slice: PetProfileFormSlice,
): RequiredFieldValidationIssue[] {
  const issues: RequiredFieldValidationIssue[] = [];
  const name = slice.name.trim();
  if (!name || name === "Pet") {
    issues.push({ id: "pet_name", focusId: "pet_name" });
  }
  if (!slice.speciesForm.trim()) {
    issues.push({ id: "pet_species", focusId: "species" });
  }
  if (!validatePetDateOfBirthDisplay(slice.dateOfBirthDisplay).ok) {
    issues.push({ id: "pet_age", focusId: "dob" });
  }
  if (!slice.size.trim()) {
    issues.push({ id: "pet_size", focusId: "size" });
  }
  if (!slice.hasPhoto) {
    issues.push({ id: "pet_photo", focusId: "pet-photo-upload" });
  }
  if (!formHasPersonality(slice)) {
    issues.push({ id: "pet_personality", focusId: "positive" });
  }
  if (slice.careTypes.length === 0) {
    issues.push({ id: "pet_care_needs", focusId: "pet-care-types" });
  }
  if (slice.availabilityDates.length === 0 && !slice.availabilityNotes.trim()) {
    issues.push({ id: "pet_availability", focusId: "pet-availability-calendar" });
  }
  return issues;
}

export function roleFromSetupRole(role: ProfileRole, activeMode?: ProfileActiveMode | null): ProfileActiveMode {
  return activeMode ?? resolveActiveMode(role, activeMode);
}