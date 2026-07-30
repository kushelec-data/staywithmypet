import { describe, expect, it, vi } from "vitest";
import {
  getProfileEditStepBadge,
  isProfileEditStepComplete,
  missingRequiredFieldsForStep,
  profileEditStepForRequiredField,
  PROFILE_REQUIRED_FIELD_STEP,
} from "@/lib/profile-edit-sections";
import { evaluateProfileRequiredFields } from "@/lib/profile-required-fields";
import { focusRequiredFieldTarget } from "@/lib/form-field-focus";
import { resolveProfileDisplayName } from "@/lib/profile-display-name";
import type { ProfileRow } from "@/lib/profile-utils";
import type { PetIntroDisplay } from "@/lib/pet-intro";
import { isBioWordCountValid, getWordCount } from "@/lib/bio-words";

function baseProfile(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: "user-1",
    display_name: "Alex",
    avatar_url: "https://example.com/a.jpg",
    bio: "word ".repeat(25),
    location: "Tallinn",
    public_location: "Tallinn",
    city: "Tallinn",
    country: "EE",
    google_place_id: "place",
    latitude: 59.4,
    longitude: 24.7,
    languages: ["en"],
    role: "pet_parent",
    active_mode: "pet_parent",
    details: {},
    phone: null,
    phone_e164: null,
    ...overrides,
  } as ProfileRow;
}

function marketplaceReadyPet(overrides: Partial<PetIntroDisplay> = {}): PetIntroDisplay {
  return {
    id: "pet-1",
    name: "Buddy",
    species: "dog",
    ageLabel: "2 years",
    sizeLabel: "Medium",
    primaryPhotoUrl: "https://example.com/p.jpg",
    photoUrls: ["https://example.com/p.jpg"],
    hasPersonality: true,
    careTypes: ["walks"],
    availabilityDates: ["2026-08-01"],
    careDatesSummary: null,
    ...overrides,
  } as PetIntroDisplay;
}

describe("profile edit completion — shared required-field source", () => {
  it("shows petParent step incomplete when one required pet field is missing", () => {
    const profile = baseProfile();
    const petIntros = [marketplaceReadyPet({ primaryPhotoUrl: null, photoUrls: [] })];
    const result = evaluateProfileRequiredFields({ profile, petIntros });

    expect(result.totalCount).toBeGreaterThan(0);
    expect(result.completedCount).toBeLessThan(result.totalCount);
    expect(result.missing.some((field) => field.id === "pet_photo")).toBe(true);
    expect(isProfileEditStepComplete("basic", result, profile)).toBe(true);
    expect(getProfileEditStepBadge("petParent", result, profile)).toEqual({
      kind: "required_missing",
      count: expect.any(Number),
    });
    expect(
      (getProfileEditStepBadge("petParent", result, profile) as { count: number }).count,
    ).toBeGreaterThan(0);
  });

  it("marks all wizard steps complete only when banner is fully complete", () => {
    const profile = baseProfile({ phone_e164: "+37255555555" });
    const petIntros = [marketplaceReadyPet()];
    const result = evaluateProfileRequiredFields({ profile, petIntros });

    expect(result.completedCount).toBe(result.totalCount);
    expect(isProfileEditStepComplete("basic", result, profile)).toBe(true);
    expect(isProfileEditStepComplete("petParent", result, profile)).toBe(true);
    expect(getProfileEditStepBadge("trust", result, profile).kind).toBe("complete");
  });

  it("keeps basic step incomplete when languages are missing", () => {
    const profile = baseProfile({ languages: [] });
    const result = evaluateProfileRequiredFields({ profile, petIntros: [marketplaceReadyPet()] });

    expect(missingRequiredFieldsForStep(result, "basic").map((f) => f.id)).toContain("languages");
    expect(getProfileEditStepBadge("basic", result, profile)).toEqual({
      kind: "required_missing",
      count: 1,
    });
  });

  it("keeps bio incomplete below the required word threshold", () => {
    const shortBio = "too short bio";
    expect(isBioWordCountValid(getWordCount(shortBio))).toBe(false);
    const profile = baseProfile({ bio: shortBio });
    const result = evaluateProfileRequiredFields({ profile, petIntros: [marketplaceReadyPet()] });

    expect(missingRequiredFieldsForStep(result, "basic").map((f) => f.id)).toContain("bio");
  });

  it("maps every required field id to a wizard step", () => {
    for (const result of evaluateProfileRequiredFields({
      profile: baseProfile({ role: "pet_friend", active_mode: "pet_friend" }),
    }).fields) {
      expect(PROFILE_REQUIRED_FIELD_STEP[result.id]).toBeTruthy();
      expect(profileEditStepForRequiredField(result.id)).toBe(
        PROFILE_REQUIRED_FIELD_STEP[result.id],
      );
    }
  });
});

