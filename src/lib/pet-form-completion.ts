import type { ProfileRequiredFieldId } from "@/lib/profile-required-fields";
import {
  validatePetProfileFormSlice,
  type PetProfileFormSlice,
  type RequiredFieldValidationIssue,
} from "@/lib/profile-required-fields";

export type PetFormCategoryId =
  | "basic"
  | "photos"
  | "care"
  | "health"
  | "behaviour"
  | "availability";

export type PetFormCategoryStatus = "complete" | "required_missing" | "optional_remaining";

export const PET_FORM_SECTION_IDS = {
  health: "pet-form-section-health",
  feeding: "pet-form-section-feeding",
  walking: "pet-form-section-walking",
  behaviour: "pet-form-section-behaviour",
  friendRequirements: "pet-form-section-friend-requirements",
  careLocation: "pet-form-section-care-location",
  notes: "pet-form-section-notes",
} as const;

export type PetFormSectionId = (typeof PET_FORM_SECTION_IDS)[keyof typeof PET_FORM_SECTION_IDS];

const REQUIRED_FIELD_CATEGORY: Partial<Record<ProfileRequiredFieldId, PetFormCategoryId>> = {
  pet_name: "basic",
  pet_species: "basic",
  pet_age: "basic",
  pet_size: "basic",
  pet_photo: "photos",
  pet_personality: "behaviour",
  pet_care_needs: "care",
  pet_availability: "availability",
};

export type PetFormCategoryEvaluationInput = PetProfileFormSlice & {
  healthCharacteristics?: string;
  requiresMedication?: boolean | null;
  feedingSchedule?: string;
  eatingHabits?: string;
  walkNeeds?: string;
  energyLevel?: string;
  challengingTraits?: string;
  friendRequirements?: string[];
  careLocation?: string;
  additionalNotes?: string;
};

export type PetFormCategoryResult = {
  id: PetFormCategoryId;
  status: PetFormCategoryStatus;
  firstMissingFocusId?: string;
  sectionId?: PetFormSectionId;
};

export function categoryForRequiredField(fieldId: ProfileRequiredFieldId): PetFormCategoryId | null {
  return REQUIRED_FIELD_CATEGORY[fieldId] ?? null;
}

function firstIssueForCategory(
  issues: RequiredFieldValidationIssue[],
  category: PetFormCategoryId,
): RequiredFieldValidationIssue | undefined {
  return issues.find((issue) => REQUIRED_FIELD_CATEGORY[issue.id] === category);
}

function healthHasOptionalContent(input: PetFormCategoryEvaluationInput): boolean {
  return (
    Boolean(input.healthCharacteristics?.trim()) ||
    input.requiresMedication === true ||
    input.requiresMedication === false
  );
}

function feedingHasOptionalContent(input: PetFormCategoryEvaluationInput): boolean {
  return Boolean(input.feedingSchedule?.trim() || input.eatingHabits?.trim());
}

function walkingHasOptionalContent(input: PetFormCategoryEvaluationInput): boolean {
  return Boolean(input.walkNeeds?.trim());
}

function behaviourHasOptionalContent(input: PetFormCategoryEvaluationInput): boolean {
  return Boolean(input.energyLevel?.trim() || input.challengingTraits?.trim());
}

function careHasOptionalContent(input: PetFormCategoryEvaluationInput): boolean {
  return Boolean(input.careLocation?.trim());
}

function notesHasOptionalContent(input: PetFormCategoryEvaluationInput): boolean {
  return Boolean(input.additionalNotes?.trim());
}

function friendRequirementsHasContent(input: PetFormCategoryEvaluationInput): boolean {
  return (input.friendRequirements?.length ?? 0) > 0;
}

