import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("insecure public access-code grants stay removed", () => {
  it("does not keep a hardcoded STAYTEST3M fallback grant path", () => {
    const productionGlobs = [
      "src/lib/platform-access-code.ts",
      "src/lib/test-access-code.ts",
      "src/app/api/test-access-code/activate/route.ts",
      "src/lib/membership-promotion.ts",
      "src/components/membership/InvitedTestUserSection.tsx",
      "src/components/membership/AccessCodePanel.tsx",
      "src/components/membership/MembershipPageContent.tsx",
      "src/components/pricing/MembershipPlans.tsx",
      "src/lib/membership-invited-access.ts",
    ];
    for (const relativePath of productionGlobs) {
      let source = "";
      try {
        source = readSource(relativePath);
      } catch {
        continue;
      }
      expect(source).not.toContain("fallbackHardcodedCode");
      expect(source).not.toContain("isValidTestAccessCode");
      expect(source).not.toContain("validatePlatformAccessCode");
    }
  });

  it("does not redirect plan checkout to /test-access-code when Stripe is off", () => {
    const plans = readSource("src/components/pricing/MembershipPlans.tsx");
    expect(plans).not.toContain("/test-access-code");
    expect(plans).not.toContain("useTestAccessFlow");
  });

  it("does not restore the retired invited access-code UI", () => {
    const page = readSource("src/components/membership/MembershipPageContent.tsx");
    expect(page).not.toContain("InvitedTestUserSection");
    expect(page).not.toContain("AccessCodePanel");
    expect(page).not.toContain('data-membership-section="access-code"');
    expect(page).toContain("MembershipPromotionCodePanel");
  });

  it("keeps historical membership source classification without requiring platform_access_codes", () => {
    const overview = readSource("src/lib/admin/overview.ts");
    expect(overview).toContain("platform_access_code");
    expect(overview).toContain("test_code");
    expect(overview).toContain("membership_promotion");
  });
});
