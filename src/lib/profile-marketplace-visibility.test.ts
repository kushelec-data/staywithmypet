import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Regression: applyMarketplaceVisibility must never write pets.is_public.
 * Pet listing visibility is owner-controlled via updatePetListingVisibility only.
 */
describe("applyMarketplaceVisibility pet listing policy", () => {
  it("only heals is_active on pets, never is_public", () => {
    const file = readFileSync(
      join(process.cwd(), "src/lib/profile-marketplace-visibility.ts"),
      "utf8",
    );
    expect(file).not.toMatch(/updates\.is_public\s*=/);
    expect(file).toMatch(/is_active:\s*pet\.is_active/);
    expect(file).not.toMatch(/from\("profiles"\)\.update\(\{\s*is_public:\s*true/);
    expect(file).toContain("Never writes profiles.is_public");
  });
});
