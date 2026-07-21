import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { translateProfileLabel } from "@/lib/profile-translations";

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
});

describe("PublicMemberCareCard pet type heading", () => {
  it("renders a localized Pet types heading above the first badge section", () => {
    const file = readFileSync(
      join(process.cwd(), "src/components/profile/public/PublicMemberCareCard.tsx"),
      "utf8",
    );
    expect(file).toMatch(/pl\("Pet types"\)/);
    expect(file).toMatch(/text-sm font-semibold text-foreground/);
    expect(file).toMatch(/PublicProfileChips chips=\{petTypeChips\}/);
  });
});
