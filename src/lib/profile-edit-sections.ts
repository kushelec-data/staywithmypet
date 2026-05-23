import { countBioWords, isBioWordCountValid } from "@/lib/bio-words";
import {
  hasCarePreferences,
  hasLivingSituation,
  profileCalendarSelectedDates,
} from "@/lib/profile-details";
import { hasPetParentProfileContent } from "@/lib/profile-parent-form";
import type { ProfileRole } from "@/lib/profile-setup";
import { isPhoneOnFile } from "@/lib/profile-completeness";
import type { ProfileRow } from "@/lib/profile-utils";
import { parseEmergencyContactFromProfile } from "@/lib/trust-safety";

export type ProfileEditSectionKey = "basic" | "trust" | "petFriend" | "petParent";

export function visibleProfileEditSteps(role: ProfileRole): ProfileEditSectionKey[] {
  if (role === "pet_friend") return ["basic", "trust", "petFriend"];
  if (role === "pet_parent") return ["basic", "trust", "petParent"];
  return ["basic", "trust", "petFriend", "petParent"];
}

const HASH_TO_STEP: Record<string, ProfileEditSectionKey> = {
  "basic-profile": "basic",
  "trust-safety": "trust",
  "pet-friend-profile": "petFriend",
  "pet-care-preferences": "petFriend",
  "living-situation": "petFriend",
  availability: "petFriend",
  "pet-parent-profile": "petParent",
};

export function profileEditStepFromHash(hash: string): ProfileEditSectionKey | null {
  const id = hash.replace(/^#/, "").trim();
  if (!id) return null;
  return HASH_TO_STEP[id] ?? null;
}

export function isBasicProfileSectionComplete(
  profile: ProfileRow | null,
  bioValid: boolean,
): boolean {
  if (!profile) return false;
  return Boolean(
    profile.display_name?.trim() &&
      profile.location?.trim() &&
      (profile.languages?.length ?? 0) > 0 &&
      bioValid,
  );
}

export function isTrustSafetySectionComplete(profile: ProfileRow | null): boolean {
  if (!profile) return false;
  const emergency = parseEmergencyContactFromProfile(profile);
  return isPhoneOnFile(profile) || Boolean(emergency?.name?.trim());
}

export function isPetFriendSectionComplete(profile: ProfileRow | null): boolean {
  if (!profile?.details) return false;
  const details = profile.details;
  return (
    hasCarePreferences(details) ||
    hasLivingSituation(details) ||
    profileCalendarSelectedDates(details).length > 0
  );
}

export function isPetParentSectionComplete(profile: ProfileRow | null): boolean {
  if (!profile) return false;
  return hasPetParentProfileContent(profile.details ?? {});
}

export function isProfileEditSectionComplete(
  section: ProfileEditSectionKey,
  profile: ProfileRow | null,
  bioValid?: boolean,
): boolean {
  switch (section) {
    case "basic":
      return isBasicProfileSectionComplete(
        profile,
        bioValid ?? isBioWordCountValid(countBioWords(profile?.bio ?? "")),
      );
    case "trust":
      return isTrustSafetySectionComplete(profile);
    case "petFriend":
      return isPetFriendSectionComplete(profile);
    case "petParent":
      return isPetParentSectionComplete(profile);
  }
}
