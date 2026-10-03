import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DENNY_TEAM_IMAGE, getAboutFounders } from "@/i18n/about-founders";
import { translations } from "@/i18n/translations";

describe("About team members", () => {
  it("keeps Gerly and Kush biographies and adds Denny in both locales", () => {
    const en = getAboutFounders("en");
    const et = getAboutFounders("et");
    expect(en.map((row) => row.name)).toEqual([
      "Gerly Kullamaa",
      "Kush Chadha",
      "Magia Dilore Dancer Denny",
    ]);
    expect(et.map((row) => row.name)).toEqual(en.map((row) => row.name));
    expect(en[0]?.bio).toContain("devoted dog owner");
    expect(en[1]?.bio).toContain("science and technology");
    expect(et[0]?.bio).toContain("pühendunud koeraomanik");
    expect(et[1]?.bio).toContain("teaduse ja tehnoloogia");
    expect(en[2]?.role).toBe("Chief Happiness Officer 🐾");
    expect(en[2]?.badge).toBe("Chief Happiness Officer");
    expect(en[2]?.image).toBe(DENNY_TEAM_IMAGE);
    expect(en[2]?.bio).toContain("four-legged team member");
    expect(et[2]?.bio).toContain("neljajalgne meeskonnaliige");
    expect(en[2]?.image).not.toBe("/quiz/denny.jpg");
    expect(existsSync(join(process.cwd(), "public/images/team/denny.jpg"))).toBe(true);
  });

  it("keeps the existing team closing line in English and Estonian", () => {
    expect(translations.en.about.teamClosing).toContain("small team with a big heart");
    expect(translations.et.about.teamClosing).toContain("väike meeskond suure südamega");
  });
});
