import type { PetIntroDisplay } from "@/lib/pet-intro";
import {
  evaluateProfileRequiredFields,
  type ProfileRequiredFieldId,
} from "@/lib/profile-required-fields";
import { resolveActiveMode, type ProfileActiveMode } from "@/lib/profile-mode";
import type { ProfileRole } from "@/lib/profile-setup";
import type { ProfileRow } from "@/lib/profile-utils";
import { getWordCount } from "@/lib/bio-words";

/** Minimum bio length counted toward profile completeness (same rule everywhere). */
export const PROFILE_COMPLETENESS_BIO_MIN_WORDS = 40;

/** @deprecated Use `ProfileRequiredFieldId` from profile-required-fields. */
export type CompletenessItemId = ProfileRequiredFieldId;

export type CompletenessItem = {
  id: ProfileRequiredFieldId;
  label: string;
  done: boolean;
  href?: string;
};

export type ProfileCompleteness = {
  percent: number;
  items: CompletenessItem[];
  missing: CompletenessItem[];
  completedCount: number;
  totalCount: number;
  marketplaceReady: boolean;
};

export type ProfileCompletenessLabels = Record<ProfileRequiredFieldId, string>;

export const DEFAULT_PROFILE_COMPLETENESS_LABELS: ProfileCompletenessLabels = {
  display_name: "Display name",
  profile_photo: "Profile photo",
  location: "Address added",
  bio: "Bio completed",
  languages: "Languages",
  pet_listing: "At least one pet",
  pet_name: "Pet name",
  pet_species: "Pet type/species",
  pet_age: "Pet date of birth or age",
  pet_size: "Pet size",
  pet_photo: "Pet photo",
  pet_personality: "Pet description/personality",
  pet_care_needs: "Pet care needs",
  pet_availability: "Pet availability",
  experience: "Experience with pets",
  pet_types: "Pet types you can care for",
  pet_sizes: "Pet sizes you can care for",
  care_services: "Care services offered",
  availability: "Availability",
  service_area: "Service area",
  care_preference_toggles: "Care preference answers",
};

/** Fields required to compute completeness (subset of `ProfileRow`). */
export type ProfileCompletenessInput = Pick<
  ProfileRow,
  | "avatar_url"
  | "bio"
  | "location"
  | "public_location"
  | "city"
  | "country"
  | "google_place_id"
  | "latitude"
  | "longitude"
  | "phone"
  | "phone_e164"
  | "role"
  | "active_mode"
  | "details"
  | "display_name"
  | "languages"
>;

export type ProfileCompletenessOptions = {
  petsCount?: number;
  activeMode?: ProfileActiveMode;
  petIntros?: PetIntroDisplay[];
  labels?: Partial<ProfileCompletenessLabels>;
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
  return getWordCount(bio ?? "") >= PROFILE_COMPLETENESS_BIO_MIN_WORDS;
}

export function isPhoneOnFile(profile: {
  phone?: string | null;
  phone_e164?: string | null;
}): boolean {
  return Boolean(profile.phone_e164?.trim() || profile.phone?.trim());
}

/** @deprecated Use `isSinglePetMarketplaceReady` from profile-required-fields. */
export function petsHaveCareDetails(petIntros: PetIntroDisplay[]): boolean {
  return petIntros.some((pet) => pet.careTypes.length > 0);
}

/** @deprecated Use pet availability checks from profile-required-fields. */
export function petsHaveAvailability(petIntros: PetIntroDisplay[]): boolean {
  return petIntros.some(
    (pet) => pet.availabilityDates.length > 0 || Boolean(pet.careDatesSummary?.trim()),
  );
}

function resolveLabels(options: ProfileCompletenessOptions): ProfileCompletenessLabels {
  return { ...DEFAULT_PROFILE_COMPLETENESS_LABELS, ...options.labels };
}

export function computeProfileCompleteness(
  profile: ProfileCompletenessInput,
  options: ProfileCompletenessOptions = {},
): ProfileCompleteness {
  const labels = resolveLabels(options);
  const activeMode =
    options.activeMode ?? resolveActiveMode(profile.role, profile.active_mode);

  const evaluated = evaluateProfileRequiredFields({
    profile,
    activeMode,
    petIntros: options.petIntros,
  });

  const items: CompletenessItem[] = evaluated.fields.map((field) => ({
    id: field.id,
    label: labels[field.labelKey],
    done: field.done,
    href: field.href ?? "/profile/edit",
  }));

  const missing = items.filter((i) => !i.done);

  return {
    percent: evaluated.percent,
    items,
    missing,
    completedCount: evaluated.completedCount,
    totalCount: evaluated.totalCount,
    marketplaceReady: evaluated.marketplaceReady,
  };
}

export type CompletenessCheckStatus = "completed" | "pending" | "missing";

export function completenessItemStatus(
  item: CompletenessItem,
  profile: ProfileCompletenessInput,
): CompletenessCheckStatus {
  if (item.done) return "completed";
  if (item.id === "bio") {
    const words = getWordCount(profile.bio ?? "");
    if (words > 0 && words < PROFILE_COMPLETENESS_BIO_MIN_WORDS) return "pending";
  }
  return "missing";
}
