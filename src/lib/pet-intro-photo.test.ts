import { describe, expect, it } from "vitest";
import { evaluateProfileRequiredFields } from "@/lib/profile-required-fields";
import {
  mapRowToPetIntro,
  normalizePetPhotosJoin,
  petIntroHasDisplayPhoto,
  petIntroMainPhotoUrl,
  type PetIntroDisplay,
} from "@/lib/pet-intro";

function petIntro(overrides: Partial<PetIntroDisplay> = {}): PetIntroDisplay {
  return {
    id: "pet-1",
    name: "Luna",
    species: "dog",
    breed: null,
    speciesLabel: "Dog",
    ageLabel: "2 years",
    sizeLabel: "under_5_kg",
    weightDisplayShort: "Under 5 kg",
    locationArea: "Tallinn",
    careDatesSummary: null,
    availabilityDates: ["2026-08-01"],
    careTypes: ["Daycare"],
    compactLines: [],
    careSummary: "",
    primaryPhotoUrl: null,
    primaryPhotoPosition: { x: 50, y: 50, scale: 1 },
    photoPositions: {},
    photoUrls: [],
    isActive: true,
    hasPersonality: true,
    ...overrides,
  };
}

describe("petIntroMainPhotoUrl", () => {
  it("matches PetIntroCard resolution order (primary, then first non-empty url)", () => {
    expect(
      petIntroMainPhotoUrl({
        primaryPhotoUrl: "https://cdn.example/primary.jpg",
        photoUrls: ["https://cdn.example/other.jpg"],
      }),
    ).toBe("https://cdn.example/primary.jpg");

    expect(
      petIntroMainPhotoUrl({
        primaryPhotoUrl: null,
        photoUrls: ["https://cdn.example/only.jpg"],
      }),
    ).toBe("https://cdn.example/only.jpg");
  });

  it("ignores blank primaryPhotoUrl and uses first valid photoUrls entry", () => {
    expect(
      petIntroMainPhotoUrl({
        primaryPhotoUrl: "   ",
        photoUrls: ["https://cdn.example/fallback.jpg"],
      }),
    ).toBe("https://cdn.example/fallback.jpg");
  });

  it("returns empty string when no renderable photo exists", () => {
    expect(
      petIntroHasDisplayPhoto({
        primaryPhotoUrl: null,
        photoUrls: [],
      }),
    ).toBe(false);
  });
});

describe("normalizePetPhotosJoin", () => {
  it("accepts a single embedded pet_photos row", () => {
    const rows = normalizePetPhotosJoin({
      public_url: "https://cdn.example/luna.jpg",
      is_primary: true,
      sort_order: 0,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.public_url).toBe("https://cdn.example/luna.jpg");
  });
});

describe("mapRowToPetIntro photo mapping", () => {
  it("maps a single embedded photo row into primaryPhotoUrl", () => {
    const intro = mapRowToPetIntro({
      id: "pet-luna",
      name: "Luna",
      species: "dog",
      is_active: true,
      pet_photos: {
        public_url: "https://cdn.example/luna.jpg",
        is_primary: true,
        sort_order: 0,
      },
    });

    expect(petIntroMainPhotoUrl(intro)).toBe("https://cdn.example/luna.jpg");
    expect(petIntroHasDisplayPhoto(intro)).toBe(true);
  });
});

describe("pet_photo required field", () => {
  it("is satisfied when a pet has a displayable photo", () => {
    const profile = {
      display_name: "Alex",
      avatar_url: "https://cdn.example/me.jpg",
      bio: "word ".repeat(25),
      location: "Tallinn",
      languages: ["en"],
      role: "pet_parent" as const,
      active_mode: "pet_parent" as const,
      details: {},
    };

    const result = evaluateProfileRequiredFields({
      profile,
      petIntros: [
        petIntro({
          primaryPhotoUrl: "https://cdn.example/luna.jpg",
          photoUrls: ["https://cdn.example/luna.jpg"],
        }),
      ],
    });

    expect(result.fields.find((field) => field.id === "pet_photo")?.done).toBe(true);
    expect(result.missing.some((field) => field.id === "pet_photo")).toBe(false);
  });

  it("stays incomplete when photoUrls is empty and only a placeholder would show", () => {
    const profile = {
      display_name: "Alex",
      avatar_url: "https://cdn.example/me.jpg",
      bio: "word ".repeat(25),
      location: "Tallinn",
      languages: ["en"],
      role: "pet_parent" as const,
      active_mode: "pet_parent" as const,
      details: {},
    };

    const result = evaluateProfileRequiredFields({
      profile,
      petIntros: [petIntro({ primaryPhotoUrl: null, photoUrls: [] })],
    });

    expect(result.fields.find((field) => field.id === "pet_photo")?.done).toBe(false);
    expect(result.missing.some((field) => field.id === "pet_photo")).toBe(true);
  });

  it("does not treat profile avatar_url as pet photo", () => {
    const profile = {
      display_name: "Alex",
      avatar_url: "https://cdn.example/profile-avatar.jpg",
      bio: "word ".repeat(25),
      location: "Tallinn",
      languages: ["en"],
      role: "pet_parent" as const,
      active_mode: "pet_parent" as const,
      details: {},
    };

    const result = evaluateProfileRequiredFields({
      profile,
      petIntros: [petIntro({ primaryPhotoUrl: null, photoUrls: [] })],
    });

    expect(result.fields.find((field) => field.id === "profile_photo")?.done).toBe(true);
    expect(result.fields.find((field) => field.id === "pet_photo")?.done).toBe(false);
  });
});
