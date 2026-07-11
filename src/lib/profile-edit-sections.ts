import type { PetIntroDisplay } from "@/lib/pet-intro";
import { resolveActiveMode, type ProfileActiveMode } from "@/lib/profile-mode";
import type { ProfileRole } from "@/lib/profile-setup";
import type { ProfileRow } from "@/lib/profile-utils";
import { parseEmergencyContactFromProfile } from "@/lib/trust-safety";
import { isPhoneOnFile } from "@/lib/profile-completeness";
import {
  COMMON_REQUIRED_FIELDS,
  evaluateProfileRequiredFields,
  isSinglePetMarketplaceReady,
  PET_FRIEND_REQUIRED_FIELDS,
} from "@/lib/profile-required-fields";

export type ProfileEditSectionKey = "basic" | "trust" | "petFriend" | "availability" | "petParent";

export function visibleProfileEditSteps(
  role: ProfileRole,
  activeMode?: ProfileActiveMode | null,
): ProfileEditSectionKey[] {
  const mode = activeMode ?? (role === "pet_parent" ? "pet_parent" : "pet_friend");
  if (mode === "pet_friend") return ["basic", "trust", "petFriend", "availability"];
  return ["basic", "trust"];
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

function fieldDone(
  result: ReturnType<typeof evaluateProfileRequiredFields>,
  id: (typeof COMMON_REQUIRED_FIELDS)[number]["id"],
): boolean {
  return result.fields.find((f) => f.id === id)?.done ?? false;
}

export function isBasicProfileSectionComplete(
  profile: ProfileRow | null,
  _bioValid?: boolean,
): boolean {
  if (!profile) return false;
  const result = evaluateForProfile(profile);
  return COMMON_REQUIRED_FIELDS.every((def) => fieldDone(result, def.id));
}

export function isTrustSafetySectionComplete(profile: ProfileRow | null): boolean {
  if (!profile) return false;
  const emergency = parseEmergencyContactFromProfile(profile);
  return isPhoneOnFile(profile) || Boolean(emergency?.name?.trim());
}

const FRIEND_PROFILE_FIELD_IDS = PET_FRIEND_REQUIRED_FIELDS.filter(
  (f) => f.id !== "availability",
).map((f) => f.id);

export function isPetFriendSectionComplete(profile: ProfileRow | null): boolean {
  if (!profile) return false;
  const result = evaluateForProfile(profile);
  return FRIEND_PROFILE_FIELD_IDS.every((id) => fieldDone(result, id));
}

export function isAvailabilitySectionComplete(profile: ProfileRow | null): boolean {
  if (!profile) return false;
  const result = evaluateForProfile(profile);
  return fieldDone(result, "availability");
}

export function isPetParentSectionComplete(
  profile: ProfileRow | null,
  petIntros: PetIntroDisplay[] = [],
): boolean {
  if (!profile) return false;
  return petIntros.some(isSinglePetMarketplaceReady);
}

export function isProfileEditSectionComplete(
  section: ProfileEditSectionKey,
  profile: ProfileRow | null,
  options: { petIntros?: PetIntroDisplay[] } = {},
): boolean {
  switch (section) {
    case "basic":
      return isBasicProfileSectionComplete(profile);
    case "trust":
      return isTrustSafetySectionComplete(profile);
    case "petFriend":
      return isPetFriendSectionComplete(profile);
    case "availability":
      return isAvailabilitySectionComplete(profile);
    case "petParent":
      return isPetParentSectionComplete(profile, options.petIntros);
  }
}
