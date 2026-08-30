import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isPetFriendFindCareListingEligible } from "@/lib/profile-required-fields";
import {
  isPetFriendMarketplaceMinimumEligible,
  isPetMarketplaceMinimumEligible,
} from "@/lib/profile-marketplace-eligibility";
import { isSavedPetVisible } from "@/lib/saved-items-filter";
import {
  canViewerSeePublicMemberProfile,
  profileVisibilityUpdatePayload,
} from "@/lib/profile-visibility";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

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

describe("owner profile visibility control", () => {
  it("owner toggle payload only sets profiles.is_public", () => {
    expect(profileVisibilityUpdatePayload(false)).toEqual({ is_public: false });
    expect(profileVisibilityUpdatePayload(true)).toEqual({ is_public: true });
  });

  it("hidden profile is blocked for other users on the public route", () => {
    expect(canViewerSeePublicMemberProfile(false, "owner-1", "other-2")).toBe(false);
    expect(canViewerSeePublicMemberProfile(false, "owner-1", null)).toBe(false);
  });

  it("owner can still view a hidden public-profile URL", () => {
    expect(canViewerSeePublicMemberProfile(false, "owner-1", "owner-1")).toBe(true);
  });

  it("owner can explicitly turn the profile ON again", () => {
    expect(canViewerSeePublicMemberProfile(true, "owner-1", "other-2")).toBe(true);
    expect(profileVisibilityUpdatePayload(true).is_public).toBe(true);
  });

  it("hidden profile is excluded from Find Care eligibility", () => {
    const hidden = {
      display_name: "Nora Raimo",
      location: "Tallinn",
      public_location: "Tallinn",
      city: "Tallinn",
      country: "Estonia",
      is_public: false as const,
      role: "pet_friend" as const,
      details: completeFriendDetails,
    };
    expect(isPetFriendFindCareListingEligible(hidden)).toBe(false);
    expect(
      isPetFriendMarketplaceMinimumEligible({
        display_name: "Nora Raimo",
        bio: "I love dogs and have years of experience.",
        location: "Tallinn",
        public_location: "Tallinn",
        is_public: false,
        role: "pet_friend",
      }),
    ).toBe(false);
  });

  it("public pets stop appearing when the owner profile is hidden", () => {
    expect(
      isSavedPetVisible({
        pet: { id: "pet-1", name: "Mimmu" } as never,
        isPublic: true,
        isActive: true,
        species: "dog",
        ownerIsPublic: false,
      }),
    ).toBe(false);
    expect(
      isPetMarketplaceMinimumEligible({
        name: "Mimmu",
        species: "dog",
        is_public: true,
        is_active: true,
      }),
    ).toBe(true);
    const petSearch = readSource("src/lib/public-pet-search.ts");
    expect(petSearch).toContain("if (!owner?.is_public) return null");
  });

  it("pet-level listing toggle is unchanged and separate from profile visibility", () => {
    const petData = readSource("src/lib/pet-data.ts");
    expect(petData).toContain("export async function updatePetListingVisibility");
    expect(petData).toMatch(/\.update\(\{\s*is_public:\s*isPublic\s*\}\)/);
    expect(readSource("src/lib/profile-visibility.ts")).not.toContain("from(\"pets\")");
  });

  it("profile save and mode switch do not write is_public", () => {
    const setup = readSource("src/lib/profile-setup.ts");
    expect(setup).not.toMatch(/is_public:\s*true/);
    expect(setup).not.toMatch(/is_public:\s*false/);
    const modeFn = setup.slice(
      setup.indexOf("export async function saveUserActiveMode"),
      setup.indexOf("export async function saveUserProfile"),
    );
    expect(modeFn).not.toContain("is_public");
  });

  it("ensureUserProfile does not bulk-set is_public on insert or update", () => {
    const source = readSource("src/lib/profile.ts");
    expect(source).not.toContain("is_public");
  });

  it("applyMarketplaceVisibility no longer auto-republishes profiles", () => {
    const source = readSource("src/lib/profile-marketplace-visibility.ts");
    expect(source).not.toMatch(/is_public:\s*true/);
    expect(source).toContain("Never writes profiles.is_public");
  });

  it("profile edit page hosts the visibility control", () => {
    const page = readSource("src/components/profile/ProfileEditPageContent.tsx");
    expect(page).toContain("ProfileVisibilityControl");
    const publicPage = readSource("src/components/profile/PublicProfilePageContent.tsx");
    expect(publicPage).toContain("canViewerSeePublicMemberProfile");
    expect(publicPage).not.toContain("usersShareActiveRequest");
  });

  it("does not add a bulk is_public migration", () => {
    const migrations = readSource("src/lib/profile-visibility.ts");
    expect(migrations).not.toContain("update public.profiles");
  });
});
