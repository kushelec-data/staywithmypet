import type { SearchProfile } from "@/lib/search-profiles";
import {
  friendMatchesAvailability,
  friendMatchesCareTypes,
  friendMatchesExperience,
  friendMatchesHomeSuitability,
  friendMatchesLanguages,
  friendMatchesLocation,
  friendMatchesPetTypes,
  friendMatchesVerified,
} from "@/lib/pet-friend-search-match";

export type PetFriendSearchFilterState = {
  location: string;
  petTypesAccepted: string[];
  careTypesOffered: string[];
  availabilityDates: string[];
  experienceLevels: string[];
  homeSuitability: string[];
  languages: string[];
  verifiedOnly: boolean;
};

export const emptyPetFriendSearchFilters = (): PetFriendSearchFilterState => ({
  location: "",
  petTypesAccepted: [],
  careTypesOffered: [],
  availabilityDates: [],
  experienceLevels: [],
  homeSuitability: [],
  languages: [],
  verifiedOnly: false,
});

export function filterPetFriendSearchProfiles(
  profiles: SearchProfile[],
  filters: PetFriendSearchFilterState,
): SearchProfile[] {
  return profiles.filter((profile) => {
    if (!friendMatchesLocation(profile, filters.location)) return false;
    if (!friendMatchesPetTypes(profile, filters.petTypesAccepted)) return false;
    if (!friendMatchesCareTypes(profile, filters.careTypesOffered)) return false;
    if (!friendMatchesExperience(profile, filters.experienceLevels)) return false;
    if (!friendMatchesHomeSuitability(profile, filters.homeSuitability)) return false;
    if (!friendMatchesLanguages(profile, filters.languages)) return false;
    if (!friendMatchesVerified(profile, filters.verifiedOnly)) return false;
    if (
      !friendMatchesAvailability(profile, filters.availabilityDates)
    ) {
      return false;
    }
    return true;
  });
}
