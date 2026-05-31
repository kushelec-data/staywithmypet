import { parseProfileDetails, type ProfileDetails } from "@/lib/profile-details";
import { normalizePetTypeList } from "@/lib/pet-type-options";
import { strFromOtherField } from "@/lib/other-option";

/** `profiles.details.pet_parent_profile` */
export type PetParentProfileDetails = {
  own_pets_summary?: string | null;
  care_needs_notes?: string | null;
  home_location_notes?: string | null;
  preferred_pet_types?: string[];
  preferred_pet_types_other?: string | null;
  preferred_care_types?: string[];
  preferred_care_types_other?: string | null;
};

export type PetParentProfileFormInput = {
  ownPetsSummary: string;
  careNeedsNotes: string;
  homeLocationNotes: string;
  preferredPetTypes: string[];
  preferredPetTypesOther: string;
  preferredCareTypes: string[];
  preferredCareTypesOther: string;
};

export const emptyPetParentProfileForm = (): PetParentProfileFormInput => ({
  ownPetsSummary: "",
  careNeedsNotes: "",
  homeLocationNotes: "",
  preferredPetTypes: [],
  preferredPetTypesOther: "",
  preferredCareTypes: [],
  preferredCareTypesOther: "",
});

function strFrom(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function strArrFrom(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

export function parsePetParentProfileDetails(raw: unknown): PetParentProfileDetails | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const preferred_pet_types = normalizePetTypeList(strArrFrom(o.preferred_pet_types));
  const preferred_care_types = strArrFrom(o.preferred_care_types);
  const own_pets_summary = strFrom(o.own_pets_summary) || null;
  const care_needs_notes = strFrom(o.care_needs_notes) || null;
  const home_location_notes = strFrom(o.home_location_notes) || null;

  const hasData =
    Boolean(own_pets_summary) ||
    Boolean(care_needs_notes) ||
    Boolean(home_location_notes) ||
    preferred_pet_types.length > 0 ||
    preferred_care_types.length > 0;

  if (!hasData) return undefined;

  return {
    own_pets_summary,
    care_needs_notes,
    home_location_notes,
    preferred_pet_types,
    preferred_pet_types_other: strFromOtherField(o.preferred_pet_types_other) || null,
    preferred_care_types,
    preferred_care_types_other: strFromOtherField(o.preferred_care_types_other) || null,
  };
}

export function petParentFormFromDetails(details: ProfileDetails): PetParentProfileFormInput {
  const parent = parsePetParentProfileDetails(
    (details as Record<string, unknown>).pet_parent_profile,
  );
  return {
    ownPetsSummary: parent?.own_pets_summary ?? "",
    careNeedsNotes: parent?.care_needs_notes ?? "",
    homeLocationNotes: parent?.home_location_notes ?? "",
    preferredPetTypes: normalizePetTypeList([...(parent?.preferred_pet_types ?? [])]),
    preferredPetTypesOther: parent?.preferred_pet_types_other ?? "",
    preferredCareTypes: [...(parent?.preferred_care_types ?? [])],
    preferredCareTypesOther: parent?.preferred_care_types_other ?? "",
  };
}

export function petParentFormFromDetailsRaw(detailsRaw: unknown): PetParentProfileFormInput {
  return petParentFormFromDetails(parseProfileDetails(detailsRaw));
}

function buildPetParentProfileDetails(input: PetParentProfileFormInput): PetParentProfileDetails {
  return {
    own_pets_summary: input.ownPetsSummary.trim() || null,
    care_needs_notes: input.careNeedsNotes.trim() || null,
    home_location_notes: input.homeLocationNotes.trim() || null,
    preferred_pet_types: normalizePetTypeList(input.preferredPetTypes),
    preferred_pet_types_other: input.preferredPetTypesOther.trim() || null,
    preferred_care_types: input.preferredCareTypes,
    preferred_care_types_other: input.preferredCareTypesOther.trim() || null,
  };
}

export function hasPetParentProfileContent(details: ProfileDetails): boolean {
  return Boolean(parsePetParentProfileDetails(
    (details as Record<string, unknown>).pet_parent_profile,
  ));
}

export function mergePetParentIntoDetails(
  existingDetailsRaw: unknown,
  input: PetParentProfileFormInput,
): Record<string, unknown> {
  const base =
    existingDetailsRaw && typeof existingDetailsRaw === "object" && !Array.isArray(existingDetailsRaw)
      ? { ...(existingDetailsRaw as Record<string, unknown>) }
      : {};

  const built = buildPetParentProfileDetails(input);
  const hasData =
    Boolean(built.own_pets_summary) ||
    Boolean(built.care_needs_notes) ||
    Boolean(built.home_location_notes) ||
    (built.preferred_pet_types?.length ?? 0) > 0 ||
    (built.preferred_care_types?.length ?? 0) > 0;

  if (hasData) {
    base.pet_parent_profile = built;
  } else {
    delete base.pet_parent_profile;
  }

  return base;
}
