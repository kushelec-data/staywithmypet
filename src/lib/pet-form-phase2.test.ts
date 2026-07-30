import { describe, expect, it, vi } from "vitest";
import { emptyForm } from "@/lib/pet-form-test-utils";
import { mapPetRecordToFormInput } from "@/lib/pet-form-mapper";
import {
  evaluatePetFormCategories,
  getPetFormCompleteNextTarget,
  petFormSliceFromFormState,
} from "@/lib/pet-form-completion";
import {
  applyProfileLocationToPetFormIfEmpty,
  prefillDisplayNameIfEmpty,
  prefillLanguagesIfEmpty,
  profileLocationToPetFormFields,
} from "@/lib/pet-form-prefill";
import {
  isSinglePetMarketplaceReady,
  validatePetProfileFormSlice,
} from "@/lib/profile-required-fields";
import type { PetIntroDisplay } from "@/lib/pet-intro";
import type { ProfileRow } from "@/lib/profile-utils";

function marketplaceReadyPet(overrides: Partial<PetIntroDisplay> = {}): PetIntroDisplay {
  return {
    id: "pet-1",
    name: "Buddy",
    species: "dog",
    ageLabel: "2 years",
    sizeLabel: "5_10_kg",
    primaryPhotoUrl: "https://example.com/p.jpg",
    photoUrls: ["https://example.com/p.jpg"],
    hasPersonality: true,
    careTypes: ["walks"],
    availabilityDates: ["2026-08-01"],
    careDatesSummary: null,
    ...overrides,
  } as PetIntroDisplay;
}

describe("pet form phase 2 — defaults", () => {
  it("does not silently default sex, size or energy to real values", () => {
    const form = emptyForm();
    expect(form.gender).toBe("");
    expect(form.size).toBe("");
    expect(form.energyLevel).toBe("");
    expect(form.requiresMedication).toBeNull();
    expect(form.walkNeeds).toBe("");
    expect(form.careLocation).toBe("");
  });

  it("does not treat empty energy as satisfying personality validation", () => {
    const issues = validatePetProfileFormSlice({
      name: "Luna",
      speciesForm: "dog",
      dateOfBirthDisplay: "01.01.2020",
      size: "5_10_kg",
      temperament: [],
      positiveTraits: "",
      challengingTraits: "",
      additionalNotes: "",
      energyLevel: "",
      careTypes: ["walks"],
      availabilityDates: ["2026-08-01"],
      availabilityNotes: "",
      hasPhoto: true,
    });
    expect(issues.some((issue) => issue.id === "pet_personality")).toBe(true);
  });
});

describe("pet form phase 2 — edit loading", () => {
  it("loads existing saved dog values correctly", () => {
    const mapped = mapPetRecordToFormInput({
      name: "Denny",
      species: "dog",
      species_form: "dog",
      breed: "labrador",
      date_of_birth: "2020-01-15",
      gender: "Female",
      size_label: "10_15_kg",
      energy_level: "High",
      temperament: ["Friendly"],
      requires_medication: true,
      walk_needs: "2x per day",
      care_location: "At pet owner's home",
      care_type: ["Daycare"],
      availability_dates: ["2026-08-01"],
      location: "Tallinn",
      address: "Tallinn",
    });

    expect(mapped.name).toBe("Denny");
    expect(mapped.gender).toBe("Female");
    expect(mapped.size).toBe("10_15_kg");
    expect(mapped.energyLevel).toBe("High");
    expect(mapped.requiresMedication).toBe(true);
    expect(mapped.walkNeeds).toBe("2x per day");
    expect(mapped.careLocation).toBe("At pet owner's home");
    expect(mapped.careTypes).toEqual(["Daycare"]);
  });
});

describe("pet form phase 2 — basic save", () => {
  it("can validate save without optional advanced sections filled", () => {
    const slice = petFormSliceFromFormState({
      name: "Luna",
      speciesForm: "dog",
      dateOfBirthDisplay: "01.01.2020",
      size: "5_10_kg",
      temperament: ["Friendly"],
      positiveTraits: "",
      challengingTraits: "",
      additionalNotes: "",
      energyLevel: "",
      careTypes: ["walks"],
      availabilityDates: ["2026-08-01"],
      availabilityNotes: "",
      hasPhoto: true,
      healthCharacteristics: "",
      requiresMedication: null,
      feedingSchedule: "",
      eatingHabits: "",
      walkNeeds: "",
      friendRequirements: [],
      careLocation: "",
    });

    expect(validatePetProfileFormSlice(slice)).toEqual([]);
  });
});

describe("pet form phase 2 — marketplace validation unchanged", () => {
  it("keeps marketplace readiness rules the same", () => {
    expect(isSinglePetMarketplaceReady(marketplaceReadyPet())).toBe(true);
    expect(
      isSinglePetMarketplaceReady(
        marketplaceReadyPet({ careTypes: [], hasPersonality: true }),
      ),
    ).toBe(false);
    expect(
      isSinglePetMarketplaceReady(
        marketplaceReadyPet({ hasPersonality: false }),
      ),
    ).toBe(false);
  });
});

