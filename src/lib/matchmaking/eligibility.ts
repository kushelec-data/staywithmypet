import {
  isPetFriendFindCareListingEligible,
  type PetFriendFindCareListingInput,
} from "@/lib/profile-required-fields";
import {
  isPetMarketplaceMinimumEligible,
  isPetParentProfileMarketplaceMinimumEligible,
} from "@/lib/profile-marketplace-eligibility";
import type { ProfileRole } from "@/lib/profile-setup";

export type MatchFriendCandidate = PetFriendFindCareListingInput & {
  id: string;
};

export type MatchPetCandidate = {
  id: string;
  ownerId: string;
  name: string | null;
  species: string | null;
  is_public?: boolean | null;
  is_active?: boolean | null;
};

export type MatchOwnerCandidate = {
  id: string;
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

export function isEligibleMatchFriend(
  friend: MatchFriendCandidate,
  petFriendMembershipIds: Set<string>,
): boolean {
  if (!petFriendMembershipIds.has(friend.id)) return false;
  return isPetFriendFindCareListingEligible(friend);
}

export function isEligibleMatchPet(
  pet: MatchPetCandidate,
  owner: MatchOwnerCandidate | null,
  petParentMembershipIds: Set<string>,
): boolean {
  if (!owner) return false;
  if (owner.is_public === false) return false;
  if (!petParentMembershipIds.has(owner.id)) return false;
  if (
    !isPetParentProfileMarketplaceMinimumEligible({
      display_name: owner.display_name,
      bio: owner.bio,
      location: owner.location,
      public_location: owner.public_location,
      city: owner.city,
      country: owner.country,
      google_place_id: owner.google_place_id,
      latitude: owner.latitude,
      longitude: owner.longitude,
      is_public: owner.is_public,
      role: owner.role,
    })
  ) {
    return false;
  }
  return isPetMarketplaceMinimumEligible({
    name: pet.name,
    species: pet.species,
    is_public: pet.is_public,
    is_active: pet.is_active,
  });
}

export function isStoredMatchStillVisible(input: {
  friendIsPublic: boolean | null | undefined;
  ownerIsPublic: boolean | null | undefined;
  petIsPublic: boolean | null | undefined;
  petIsActive: boolean | null | undefined;
}): boolean {
  if (input.friendIsPublic === false) return false;
  if (input.ownerIsPublic === false) return false;
  if (input.petIsPublic === false) return false;
  if (input.petIsActive === false) return false;
  return true;
}
