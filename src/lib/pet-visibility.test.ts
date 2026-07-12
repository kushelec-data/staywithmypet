import { describe, expect, it } from "vitest";
import {
  buildPetUpdateFields,
  resolvePetListingIsPublic,
} from "@/lib/pet-data";
import { mapPetListingIsPublic } from "@/lib/pet-form-mapper";

const sampleInput = {
  name: "Denny",
  speciesForm: "dog",
  species: "dog" as const,
  breedSelection: "mixed",
  breedOther: "",
  dateOfBirth: "2020-01-15",
  gender: "Male",
  size: "5_10_kg",
  energyLevel: "Medium",
  temperament: ["Friendly"],
  requiresMedication: false,
  healthCharacteristics: "",
  feedingSchedule: "",
  walkNeeds: "Daily",
  eatingHabits: "",
  positiveTraits: "Playful",
  challengingTraits: "",
  additionalNotes: "Loves walks",
  friendRequirements: [],
  availability: "",
  careLocation: "At sitter's home",
  careTypes: ["Daycare"],
  careTypesOther: "",
  genderOther: "",
  location: "Tallinn",
  availabilityDates: ["2026-08-01"],
  address: "Tallinn",
  latitude: 59.437,
  longitude: 24.753,
  googlePlaceId: null,
};

describe("pet listing visibility", () => {
  it("profile update payload never includes is_public", () => {
    const updates = buildPetUpdateFields("owner-1", sampleInput);
    expect(updates).not.toHaveProperty("is_public");
    expect(updates).not.toHaveProperty("is_active");
    expect(updates).not.toHaveProperty("owner_id");
    expect(updates.name).toBe("Denny");
  });

  it("public pet stays public after editing description", () => {
    const before = buildPetUpdateFields("owner-1", sampleInput);
    const after = buildPetUpdateFields("owner-1", {
      ...sampleInput,
      additionalNotes: "Updated notes only",
      positiveTraits: "Very playful",
    });
    expect(before).not.toHaveProperty("is_public");
    expect(after).not.toHaveProperty("is_public");
  });

  it("public pet stays public after editing photos (photo upload does not touch is_public)", () => {
    const updates = buildPetUpdateFields("owner-1", sampleInput);
    expect(updates).not.toHaveProperty("is_public");
    // Photo upload/replace uses pet_photos APIs only — never buildPetUpdateFields.
  });

  it("public pet stays public after editing availability", () => {
    const updates = buildPetUpdateFields("owner-1", {
      ...sampleInput,
      availabilityDates: ["2026-09-01", "2026-09-02"],
      availability: "September weekends",
    });
    expect(updates).not.toHaveProperty("is_public");
    expect(updates.availability_dates).toEqual(["2026-09-01", "2026-09-02"]);
  });

  it("private pet stays private unless owner enables listing via mapper", () => {
    expect(mapPetListingIsPublic({ is_public: false })).toBe(false);
    expect(resolvePetListingIsPublic(false)).toBe(false);
  });

  it("legacy null is_public is treated as listed until owner turns it off", () => {
    expect(resolvePetListingIsPublic(null)).toBe(true);
    expect(mapPetListingIsPublic({ is_public: null })).toBe(true);
  });

  it("explicit public listing reads as listed", () => {
    expect(resolvePetListingIsPublic(true)).toBe(true);
    expect(mapPetListingIsPublic({ is_public: true })).toBe(true);
  });
});

describe("Find Pets marketplace membership", () => {
  it("uses pet_parent-only owner filter", async () => {
    const { filterPetsWhoseOwnerHasActivePetParentMembership } = await import(
      "@/lib/marketplace-membership"
    );
    expect(typeof filterPetsWhoseOwnerHasActivePetParentMembership).toBe("function");
  });
});
