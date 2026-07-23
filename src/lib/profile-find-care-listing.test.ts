import { describe, expect, it } from "vitest";
import { isPetFriendFindCareListingEligible } from "@/lib/profile-required-fields";

const completeFriendDetails = {
  pet_care_preferences: {
    experience_level: "experienced",
    pet_types_willing_to_care_for: ["dog"],
    preferred_pet_sizes: ["under_5_kg"],
    available_care_types: ["Daycare"],
    preferred_care_location: "flexible",
    willing_seniors: true,
    willing_puppies_kittens: false,
    willing_behavioral_quirks: false,
    willing_special_medical_needs: false,
  },
  living_situation: {
    living_type: "Apartment",
  },
  availability: {
    selected_dates: ["2026-08-01"],
  },
};

const baseProfile = {
  display_name: "Nora Raimo",
  location: "Tallinn",
  public_location: "Tallinn",
  city: "Tallinn",
  country: "Estonia",
  is_public: true,
  role: "pet_friend" as const,
  details: completeFriendDetails,
};

describe("isPetFriendFindCareListingEligible", () => {
  it("accepts complete Pet Friend without membership context", () => {
    expect(isPetFriendFindCareListingEligible(baseProfile)).toBe(true);
  });

  it("accepts complete both-role Pet Friend profile", () => {
    expect(
      isPetFriendFindCareListingEligible({
        ...baseProfile,
        role: "both",
      }),
    ).toBe(true);
  });

  it("rejects incomplete both-role profile with only Pet Parent data", () => {
    expect(
      isPetFriendFindCareListingEligible({
        display_name: "Gerly Kullamaa",
        location: "Haabneeme",
        public_location: "Haabneeme",
        is_public: true,
        role: "both",
        details: {
          pet_parent_profile: {
            preferred_pet_types: ["dog"],
            preferred_care_types: ["Daycare"],
          },
          availability: { selected_dates: [] },
        },
      }),
    ).toBe(false);
  });

  it("rejects pure pet_parent profiles", () => {
    expect(
      isPetFriendFindCareListingEligible({
        ...baseProfile,
        role: "pet_parent",
      }),
    ).toBe(false);
  });

  it("rejects legacy minimum-only profile missing friend sections", () => {
    expect(
      isPetFriendFindCareListingEligible({
        display_name: "Legacy Friend",
        bio: "I love dogs.",
        location: "Tallinn",
        public_location: "Tallinn",
        is_public: true,
        role: "pet_friend",
        details: {},
      }),
    ).toBe(false);
  });
});
