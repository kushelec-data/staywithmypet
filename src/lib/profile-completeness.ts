import { countBioWords } from "@/lib/bio-words";
import type { PetIntroDisplay } from "@/lib/pet-intro";
import {
  hasCarePreferences,
  hasLivingSituation,
  profileCalendarSelectedDates,
  type ProfileDetails,
} from "@/lib/profile-details";
import { resolveActiveMode, type ProfileActiveMode } from "@/lib/profile-mode";
import type { ProfileRole } from "@/lib/profile-setup";
import type { ProfileRow } from "@/lib/profile-utils";

/** Minimum bio length counted toward profile completeness (same rule everywhere). */
export const PROFILE_COMPLETENESS_BIO_MIN_WORDS = 40;

export type CompletenessItemId =
  | "avatar"
  | "bio"
  | "location"
  | "phone"
  | "pet_listing"
  | "pet_care_details"
  | "pet_availability"
  | "care_preferences"
  | "availability"
  | "living_situation"
  | "emergency_contact";

export type CompletenessItem = {
  id: CompletenessItemId;
  label: string;
  done: boolean;
  href?: string;
};

export type ProfileCompleteness = {
  percent: number;
  items: CompletenessItem[];
  missing: CompletenessItem[];
};

export type ProfileCompletenessLabels = {
  profilePhoto: string;
  bioCompleted: string;
  location: string;
  phone: string;
  atLeastOnePet: string;
  petCareDetails: string;
  petAvailability: string;
  carePreferences: string;
  availability: string;
  livingSituation: string;
  emergencyContact: string;
};

export const DEFAULT_PROFILE_COMPLETENESS_LABELS: ProfileCompletenessLabels = {
  profilePhoto: "Profile photo",
  bioCompleted: "Bio completed",
  location: "Location added",
  phone: "Add phone number",
  atLeastOnePet: "At least one pet",
  petCareDetails: "Add pet care needs",
  petAvailability: "Add pet availability",
  carePreferences: "Add care preferences",
  availability: "Add availability",
  livingSituation: "Complete living situation",
  emergencyContact: "Add emergency contact",
};

/** Fields required to compute completeness (subset of `ProfileRow`). */
export type ProfileCompletenessInput = Pick<
  ProfileRow,
  | "avatar_url"
  | "bio"
  | "location"
  | "phone"
  | "phone_e164"
  | "role"
  | "active_mode"
  | "details"
  | "emergency_contact_name"
  | "emergency_contact_phone_e164"
>;

export type ProfileCompletenessOptions = {
  petsCount?: number;
  activeMode?: ProfileActiveMode;
  petIntros?: PetIntroDisplay[];
  labels?: ProfileCompletenessLabels;
};

export function publicProfileHref(profileId: string): string {
  return `/users/${profileId}`;
}

/** @deprecated Use active mode via `profileNeedsPetListingForMode`. */
export function profileNeedsPetListing(role: ProfileRole): boolean {
  return role === "pet_parent" || role === "both";
}

export function profileNeedsPetListingForMode(activeMode: ProfileActiveMode): boolean {
  return activeMode === "pet_parent";
}

export function isBioCompleteForProfile(bio: string | null | undefined): boolean {
  return countBioWords(bio ?? "") >= PROFILE_COMPLETENESS_BIO_MIN_WORDS;
}

export function isPhoneOnFile(profile: {
  phone?: string | null;
  phone_e164?: string | null;
}): boolean {
  return Boolean(profile.phone_e164?.trim() || profile.phone?.trim());
}

export function petsHaveCareDetails(petIntros: PetIntroDisplay[]): boolean {
  if (petIntros.length === 0) return false;
  return petIntros.every((pet) => pet.careTypes.length > 0);
}

export function petsHaveAvailability(petIntros: PetIntroDisplay[]): boolean {
  return petIntros.some((pet) => Boolean(pet.careDatesSummary?.trim()));
}

function sharedProfileItems(
  profile: ProfileCompletenessInput,
  labels: ProfileCompletenessLabels,
): CompletenessItem[] {
  return [
    {
      id: "avatar",
      label: labels.profilePhoto,
      done: Boolean(profile.avatar_url?.trim()),
      href: "/profile/edit",
    },
    {
      id: "bio",
      label: labels.bioCompleted,
      done: isBioCompleteForProfile(profile.bio),
      href: "/profile/edit",
    },
    {
      id: "location",
      label: labels.location,
      done: Boolean(profile.location?.trim()),
      href: "/profile/edit",
    },
  ];
}

function petParentItems(
  profile: ProfileCompletenessInput,
  options: ProfileCompletenessOptions,
  labels: ProfileCompletenessLabels,
): CompletenessItem[] {
  const petsCount = options.petsCount ?? 0;
  const petIntros = options.petIntros ?? [];
  return [
    {
      id: "pet_listing",
      label: labels.atLeastOnePet,
      done: petsCount > 0,
      href: "/pets/new",
    },
    {
      id: "pet_care_details",
      label: labels.petCareDetails,
      done: petsCount > 0 && (petIntros.length > 0 ? petsHaveCareDetails(petIntros) : false),
      href: "/pets",
    },
    {
      id: "pet_availability",
      label: labels.petAvailability,
      done: petsCount > 0 && (petIntros.length > 0 ? petsHaveAvailability(petIntros) : false),
      href: "/pets",
    },
  ];
}

function petFriendItems(
  profile: ProfileCompletenessInput,
  labels: ProfileCompletenessLabels,
): CompletenessItem[] {
  const details = profile.details ?? {};
  const hasAvailability = profileCalendarSelectedDates(details).length > 0;

  return [
    {
      id: "availability",
      label: labels.availability,
      done: hasAvailability,
      href: "/profile/edit#availability",
    },
    {
      id: "care_preferences",
      label: labels.carePreferences,
      done: hasCarePreferences(details),
      href: "/profile/edit#pet-care-preferences",
    },
    {
      id: "living_situation",
      label: labels.livingSituation,
      done: hasLivingSituation(details),
      href: "/profile/edit#living-situation",
    },
  ];
}

export function computeProfileCompleteness(
  profile: ProfileCompletenessInput,
  options: ProfileCompletenessOptions = {},
): ProfileCompleteness {
  const labels = options.labels ?? DEFAULT_PROFILE_COMPLETENESS_LABELS;
  const activeMode =
    options.activeMode ?? resolveActiveMode(profile.role, profile.active_mode);

  const items: CompletenessItem[] = [...sharedProfileItems(profile, labels)];

  if (activeMode === "pet_parent") {
    items.push(...petParentItems(profile, options, labels));
  } else {
    items.push(...petFriendItems(profile, labels));
  }

  const doneCount = items.filter((i) => i.done).length;
  const percent = items.length ? Math.round((doneCount / items.length) * 100) : 0;
  const missing = items.filter((i) => !i.done);

  return { percent, items, missing };
}

export type CompletenessCheckStatus = "completed" | "pending" | "missing";

export function completenessItemStatus(
  item: CompletenessItem,
  profile: ProfileCompletenessInput,
): CompletenessCheckStatus {
  if (item.done) return "completed";
  if (item.id === "bio") {
    const words = countBioWords(profile.bio ?? "");
    if (words > 0 && words < PROFILE_COMPLETENESS_BIO_MIN_WORDS) return "pending";
  }
  return "missing";
}