describe("focusRequiredFieldTarget", () => {
  it("navigates via href for external requirements", () => {
    const onNavigate = vi.fn();
    const ok = focusRequiredFieldTarget({ href: "/pets/new" }, { onNavigate });
    expect(ok).toBe(true);
    expect(onNavigate).toHaveBeenCalledWith("/pets/new");
  });

  it("does not throw when focus target is absent (mobile-safe fallback)", () => {
    expect(() =>
      focusRequiredFieldTarget({ focusId: "missing-element-id" }),
    ).not.toThrow();
  });
});

describe("display name prefill", () => {
  it("does not overwrite an existing saved display name", () => {
    const user = {
      email: "alex@example.com",
      user_metadata: { full_name: "Auth Name" },
    } as Parameters<typeof resolveProfileDisplayName>[0];

    expect(resolveProfileDisplayName(user, "Saved Name")).toBe("Saved Name");
  });

  it("prefills from auth only when profile display name is empty", () => {
    const user = {
      email: "alex@example.com",
      user_metadata: { full_name: "Auth Name" },
    } as Parameters<typeof resolveProfileDisplayName>[0];

    expect(resolveProfileDisplayName(user, null)).toBe("Auth Name");
  });
});

describe("ProfileRequiredFieldsBanner copy keys", () => {
  it("uses singular and plural missing-item i18n keys", async () => {
    const { en } = await import("@/i18n/en");
    expect(en.profileRequiredFields.missingOne).toContain("1");
    expect(en.profileRequiredFields.missingMany).toContain("{count}");
    expect(en.profileRequiredFields.completeNow).toBe("Complete now");
    expect(en.profileRequiredFields.items.languages).toBeTruthy();
  });
});

describe("pet friend mode", () => {
  it("derives friend step badges from the same required-field result", () => {
    const profile = baseProfile({
      role: "pet_friend",
      active_mode: "pet_friend",
      details: {},
    });
    const result = evaluateProfileRequiredFields({ profile });

    expect(getProfileEditStepBadge("petFriend", result, profile).kind).toBe("required_missing");
    expect(getProfileEditStepBadge("availability", result, profile).kind).toBe("required_missing");
  });
});

describe("profile edit wiring", () => {
  it("uses evaluateProfileRequiredFields for banner and step badges in ProfileEditForm", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const formSource = readFileSync(
      join(process.cwd(), "src/components/profile/ProfileEditForm.tsx"),
      "utf8",
    );
    const bannerSource = readFileSync(
      join(process.cwd(), "src/components/profile/ProfileRequiredFieldsBanner.tsx"),
      "utf8",
    );

    expect(formSource).toContain("evaluateProfileRequiredFields");
    expect(formSource).toContain("getProfileEditStepBadge");
    expect(formSource).toContain("onCompleteNow={handleCompleteNow}");
    expect(formSource).toContain("navigateToMissingField");
    expect(bannerSource).toContain("copy.items[field.labelKey]");
    expect(bannerSource).toContain("copy.completeNow");
  });
});
