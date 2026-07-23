import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isPetFriendMarketplaceMinimumEligible,
  isPetMarketplaceMinimumEligible,
} from "@/lib/profile-marketplace-eligibility";

describe("marketplace search visibility without membership", () => {
  it("fetchPublicSearchPets does not apply pet parent membership filter", () => {
    const file = readFileSync(
      join(process.cwd(), "src/lib/public-pet-search.ts"),
      "utf8",
    );
    expect(file).not.toMatch(/filterPetsWhoseOwnerHasActivePetParentMembership/);
    expect(file).not.toMatch(/userHasActiveMembership/);
  });

  it("fetchPetFriendSearchProfiles does not apply pet friend membership filter", () => {
    const file = readFileSync(
      join(process.cwd(), "src/lib/search-profiles.ts"),
      "utf8",
    );
    expect(file).not.toMatch(/filterProfilesWithActivePetFriendMembership/);
  });

  it("fetchPublicSearchPetById does not gate on owner membership", () => {
    const file = readFileSync(
      join(process.cwd(), "src/lib/public-pet-search.ts"),
      "utf8",
    );
    expect(file).not.toContain("userHasActiveMembership");
  });

  it("fetchSavedItems does not apply membership filters", () => {
    const file = readFileSync(join(process.cwd(), "src/lib/favorites.ts"), "utf8");
    expect(file).not.toMatch(/filterPetsWhoseOwnerHasActivePetParentMembership/);
    expect(file).not.toMatch(/filterProfilesWithActivePetFriendMembership/);
  });

  it("public eligible pet passes minimum eligibility without membership context", () => {
    expect(
      isPetMarketplaceMinimumEligible({
        name: "Denny",
        species: "dog",
        is_public: true,
        is_active: true,
      }),
    ).toBe(true);
  });

  it("public eligible pet friend passes minimum eligibility without membership context", () => {
    expect(
      isPetFriendMarketplaceMinimumEligible({
        display_name: "Alex",
        bio: "I love dogs.",
        location: "Tallinn",
        public_location: "Tallinn",
        is_public: true,
        role: "pet_friend",
      }),
    ).toBe(true);
  });

  it("private pet remains hidden via minimum eligibility", () => {
    expect(
      isPetMarketplaceMinimumEligible({
        name: "Denny",
        species: "dog",
        is_public: false,
        is_active: true,
      }),
    ).toBe(false);
  });

  it("inactive pet remains hidden via minimum eligibility", () => {
    expect(
      isPetMarketplaceMinimumEligible({
        name: "Denny",
        species: "dog",
        is_public: true,
        is_active: false,
      }),
    ).toBe(false);
  });

  it("incomplete pet friend remains hidden via minimum eligibility", () => {
    expect(
      isPetFriendMarketplaceMinimumEligible({
        display_name: "Alex",
        bio: "",
        location: "Tallinn",
        is_public: true,
        role: "pet_friend",
      }),
    ).toBe(false);
  });

  it("find care search uses friend profile completeness gate", () => {
    const file = readFileSync(
      join(process.cwd(), "src/lib/search-profiles.ts"),
      "utf8",
    );
    expect(file).toContain("isPetFriendFindCareListingEligible");
    expect(file).not.toMatch(/isListableProfile[\s\S]*isPetFriendMarketplaceMinimumEligible/);
  });
});
