import {
  isPetFriendMarketplaceMinimumEligible,
  isPetMarketplaceMinimumEligible,
} from "@/lib/profile-marketplace-eligibility";
import type { ProfileRole } from "@/lib/profile-setup";
import type { Pet } from "@/lib/pets";
import type { SearchProfile } from "@/lib/search-profiles";

export type SavedPetRowInput = {
  pet: Pet;
  isPublic: boolean | null;
  isActive: boolean | null;
  species: string | null;
  ownerIsPublic: boolean | null;
};

export type SavedFriendRowInput = {
  profile: SearchProfile;
  display_name: string;
  bio: string | null;
  location: string | null;
  public_location?: string | null;
  city?: string | null;
  country?: string | null;
  google_place_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_public: boolean | null;
  role: ProfileRole;
};

export function isSavedPetVisible(row: SavedPetRowInput): boolean {
  if (row.ownerIsPublic === false) return false;
  return isPetMarketplaceMinimumEligible({
    name: row.pet.name,
    species: row.species,
    is_public: row.isPublic,
    is_active: row.isActive,
  });
}

export function isSavedFriendVisible(row: SavedFriendRowInput): boolean {
  return isPetFriendMarketplaceMinimumEligible({
    display_name: row.display_name,
    bio: row.bio,
    location: row.location,
    public_location: row.public_location ?? null,
    city: row.city ?? null,
    country: row.country ?? null,
    google_place_id: row.google_place_id ?? null,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    is_public: row.is_public,
    role: row.role,
  });
}

export function filterVisibleSavedPets(rows: SavedPetRowInput[]): Pet[] {
  return rows.filter(isSavedPetVisible).map((row) => row.pet);
}

export function filterVisibleSavedFriends(rows: SavedFriendRowInput[]): SearchProfile[] {
  return rows.filter(isSavedFriendVisible).map((row) => row.profile);
}
