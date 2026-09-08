import { describe, expect, it } from "vitest";
import {
  matchesCareLocationPreferenceFilter,
  normalizeCareLocationPreference,
  parseCareLocationQuery,
} from "@/lib/care-location-preference";
import { mergePetFriendIntoDetails, petFriendFormFromDetailsRaw } from "@/lib/profile-friend-form";
import { mergePetParentIntoDetails, petParentFormFromDetailsRaw } from "@/lib/profile-parent-form";
import { filterPetFriendSearchProfiles } from "@/lib/pet-friend-search";
import { petMatchesCareLocation, type PetSearchFilterable } from "@/lib/pet-search-match";
import { getTranslations } from "@/i18n/translations";
import { translateProfileHelper, translateProfileLabel } from "@/lib/profile-translations";
import { DEFAULT_PHOTO_POSITION } from "@/lib/photo-position";

function friendProfile(preference: string | null): SearchProfile {
  return {
    id: "p1",
    displayName: "Ada",
    location: "Tallinn",
    mapPosition: null,
    bio: null,
    avatarUrl: null,
    avatarPosition: DEFAULT_PHOTO_POSITION,
    role: "pet_friend",
    activeMode: "pet_friend",
    ratingAvg: 0,
    ratingCount: 0,
    stayCount: 0,
    preferenceChips: [],
    petTypesAccepted: ["dog"],
    careTypesOffered: ["walks"],
    experienceLevel: "experienced",
    livingType: "apartment",
    hasGarden: false,
    hasPetsAtHome: false,
    hasChildren: false,
    languages: ["English"],
    emailVerified: true,
    availabilityDates: [],
    locationHaystack: "tallinn",
    bioHaystack: "",
    careLocationPreference: preference,
  };
}

function petListing(preference: string | null): PetSearchFilterable {
  return {
    species: "dog",
    speciesForm: "dog",
    breed: null,
    sizeLabel: null,
    energyLevel: null,
    temperamentTags: [],
    requiresMedication: null,
    walkNeeds: null,
    careLocation: null,
    ownerCareLocationPreference: preference,
    careTypes: [],
    availabilityDates: [],
    locationArea: "Tallinn",
    ownerLanguages: ["English"],
    ownerEmailVerified: true,
  };
}

describe("care location preference storage", () => {
  it("saves and loads Pet Friend preference without overwriting unrelated details", () => {
    const existing = {
      living_situation: { living_type: "apartment" },
      secret_note: "keep-me",
      pet_care_preferences: {
        available_care_types: ["walks"],
        preferred_care_location: "at_my_home",
      },
    };
    const form = petFriendFormFromDetailsRaw(existing);
    expect(form.preferredCareLocation).toBe("pet_friend_home");
    form.preferredCareLocation = "pet_owner_home";
    const saved = mergePetFriendIntoDetails(existing, form);
    expect(saved.care_location_preference).toBe("pet_owner_home");
    expect(saved.secret_note).toBe("keep-me");
    expect((saved.living_situation as Record<string, unknown>).living_type).toBe("apartment");
    const nested = saved.pet_care_preferences as Record<string, unknown>;
    expect(nested.preferred_care_location).toBe("pet_owner_home");
    expect(nested.available_care_types).toEqual(["walks"]);
    expect(petFriendFormFromDetailsRaw(saved).preferredCareLocation).toBe("pet_owner_home");
  });

  it("saves and loads Pet Parent preference without overwriting unrelated details", () => {
    const existing = {
      pet_parent_profile: { own_pets_summary: "Max the labrador" },
      living_situation: { living_type: "house" },
      extra: 42,
    };
    const form = petParentFormFromDetailsRaw(existing);
    expect(form.careLocationPreference).toBe("");
    expect(form.ownPetsSummary).toBe("Max the labrador");
    form.careLocationPreference = "flexible";
    const saved = mergePetParentIntoDetails(existing, form);
    expect(saved.care_location_preference).toBe("flexible");
    expect(saved.extra).toBe(42);
    expect(saved.living_situation).toEqual({ living_type: "house" });
    const parent = saved.pet_parent_profile as Record<string, unknown>;
    expect(parent.own_pets_summary).toBe("Max the labrador");
    expect(petParentFormFromDetailsRaw(saved).careLocationPreference).toBe("flexible");
  });

  it("does not silently default missing values", () => {
    expect(petFriendFormFromDetailsRaw({}).preferredCareLocation).toBe("");
    expect(petParentFormFromDetailsRaw({}).careLocationPreference).toBe("");
    expect(normalizeCareLocationPreference(null)).toBeNull();
  });
});

