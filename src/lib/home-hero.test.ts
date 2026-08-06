import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getTranslations } from "@/i18n/translations";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("homepage hero", () => {
  const en = getTranslations("en");
  const et = getTranslations("et");

  it("uses approved English hero copy", () => {
    expect(en.hero.eyebrow).toBe("Estonia's first membership-based pet care platform.");
    expect(en.hero.title).toBe("Someone who'll care for your pet\nas much as you do.");
    expect(en.hero.subtitle).toBe(
      "Find a trusted Pet Friend near you, so you can head out with peace of mind, knowing your pet is enjoying care, attention and companionship.",
    );
    expect(en.hero.tehnopolBadge.primary).toBe(
      "Selected for the Tehnopol Accelerator 2026 — one of only 9 startups chosen.",
    );
  });

  it("uses approved Estonian hero copy", () => {
    expect(et.hero.eyebrow).toBe("Eesti esimene liikmelisuspõhine lemmikloomahoiuplatvorm");
    expect(et.hero.title).toBe("Keegi, kes hoolib su lemmikust\nsama palju kui sina.");
    expect(et.hero.subtitle).toBe(
      "Leia usaldusväärne loomasõber oma kodu lähedalt, et saaksid rahuliku südamega ära käia, teades, et sinu lemmik saab samal ajal hoolt, tähelepanu ja seltsi.",
    );
    expect(et.hero.tehnopolBadge.primary).toBe(
      "Valitud Tehnopol Kiirendisse 2026 – üks vaid 9 väljavalitud iduettevõttest.",
    );
  });

  it("does not reference Startup Incubator in homepage hero copy", () => {
    const heroSource = [
      readSource("src/sections/HeroSection.tsx"),
      readSource("src/components/home/TehnopolAcceleratorBadge.tsx"),
      JSON.stringify(en.hero),
      JSON.stringify(et.hero),
    ].join("\n");

    expect(heroSource).not.toContain("Startup Incubator");
    expect(en.hero.tehnopolBadge.primary).toContain("Tehnopol Accelerator 2026");
    expect(et.hero.tehnopolBadge.primary).toContain("Tehnopol Kiirendisse 2026");
  });

  it("keeps hero DOM order: eyebrow → H1 → subheading → Tehnopol badge → CTAs", () => {
    const source = readSource("src/sections/HeroSection.tsx");
    const eyebrowIndex = source.indexOf("{t.hero.eyebrow}");
    const titleIndex = source.indexOf("{t.hero.title}");
    const subtitleIndex = source.indexOf("{t.hero.subtitle}");
    const badgeIndex = source.indexOf("<TehnopolAcceleratorBadge");
    const findCareIndex = source.indexOf('href="/find-care"');
    const becomeFriendIndex = source.indexOf('href="/find-pets"');

    expect(eyebrowIndex).toBeGreaterThan(-1);
    expect(titleIndex).toBeGreaterThan(eyebrowIndex);
    expect(subtitleIndex).toBeGreaterThan(titleIndex);
    expect(badgeIndex).toBeGreaterThan(subtitleIndex);
    expect(findCareIndex).toBeGreaterThan(badgeIndex);
    expect(becomeFriendIndex).toBeGreaterThan(findCareIndex);
  });

  it("preserves hero CTA destinations and labels", () => {
    const source = readSource("src/sections/HeroSection.tsx");

    expect(source).toContain('href="/find-care"');
    expect(source).toContain('href="/find-pets"');
    expect(en.hero.findCareCta).toBe("Find Pet Care");
    expect(en.hero.becomeFriendCta).toBe("Become a Pet Friend");
    expect(et.hero.findCareCta).toBe("Leia lemmikuhoidja");
    expect(et.hero.becomeFriendCta).toBe("Hakka loomasõbraks");
  });

  it("uses compact Tehnopol badge styling without a solid white card", () => {
    const source = readSource("src/components/home/TehnopolAcceleratorBadge.tsx");

    expect(source).toContain("from-mint/");
    expect(source).not.toContain("bg-white");
    expect(source).not.toContain("shadow-lg");
    expect(source).toContain("w-fit");
  });

  it("avoids horizontal overflow in hero layout", () => {
    const source = readSource("src/sections/HeroSection.tsx");

    expect(source).toContain("overflow-x-hidden");
    expect(source).toContain("min-w-0");
  });
});
