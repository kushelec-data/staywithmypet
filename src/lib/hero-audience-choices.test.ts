import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { en } from "@/i18n/en";
import { et } from "@/i18n/et";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("homepage hero audience choices", () => {
  it("uses the exact English audience messages", () => {
    expect(en.hero.audienceChoices.petParent).toBe("I have a Pet");
    expect(en.hero.audienceChoices.petFriend).toBe("I want to care for a Pet");
  });

  it("uses the exact Estonian audience messages", () => {
    expect(et.hero.audienceChoices.petParent).toBe("Mul on lemmikloom");
    expect(et.hero.audienceChoices.petFriend).toBe("Soovin lemmikut hoida");
  });

  it("renders audience choices in the hero and links to existing flows", () => {
    const source = readSource("src/sections/HeroSection.tsx");
    expect(source).toContain("HeroAudienceChoices");
    expect(source).toContain("t.hero.audienceChoices.petParent");
    expect(source).toContain("t.hero.audienceChoices.petFriend");
    expect(source).toContain('href="/find-care"');
    expect(source).toContain('href="/find-pets"');
    expect(source).toContain("text-balance");
    expect(source).toContain("grid-cols-1");
    expect(source).toContain("sm:grid-cols-2");
  });
});