describe("care location labels", () => {
  it("uses EN labels", () => {
    expect(translateProfileLabel("Care Location Preference", "en")).toBe("Care Location Preference");
    expect(translateProfileHelper("Choose what suits your lifestyle and space", "en")).toBe(
      "Choose what suits your lifestyle and space",
    );
    expect(translateProfileLabel("At Pet Friend's home", "en")).toBe("At Pet Friend's home");
    expect(translateProfileLabel("At Pet Owner's home", "en")).toBe("At Pet Owner's home");
    expect(translateProfileLabel("Either / Flexible", "en")).toBe("Either / Flexible");
    expect(translateProfileLabel("Care location", "en")).toBe("Care location");
    expect(getTranslations("en").searchFilters.careLocation).toBe("Care location");
  });

  it("uses ET labels", () => {
    expect(translateProfileLabel("Care Location Preference", "et")).toBe(
      "Hoolduse asukoha eelistus",
    );
    expect(translateProfileHelper("Choose what suits your lifestyle and space", "et")).toBe(
      "Vali, mis sobib sinu eluviisi ja võimalustega",
    );
    expect(translateProfileLabel("At Pet Friend's home", "et")).toBe("Loomasõbra juures");
    expect(translateProfileLabel("At Pet Owner's home", "et")).toBe("Loomaomaniku juures");
    expect(translateProfileLabel("Either / Flexible", "et")).toBe("Paindlik / mõlemad sobivad");
    expect(translateProfileLabel("Care location", "et")).toBe("Hoolduse asukoht");
    expect(getTranslations("et").searchFilters.careLocation).toBe("Hoolduse asukoht");
  });
});

describe("care location filters", () => {
  it("pet_friend_home includes flexible and excludes null when active", () => {
    const profiles = [
      friendProfile("pet_friend_home"),
      friendProfile("flexible"),
      friendProfile("pet_owner_home"),
      friendProfile(null),
    ];
    const unfiltered = filterPetFriendSearchProfiles(profiles, {
      location: "",
      petTypesAccepted: [],
      careTypesOffered: [],
      availabilityDates: [],
      experienceLevels: [],
      homeSuitability: [],
      languages: [],
      verifiedOnly: false,
      careLocation: "",
    });
    expect(unfiltered).toHaveLength(4);

    const filtered = filterPetFriendSearchProfiles(profiles, {
      location: "",
      petTypesAccepted: [],
      careTypesOffered: [],
      availabilityDates: [],
      experienceLevels: [],
      homeSuitability: [],
      languages: [],
      verifiedOnly: false,
      careLocation: "pet_friend_home",
    });
    expect(filtered.map((p) => p.careLocationPreference)).toEqual([
      "pet_friend_home",
      "flexible",
    ]);
  });

  it("pet_owner_home includes flexible", () => {
    expect(matchesCareLocationPreferenceFilter("pet_owner_home", "pet_owner_home")).toBe(true);
    expect(matchesCareLocationPreferenceFilter("flexible", "pet_owner_home")).toBe(true);
    expect(matchesCareLocationPreferenceFilter("pet_friend_home", "pet_owner_home")).toBe(false);
    expect(matchesCareLocationPreferenceFilter(null, "pet_owner_home")).toBe(false);
    expect(petMatchesCareLocation(petListing("pet_owner_home"), ["pet_owner_home"])).toBe(true);
    expect(petMatchesCareLocation(petListing("flexible"), ["pet_owner_home"])).toBe(true);
    expect(petMatchesCareLocation(petListing(null), ["pet_owner_home"])).toBe(false);
  });

  it("flexible filter shows flexible only", () => {
    expect(matchesCareLocationPreferenceFilter("flexible", "flexible")).toBe(true);
    expect(matchesCareLocationPreferenceFilter("pet_friend_home", "flexible")).toBe(false);
    expect(matchesCareLocationPreferenceFilter(null, "flexible")).toBe(false);
  });

  it("ignores invalid query params", () => {
    expect(parseCareLocationQuery("not-a-place")).toBe("");
    expect(parseCareLocationQuery("pet_friend_home")).toBe("pet_friend_home");
  });
});
