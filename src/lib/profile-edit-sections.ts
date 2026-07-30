import type { PetIntroDisplay } from "@/lib/pet-intro";
import { resolveActiveMode, type ProfileActiveMode } from "@/lib/profile-mode";
import type { ProfileRole } from "@/lib/profile-setup";
import type { ProfileRow } from "@/lib/profile-utils";
import { parseEmergencyContactFromProfile } from "@/lib/trust-safety";
import { isPhoneOnFile } from "@/lib/profile-completeness";
import {
  evaluateProfileRequiredFields,
  type ProfileRequiredFieldId,
  type ProfileRequiredFieldsResult,
  type ProfileRequiredFieldStatus,
} from "@/lib/profile-required-fields";

export type ProfileEditSectionKey = "basic" | "trust" | "petFriend" | "availability" | "petParent";

export function visibleProfileEditSteps(
  role: ProfileRole,
  activeMode?: ProfileActiveMode | null,
): ProfileEditSectionKey[] {
  const mode = activeMode ?? (role === "pet_parent" ? "pet_parent" : "pet_friend");
  if (mode === "pet_friend") return ["basic", "trust", "petFriend", "availability"];
  return ["basic", "trust", "petParent"];
}

/** Maps each required field id to the profile-edit wizard step that owns it. */
export const PROFILE_REQUIRED_FIELD_STEP: Record<
  ProfileRequiredFieldId,
  ProfileEditSectionKey
> = {
  display_name: "basic",
  profile_photo: "basic",
  location: "basic",
  bio: "basic",
  languages: "basic",
  experience: "petFriend",
  pet_types: "petFriend",
  pet_sizes: "petFriend",
  care_services: "petFriend",
  service_area: "petFriend",
  care_preference_toggles: "petFriend",
  availability: "availability",
  pet_listing: "petParent",
  pet_name: "petParent",
  pet_species: "petParent",
  pet_age: "petParent",
  pet_size: "petParent",
  pet_photo: "petParent",
  pet_personality: "petParent",
  pet_care_needs: "petParent",
  pet_availability: "petParent",
};

export function profileEditStepForRequiredField(
  fieldId: ProfileRequiredFieldId,
): ProfileEditSectionKey {
  return PROFILE_REQUIRED_FIELD_STEP[fieldId];
}

export function missingRequiredFieldsForStep(
  result: ProfileRequiredFieldsResult,
  step: ProfileEditSectionKey,
): ProfileRequiredFieldStatus[] {
  return result.missing.filter((field) => PROFILE_REQUIRED_FIELD_STEP[field.id] === step);
}

export type ProfileEditStepBadge =
  | { kind: "complete" }
  | { kind: "required_missing"; count: number }
  | { kind: "optional_remaining" };

export function getProfileEditStepBadge(
  step: ProfileEditSectionKey,
  result: ProfileRequiredFieldsResult,
  profile: ProfileRow | null,
): ProfileEditStepBadge {
  if (step === "trust") {
    return isTrustSafetySectionComplete(profile)
      ? { kind: "complete" }
      : { kind: "optional_remaining" };
  }

  const missingCount = missingRequiredFieldsForStep(result, step).length;
  if (missingCount === 0) return { kind: "complete" };
  return { kind: "required_missing", count: missingCount };
}

export function isProfileEditStepComplete(
  step: ProfileEditSectionKey,
  result: ProfileRequiredFieldsResult,
  profile: ProfileRow | null,
): boolean {
  return getProfileEditStepBadge(step, result, profile).kind === "complete";
}

const HASH_TO_STEP: Record<string, ProfileEditSectionKey> = {
  "basic-profile": "basic",
  "trust-safety": "trust",
  "pet-friend-profile": "petFriend",
  "pet-care-preferences": "petFriend",
  "living-situation": "petFriend",
  availability: "availability",
  "pet-parent-profile": "petParent",
};

export function profileEditStepFromHash(hash: string): ProfileEditSectionKey | null {
  const id = hash.replace(/^#/, "").trim();
  if (!id) return null;
  return HASH_TO_STEP[id] ?? null;
}

function evaluateForProfile(
  profile: ProfileRow,
  petIntros: PetIntroDisplay[] = [],
): ReturnType<typeof evaluateProfileRequiredFields> {
  return evaluateProfileRequiredFields({
    profile,
    activeMode: resolveActiveMode(profile.role, profile.active_mode),
    petIntros,
  });
}

export function isTrustSafetySectionComplete(profile: ProfileRow | null): boolean {
  if (!profile) return false;
  const emergency = parseEmergencyContactFromProfile(profile);
  return isPhoneOnFile(profile) || Boolean(emergency?.name?.trim());
}

export function isBasicProfileSectionComplete(
  profile: ProfileRow | null,
  _bioValid?: boolean,
  petIntros: PetIntroDisplay[] = [],
): boolean {
  if (!profile) return false;
  const result = evaluateForProfile(profile, petIntros);
  return isProfileEditStepComplete("basic", result, profile);
}

export function isPetFriendSectionComplete(profile: ProfileRow | null): boolean {
  if (!profile) return false;
  const result = evaluateForProfile(profile);
  return isProfileEditStepComplete("petFriend", result, profile);
}

export function isAvailabilitySectionComplete(profile: ProfileRow | null): boolean {
  if (!profile) return false;
  const result = evaluateForProfile(profile);
  return isProfileEditStepComplete("availability", result, profile);
}

export function isPetParentSectionComplete(
  profile: ProfileRow | null,
  petIntros: PetIntroDisplay[] = [],
): boolean {
  if (!profile) return false;
  const result = evaluateForProfile(profile, petIntros);
  return isProfileEditStepComplete("petParent", result, profile);
}

export function isProfileEditSectionComplete(
  section: ProfileEditSectionKey,
  profile: ProfileRow | null,
  options: { petIntros?: PetIntroDisplay[] } = {},
): boolean {
  if (!profile) return false;
  if (section === "trust") return isTrustSafetySectionComplete(profile);
  const result = evaluateForProfile(profile, options.petIntros);
  return isProfileEditStepComplete(section, result, profile);
}
