import { describe, expect, it } from "vitest";
import {
  isDiscoverableOnFindCare,
  isPetFriendMarketplaceMinimumEligible,
  isPetParentProfileMarketplaceMinimumEligible,
  isProfileMarketplaceMinimumEligible,
  marketplaceListingRoleForSearch,
  profileMeetsAnyMarketplaceMinimum,
} from "@/lib/profile-marketplace-eligibility";

const legacyFriend = {
  display_name: "Sébastien Langui",
  bio: "I love spending time with dogs and cats in Tallinn.",
  location: "Tallinn, Estonia",
  public_location: "Tallinn, Estonia",
  city: "Tallinn",
  country: "Estonia",
  is_public: true,
  role: "pet_friend" as const,
};

const legacyFriendBoth = {
  ...legacyFriend,
  display_name: "Bret M",
  role: "both" as const,
};

describe("isPetFriendMarketplaceMinimumEligible", () => {
  it("legacy Pet Friend with name + bio + location + is_public appears", () => {
    expect(isPetFriendMarketplaceMinimumEligible(legacyFriend)).toBe(true);
  });

  it("Pet Friend missing language still appears (languages not required for listing)", () => {
    expect(isPetFriendMarketplaceMinimumEligible(legacyFriend)).toBe(true);
  });

  it("Pet Friend missing photo still appears", () => {
    expect(isPetFriendMarketplaceMinimumEligible(legacyFriend)).toBe(true);
  });

  it("role=both appears on Find Care using pet_friend eligibility", () => {
    expect(isDiscoverableOnFindCare(legacyFriendBoth)).toBe(true);
    expect(isPetFriendMarketplaceMinimumEligible(legacyFriendBoth)).toBe(true);
    expect(
      isProfileMarketplaceMinimumEligible(legacyFriendBoth, "pet_friend"),
    ).toBe(true);
  });

  it("is_public=false remains hidden", () => {
    expect(
      isPetFriendMarketplaceMinimumEligible({ ...legacyFriend, is_public: false }),
    ).toBe(false);
  });

  it("profile missing bio remains hidden", () => {
    expect(
      isPetFriendMarketplaceMinimumEligible({ ...legacyFriend, bio: "" }),
    ).toBe(false);
  });

  it("profile missing location remains hidden", () => {
    expect(
      isPetFriendMarketplaceMinimumEligible({
        ...legacyFriend,
        location: "",
        public_location: null,
        city: null,
      }),
    ).toBe(false);
  });

  it("pure pet_parent does not appear on Find Care", () => {
    expect(
      isPetFriendMarketplaceMinimumEligible({
        ...legacyFriend,
        role: "pet_parent",
      }),
    ).toBe(false);
  });
});

describe("marketplaceListingRoleForSearch", () => {
  it("evaluates both users as pet_friend on Find Care", () => {
    expect(marketplaceListingRoleForSearch("both", "find_care")).toBe("pet_friend");
  });

  it("evaluates both users as pet_parent on Find Pets", () => {
    expect(marketplaceListingRoleForSearch("both", "find_pets")).toBe("pet_parent");
  });
});

describe("profileMeetsAnyMarketplaceMinimum", () => {
  it("pet_friend legacy profile meets minimum", () => {
    expect(profileMeetsAnyMarketplaceMinimum(legacyFriend)).toBe(true);
  });
});

describe("isPetParentProfileMarketplaceMinimumEligible", () => {
  it("pet_parent with basics meets parent minimum", () => {
    expect(
      isPetParentProfileMarketplaceMinimumEligible({
        ...legacyFriend,
        display_name: "Parent User",
        role: "pet_parent",
      }),
    ).toBe(true);
  });
});

// Membership filtering is enforced in marketplace-membership.ts (not duplicated here).
// Inactive pet_friend membership remains hidden via filterProfilesWithActivePetFriendMembership.