export function evaluatePetFormCategories(
  input: PetFormCategoryEvaluationInput,
): PetFormCategoryResult[] {
  const issues = validatePetProfileFormSlice(input);

  const basicIssue = firstIssueForCategory(issues, "basic");
  const photosIssue = firstIssueForCategory(issues, "photos");
  const careIssue = firstIssueForCategory(issues, "care");
  const behaviourIssue = firstIssueForCategory(issues, "behaviour");
  const availabilityIssue = firstIssueForCategory(issues, "availability");

  const healthOptionalRemaining =
    !healthHasOptionalContent(input) ||
    !feedingHasOptionalContent(input) ||
    !walkingHasOptionalContent(input);
  const behaviourOptionalRemaining =
    !behaviourIssue &&
    (!behaviourHasOptionalContent(input) || !friendRequirementsHasContent(input));
  const careOptionalRemaining = !careIssue && !careHasOptionalContent(input);
  const notesOptionalRemaining = !notesHasOptionalContent(input);

  return [
    {
      id: "basic",
      status: basicIssue ? "required_missing" : "complete",
      firstMissingFocusId: basicIssue?.focusId,
    },
    {
      id: "photos",
      status: photosIssue ? "required_missing" : "complete",
      firstMissingFocusId: photosIssue?.focusId,
    },
    {
      id: "care",
      status: careIssue ? "required_missing" : careOptionalRemaining ? "optional_remaining" : "complete",
      firstMissingFocusId: careIssue?.focusId,
      sectionId: careIssue ? undefined : careOptionalRemaining ? PET_FORM_SECTION_IDS.careLocation : undefined,
    },
    {
      id: "health",
      status: healthOptionalRemaining ? "optional_remaining" : "complete",
      sectionId: healthOptionalRemaining ? PET_FORM_SECTION_IDS.health : undefined,
    },
    {
      id: "behaviour",
      status: behaviourIssue
        ? "required_missing"
        : behaviourOptionalRemaining
          ? "optional_remaining"
          : "complete",
      firstMissingFocusId: behaviourIssue?.focusId,
      sectionId: behaviourIssue
        ? resolvePetFormSectionForFocusId(behaviourIssue.focusId)
        : behaviourOptionalRemaining
          ? PET_FORM_SECTION_IDS.behaviour
          : undefined,
    },
    {
      id: "availability",
      status: availabilityIssue ? "required_missing" : "complete",
      firstMissingFocusId: availabilityIssue?.focusId,
    },
  ];
}

export function resolvePetFormSectionForFocusId(
  focusId: string | undefined,
): PetFormSectionId | undefined {
  if (!focusId) return undefined;
  switch (focusId) {
    case "health":
      return PET_FORM_SECTION_IDS.health;
    case "feeding":
      return PET_FORM_SECTION_IDS.feeding;
    case "walk":
      return PET_FORM_SECTION_IDS.walking;
    case "energy":
    case "challenging":
    case "positive":
      return PET_FORM_SECTION_IDS.behaviour;
    case "pet-care-types":
      return undefined;
    default:
      return undefined;
  }
}

export type PetFormCompleteNextTarget = {
  categoryId: PetFormCategoryId;
  focusId?: string;
  sectionId?: PetFormSectionId;
};

export function getPetFormCompleteNextTarget(
  input: PetFormCategoryEvaluationInput,
): PetFormCompleteNextTarget | null {
  const categories = evaluatePetFormCategories(input);
  const next = categories.find((c) => c.status === "required_missing");
  if (!next) return null;

  const focusId = next.firstMissingFocusId;
  return {
    categoryId: next.id,
    focusId,
    sectionId: next.sectionId ?? resolvePetFormSectionForFocusId(focusId),
  };
}

export function petFormSliceFromFormState(input: {
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
  healthCharacteristics?: string;
  requiresMedication?: boolean | null;
  feedingSchedule?: string;
  eatingHabits?: string;
  walkNeeds?: string;
  friendRequirements?: string[];
  careLocation?: string;
}): PetFormCategoryEvaluationInput {
  return {
    name: input.name,
    speciesForm: input.speciesForm,
    dateOfBirthDisplay: input.dateOfBirthDisplay,
    size: input.size,
    temperament: input.temperament,
    positiveTraits: input.positiveTraits,
    challengingTraits: input.challengingTraits,
    additionalNotes: input.additionalNotes,
    energyLevel: input.energyLevel,
    careTypes: input.careTypes,
    availabilityDates: input.availabilityDates,
    availabilityNotes: input.availabilityNotes,
    hasPhoto: input.hasPhoto,
    healthCharacteristics: input.healthCharacteristics,
    requiresMedication: input.requiresMedication,
    feedingSchedule: input.feedingSchedule,
    eatingHabits: input.eatingHabits,
    walkNeeds: input.walkNeeds,
    friendRequirements: input.friendRequirements,
    careLocation: input.careLocation,
  };
}