describe("pet form phase 2 — collapsible values", () => {
  it("preserves advanced field values in completion input", () => {
    const slice = petFormSliceFromFormState({
      name: "Luna",
      speciesForm: "dog",
      dateOfBirthDisplay: "01.01.2020",
      size: "5_10_kg",
      temperament: ["Friendly"],
      positiveTraits: "Sweet",
      challengingTraits: "Barks at mail",
      additionalNotes: "Loves cheese",
      energyLevel: "High",
      careTypes: ["walks"],
      availabilityDates: ["2026-08-01"],
      availabilityNotes: "Flexible",
      hasPhoto: true,
      healthCharacteristics: "Allergic to chicken",
      requiresMedication: false,
      feedingSchedule: "Twice daily",
      eatingHabits: "Slow eater",
      walkNeeds: "2x per day",
      friendRequirements: ["Non-smoker"],
      careLocation: "Either / flexible",
    });

    expect(slice.challengingTraits).toBe("Barks at mail");
    expect(slice.healthCharacteristics).toBe("Allergic to chicken");
    expect(slice.walkNeeds).toBe("2x per day");
  });
});

describe("pet form phase 2 — category completion", () => {
  it("maps existing validation results into categories", () => {
    const categories = evaluatePetFormCategories(
      petFormSliceFromFormState({
        name: "",
        speciesForm: "dog",
        dateOfBirthDisplay: "",
        size: "",
        temperament: [],
        positiveTraits: "",
        challengingTraits: "",
        additionalNotes: "",
        energyLevel: "",
        careTypes: [],
        availabilityDates: [],
        availabilityNotes: "",
        hasPhoto: false,
      }),
    );

    expect(categories.find((c) => c.id === "basic")?.status).toBe("required_missing");
    expect(categories.find((c) => c.id === "photos")?.status).toBe("required_missing");
    expect(categories.find((c) => c.id === "health")?.status).toBe("optional_remaining");
  });

  it("complete next targets the first missing required category", () => {
    const target = getPetFormCompleteNextTarget(
      petFormSliceFromFormState({
        name: "Luna",
        speciesForm: "dog",
        dateOfBirthDisplay: "01.01.2020",
        size: "",
        temperament: ["Friendly"],
        positiveTraits: "",
        challengingTraits: "",
        additionalNotes: "",
        energyLevel: "",
        careTypes: ["walks"],
        availabilityDates: ["2026-08-01"],
        availabilityNotes: "",
        hasPhoto: true,
      }),
    );

    expect(target?.categoryId).toBe("basic");
    expect(target?.focusId).toBe("size");
  });
});

describe("pet form phase 2 — prefill", () => {
  const user = {
    email: "alex@example.com",
    user_metadata: { full_name: "Auth Name" },
  } as Parameters<typeof prefillDisplayNameIfEmpty>[0];

  const profile = {
    display_name: "Saved Name",
    languages: ["en", "et"],
    location: "Tallinn",
    public_location: "Tallinn, EE",
    city: "Tallinn",
    country: "EE",
    google_place_id: "place-1",
    latitude: 59.4,
    longitude: 24.7,
  } as ProfileRow;

  it("prefills only when fields are empty", () => {
    expect(prefillDisplayNameIfEmpty("", user, null)).toBe("Auth Name");
    expect(prefillLanguagesIfEmpty([], profile)).toEqual(["en", "et"]);
  });

  it("never overwrites existing values", () => {
    expect(prefillDisplayNameIfEmpty("Custom", user, null)).toBe("Custom");
    expect(prefillLanguagesIfEmpty(["fi"], profile)).toEqual(["fi"]);
  });

  it("applies profile location to pet form only when pet location is empty", () => {
    const petForm = emptyForm();
    const next = applyProfileLocationToPetFormIfEmpty(petForm, profile);
    expect(next.location).toBeTruthy();
    expect(next.address).toBeTruthy();

    const withLocation = { ...petForm, location: "Kept", address: "Kept" };
    expect(applyProfileLocationToPetFormIfEmpty(withLocation, profile).location).toBe("Kept");
  });

  it("maps profile location fields for explicit user action", () => {
    const mapped = profileLocationToPetFormFields(profile);
    expect(mapped.location).toBeTruthy();
    expect(mapped.latitude).toBe(59.4);
  });
});

describe("pet form phase 2 — mobile layout helpers", () => {
  it("uses full-width and wrapping-friendly classes in pet form components", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const newPetForm = readFileSync(join(process.cwd(), "src/components/pets/NewPetForm.tsx"), "utf8");
    const phoneFields = readFileSync(
      join(process.cwd(), "src/components/profile/PhoneCountryFields.tsx"),
      "utf8",
    );

    expect(newPetForm).toContain("pb-24");
    expect(newPetForm).toContain("w-full");
    expect(phoneFields).toContain("flex-col");
    expect(phoneFields).toContain("sm:flex-row");
  });
});

describe("pet form phase 2 — i18n", () => {
  it("includes required placeholder translations", async () => {
    const { en } = await import("@/i18n/en");
    const { et } = await import("@/i18n/et");
    expect(en.petFormPhase2.selectSex).toBe("Select sex");
    expect(en.petFormPhase2.selectSize).toBe("Select size");
    expect(en.petFormPhase2.selectEnergyLevel).toBe("Select energy level");
    expect(et.petFormPhase2.selectSex).toBe("Vali sugu");
    expect(et.petFormPhase2.selectSize).toBe("Vali suurus");
    expect(et.petFormPhase2.selectEnergyLevel).toBe("Vali energiatase");
  });
});

describe("focus helper safety", () => {
  it("does not throw when complete-next focus target is absent", () => {
    expect(() =>
      getPetFormCompleteNextTarget(
        petFormSliceFromFormState({
          name: "",
          speciesForm: "dog",
          dateOfBirthDisplay: "",
          size: "",
          temperament: [],
          positiveTraits: "",
          challengingTraits: "",
          additionalNotes: "",
          energyLevel: "",
          careTypes: [],
          availabilityDates: [],
          availabilityNotes: "",
          hasPhoto: false,
        }),
      ),
    ).not.toThrow();
  });
});
