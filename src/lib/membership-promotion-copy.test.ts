import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { en } from "@/i18n/en";
import { et } from "@/i18n/et";

describe("membership promotion copy", () => {
  it("uses Activate membership instead of Pay with Stripe in English and Estonian", () => {
    expect(en.membershipCheckout.payWithStripe).toBe("Activate membership");
    expect(en.membershipCheckout.activateMembership).toBe("Activate membership");
    expect(et.membershipCheckout.payWithStripe).toBe("Aktiveeri liikmelisus");
    expect(et.membershipCheckout.activateMembership).toBe("Aktiveeri liikmelisus");
  });

  it("defines concise welcome-offer strings in English and Estonian", () => {
    expect(en.newMemberPromotion.planBadge).toBe("WELCOME OFFER");
    expect(en.newMemberPromotion.discountHeadline).toBe("90% OFF");
    expect(en.newMemberPromotion.stripOfferLine).toContain("90%");
    expect(en.newMemberPromotion.offerSupportingCopy).toContain("90%");
    expect(en.newMemberPromotion.checkoutNote).toContain("checkout");
    expect(en.newMemberPromotion.activateMembershipCta).toBe("Activate membership");
    expect(en.membershipUpsell.promotionTitle).toBe("Ready to connect?");
    expect(en.membershipUpsell.promotionBody).toContain("90%");
    expect(en.membershipUpsell.promotionCta).toBe("Activate membership");
    expect(en.membershipUpsell.notNow).toBe("Not now");

    expect(et.newMemberPromotion.planBadge).toBe("TERVITUSPAKKUMINE");
    expect(et.newMemberPromotion.discountHeadline).toContain("90%");
    expect(et.newMemberPromotion.stripOfferLine).toContain("90%");
    expect(et.newMemberPromotion.offerSupportingCopy).toContain("90%");
    expect(et.newMemberPromotion.checkoutNote).toContain("kassas");
    expect(et.newMemberPromotion.activateMembershipCta).toBe("Aktiveeri liikmelisus");
    expect(et.membershipUpsell.promotionTitle).toBe("Valmis ühendust looma?");
    expect(et.membershipUpsell.promotionBody).toContain("90%");
    expect(et.membershipUpsell.promotionCta).toBe("Aktiveeri liikmelisus");
    expect(et.membershipUpsell.notNow).toBe("Mitte praegu");
  });

  it("uses general access-code wording instead of invited test-user labels", () => {
    expect(en.testAccess.invitedSection.title).toBe("Have an access code?");
    expect(en.testAccess.invitedSection.activateButton).toBe("Redeem code");
    expect(en.testAccess.invitedSection.title).not.toMatch(/test user/i);
    expect(en.testAccess.invitedSection.activateButton).not.toMatch(/Invited/i);

    expect(et.testAccess.invitedSection.title).toBe("Kas sul on sooduskood?");
    expect(et.testAccess.invitedSection.activateButton).toBe("Kasuta koodi");
    expect(et.testAccess.invitedSection.title).not.toMatch(/testkasutaja/i);
  });

  it("does not expose removed frontend price-calculation copy keys", () => {
    const promo = en.newMemberPromotion as Record<string, unknown>;
    expect(promo.claimOfferCta).toBeUndefined();
    expect(promo.bannerBody).toBeUndefined();
    expect(promo.discountOffLabel).toBeUndefined();
  });

  it("does not embed calculated euro discount amounts in promotion components", () => {
    for (const relativePath of [
      "src/components/pricing/MembershipPlans.tsx",
      "src/components/membership/NewMemberPromotionBanner.tsx",
      "src/lib/new-member-promotion.ts",
      "src/components/membership/MembershipPageContent.tsx",
    ]) {
      const source = readFileSync(join(process.cwd(), relativePath), "utf8");
      expect(source).not.toMatch(/newMemberPromotionalPricing/);
      expect(source).not.toMatch(/discountedPrice/);
      expect(source).not.toMatch(/line-through/);
    }
  });

  it("places welcome hero and access-code section around membership plans on the account page", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/membership/MembershipPageContent.tsx"),
      "utf8",
    );
    const heroIndex = source.indexOf("<MembershipWelcomeOfferHero");
    const accessCodeIndex = source.indexOf("<InvitedTestUserSection");
    const plansIndex = source.indexOf("<MembershipPlans");
    expect(heroIndex).toBeGreaterThan(-1);
    expect(accessCodeIndex).toBeGreaterThan(-1);
    expect(plansIndex).toBeGreaterThan(-1);
    expect(heroIndex).toBeLessThan(plansIndex);
    expect(plansIndex).toBeLessThan(accessCodeIndex);
    expect(source).toContain("sectionId={MEMBERSHIP_PLANS_SECTION_ID}");
  });
});
