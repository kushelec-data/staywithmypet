import type { PetIntroDisplay } from "@/lib/pet-intro";
import { hasSavedProfileLocation } from "@/lib/profile-location";
import type { ProfileActiveMode } from "@/lib/profile-mode";
import type { ProfileRole } from "@/lib/profile-setup";

export type MarketplaceSearchContext = "find_care" | "find_pets";

/** Listing role for a search page — not dashboard `active_mode`. */
export function marketplaceListingRoleForSearch(
  profileRole: ProfileRole,
  search: MarketplaceSearchContext,
): ProfileActiveMode | null {
  if (profileRole === "pet_parent") {
    return search === "find_pets" ? "pet_parent" : null;
  }
  if (profileRole === "pet_friend") {
    return search === "find_care" ? "pet_friend" : null;
  }
  return search === "find_care" ? "pet_friend" : "pet_parent";
}

export type ProfileMarketplaceMinimumInput = {
  display_name: string;
  bio: string | null;
  location: string | null;
  public_location?: string | null;
  city?: string | null;
  country?: string | null;
  google_place_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_public?: boolean | null;
  role: ProfileRole;
};

function hasMinimumLocation(
  profile: ProfileMarketplaceMinimumInput,
): boolean {
  return hasSavedProfileLocation({
    location: profile.location,
    public_location: profile.public_location ?? null,
    city: profile.city ?? null,
    country: profile.country ?? null,
    google_place_id: profile.google_place_id ?? null,
    latitude: profile.latitude ?? null,
    longitude: profile.longitude ?? null,
  });
}

/** Pet Friends discoverable on /find-care (not pure Pet Parents). */
export function isDiscoverableOnFindCare(profile: { role: ProfileRole }): boolean {
  return profile.role === "pet_friend" || profile.role === "both";
}

/** Minimum fields for a Pet Friend to appear on Find Care (before membership filter). */
export function isPetFriendMarketplaceMinimumEligible(
  profile: ProfileMarketplaceMinimumInput,
): boolean {
  if (profile.is_public === false) return false;
  if (!isDiscoverableOnFindCare(profile)) return false;
  if (!profile.display_name?.trim()) return false;
  if (!profile.bio?.trim()) return false;
  return hasMinimumLocation(profile);
}

/** Minimum fields for a Pet Parent profile supporting Find Pets listings. */
export function isPetParentProfileMarketplaceMinimumEligible(
  profile: ProfileMarketplaceMinimumInput,
): boolean {
  if (profile.is_public === false) return false;
  if (profile.role === "pet_friend") return false;
  if (!profile.display_name?.trim()) return false;
  if (!profile.bio?.trim()) return false;
  return hasMinimumLocation(profile);
}

export function isProfileMarketplaceMinimumEligible(
  profile: ProfileMarketplaceMinimumInput,
  listingRole: ProfileActiveMode,
): boolean {
  return listingRole === "pet_friend"
    ? isPetFriendMarketplaceMinimumEligible(profile)
    : isPetParentProfileMarketplaceMinimumEligible(profile);
}

/** True when the profile meets minimum eligibility for at least one marketplace side. */
export function profileMeetsAnyMarketplaceMinimum(
  profile: ProfileMarketplaceMinimumInput,
): boolean {
  const friendOk = isPetFriendMarketplaceMinimumEligible(profile);
  const parentOk = isPetParentProfileMarketplaceMinimumEligible(profile);
  if (profile.role === "pet_friend") return friendOk;
  if (profile.role === "pet_parent") return parentOk;
  return friendOk || parentOk;
}

export type PetMarketplaceMinimumInput = {
  name: string | null;
  species?: string | null;
  is_public?: boolean | null;
  is_active?: boolean | null;
};

/** Minimum pet identity for a public pet card (name + species). */
export function isPetMarketplaceMinimumEligible(pet: PetMarketplaceMinimumInput): boolean {
  if (pet.is_public === false) return false;
  if (pet.is_active === false) return false;
  const name = pet.name?.trim();
  if (!name || name === "Pet") return false;
  return Boolean(pet.species?.trim());
}

export function isPetIntroMarketplaceMinimumEligible(pet: PetIntroDisplay): boolean {
  return isPetMarketplaceMinimumEligible({
    name: pet.name,
    species: pet.species,
    is_active: pet.isActive !== false,
  });
}
