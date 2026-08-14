import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { en } from "@/i18n/en";
import { et } from "@/i18n/et";
import { carePreferenceDisplayGroups } from "@/lib/profile-details";
import { buildLivingSituationSummary } from "@/lib/profile-summaries";
import { translateProfileLabel } from "@/lib/profile-translations";
import type { ProfileDetails } from "@/lib/profile-details";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function details(partial: ProfileDetails): ProfileDetails {
  return partial;
}

describe("Pet Friend profile display translations", () => {
  it("localizes the Pet types heading for Estonian", () => {
    expect(translateProfileLabel("Pet types", "et")).toBe(
      "Milliste lemmikloomade eest oled valmis hoolitsema?",
    );
    expect(translateProfileLabel("Pet types", "en")).toBe("Pet types");
  });

  it("localizes Comfortable with dogs badge copy", () => {
    expect(translateProfileLabel("Comfortable with dogs", "et")).toBe("Koerad sobivad");
    expect(translateProfileLabel("Comfortable with dogs and cats", "et")).toBe(
      "Koerad ja kassid sobivad",
    );
  });

  it("maps rabbit compatibility to Sobivad jänesed", () => {
    const groups = carePreferenceDisplayGroups(
      details({ pet_care_preferences: { pet_types_willing_to_care_for: ["rabbit"] } }),
    );
    expect(groups.petTypes).toContain("Comfortable with rabbit");
    expect(translateProfileLabel("Comfortable with rabbit", "et")).toBe("Sobivad jänesed");
    expect(translateProfileLabel("Comfortable with rabbit", "en")).toBe("Comfortable with rabbit");
  });

  it("maps rodent compatibility to Sobivad närilised", () => {
    const groups = carePreferenceDisplayGroups(
      details({ pet_care_preferences: { pet_types_willing_to_care_for: ["rodent"] } }),
    );
    expect(groups.petTypes).toContain("Comfortable with rodent");
    expect(translateProfileLabel("Comfortable with rodent", "et")).toBe("Sobivad närilised");
    expect(translateProfileLabel("Comfortable with rodent", "en")).toBe("Comfortable with rodent");
  });

  it("maps previously cared for dog to Varem hoidnud koera", () => {
    const groups = carePreferenceDisplayGroups(
      details({ pet_care_preferences: { pet_types_previously_borrowed: ["dog"] } }),
    );
    expect(groups.experience).toContain("Previously cared for dog");
    expect(translateProfileLabel("Previously cared for dog", "et")).toBe("Varem hoidnud koera");
    expect(translateProfileLabel("Previously cared for dog", "en")).toBe("Previously cared for dog");
  });

  it("maps previously cared for cat to Varem hoidnud kassi", () => {
    const groups = carePreferenceDisplayGroups(
      details({ pet_care_preferences: { pet_types_previously_borrowed: ["cat"] } }),
    );
    expect(groups.experience).toContain("Previously cared for cat");
    expect(translateProfileLabel("Previously cared for cat", "et")).toBe("Varem hoidnud kassi");
    expect(translateProfileLabel("Previously cared for cat", "en")).toBe("Previously cared for cat");
  });

  it("shows a descriptive park-nearby statement, not a question", () => {
    const summary = buildLivingSituationSummary(
      details({ living_situation: { nearby_park_access: true } }),
      { publicSafe: true, locale: "et" },
    );
    expect(summary.lines).toContain("Läheduses on park või roheala");
    expect(summary.lines.some((line) => line.includes("?"))).toBe(false);
    expect(translateProfileLabel("Nearby park access", "en")).toBe("Nearby park access");
    expect(translateProfileLabel("Nearby park access?", "et")).toMatch(/\?$/);
  });

  it("shows Kodus pole teisi loomi when pets-at-home is false", () => {
    const summary = buildLivingSituationSummary(
      details({ living_situation: { has_pets_at_home: false } }),
      { publicSafe: true, locale: "et" },
    );
    expect(summary.lines).toContain("Kodus pole teisi loomi");
    expect(translateProfileLabel("No pets at home", "en")).toBe("No pets at home");
  });

  it("shows a positive pets-at-home statement when the saved value is true", () => {
    const summary = buildLivingSituationSummary(
      details({ living_situation: { has_pets_at_home: true } }),
      { publicSafe: true, locale: "et" },
    );
    expect(summary.lines).toContain("Kodus on teisi loomi");
    expect(summary.lines).not.toContain("Kodus pole teisi loomi");
  });

  it("translates the private-contact notice in Estonian and keeps English unchanged", () => {
    expect(en.publicProfileUi.contactStaysPrivate).toBe(
      "Exact address, phone, and email stay private.",
    );
    expect(et.publicProfileUi.contactStaysPrivate).toBe(
      "Täpne aadress, telefoninumber ja e-posti aadress jäävad privaatseks.",
    );
    const topCard = readSource("src/components/profile/public/MemberPublicTopCard.tsx");
    expect(topCard).toContain("t.publicProfileUi.contactStaysPrivate");
    expect(topCard).not.toContain("Exact address, phone, and email stay private.");
  });

  it("does not leave English labels for these fields when locale is et", () => {
    expect(translateProfileLabel("Comfortable with rabbit", "et")).toBe("Sobivad jänesed");
    expect(translateProfileLabel("Comfortable with rodent", "et")).toBe("Sobivad närilised");
    expect(translateProfileLabel("Previously cared for dog", "et")).toBe("Varem hoidnud koera");
    expect(translateProfileLabel("Previously cared for cat", "et")).toBe("Varem hoidnud kassi");
    expect(translateProfileLabel("Nearby park access", "et")).toBe("Läheduses on park või roheala");
    expect(translateProfileLabel("No pets at home", "et")).toBe("Kodus pole teisi loomi");
    expect(translateProfileLabel("Has pets at home", "et")).toBe("Kodus on teisi loomi");
    expect(et.publicProfileUi.contactStaysPrivate).not.toMatch(/Exact address/);
  });
});

describe("PublicMemberCareCard pet type heading", () => {
  it("renders a localized Pet types heading above the first badge section", () => {
    const file = readSource("src/components/profile/public/PublicMemberCareCard.tsx");
    expect(file).toMatch(/pl\("Pet types"\)/);
    expect(file).toMatch(/text-sm font-semibold text-foreground/);
    expect(file).toMatch(/PublicProfileChips chips=\{petTypeChips\}/);
  });
});
