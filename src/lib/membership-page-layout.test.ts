import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("membership page layout hierarchy", () => {
  const pageSource = readSource("src/components/membership/MembershipPageContent.tsx");
  const heroSource = readSource("src/components/membership/MembershipWelcomeOfferHero.tsx");
  const accessSource = readSource("src/components/membership/InvitedTestUserSection.tsx");

  it("uses unified Membership & Pricing title", () => {
    expect(pageSource).toContain("title={t.pricing.title}");
    expect(pageSource).toContain("description={t.pricing.subtitle}");
    expect(pageSource).not.toContain("mpage.petFriendTitle");
    expect(pageSource).not.toContain("mpage.petParentSubtitle");
  });

  it("keeps launch offer, access code, then plans in order", () => {
    const launchIdx = pageSource.indexOf("<MembershipWelcomeOfferHero");
    const accessIdx = pageSource.indexOf("<InvitedTestUserSection");
    const plansIdx = pageSource.indexOf('data-membership-section="membership-plans"');

    expect(launchIdx).toBeGreaterThan(-1);
    expect(accessIdx).toBeGreaterThan(-1);
    expect(plansIdx).toBeGreaterThan(-1);
    expect(launchIdx).toBeLessThan(accessIdx);
    expect(accessIdx).toBeLessThan(plansIdx);
  });

  it("marks launch offer and access code sections", () => {
    expect(heroSource).toContain('data-membership-section="launch-offer"');
    expect(accessSource).toContain('data-membership-section="access-code"');
  });

  it("does not repeat role-specific page headings in summaries", () => {
    expect(pageSource).not.toContain("mpage.petParentTitle");
    expect(pageSource).not.toContain("mpage.petFriendTitle");
  });
});
