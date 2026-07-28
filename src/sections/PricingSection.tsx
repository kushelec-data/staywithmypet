"use client";

import { useLanguage } from "@/context/LanguageContext";
import { MembershipPlans } from "@/components/pricing/MembershipPlans";
import { NewMemberPromotionBanner } from "@/components/membership/NewMemberPromotionBanner";
import { MembershipFloatingDogBanner } from "@/components/membership/MembershipFloatingDogBanner";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CONTENT_CONTAINER, PAGE_SECTION } from "@/lib/layout";
import { MEMBERSHIP_PLANS_SECTION_ID } from "@/lib/membership-plans-scroll";

export function PricingSection() {
  const { t } = useLanguage();
  const promo = t.newMemberPromotion;

  return (
    <>
      <section id="pricing" className={`${PAGE_SECTION} bg-gradient-to-b from-pastel-blue/20 to-background`}>
        <div className={CONTENT_CONTAINER}>
          <SectionHeading
            align="center"
            title={t.pricing.title}
            description={t.pricing.subtitle}
            className="mx-auto max-w-3xl"
          />
          <NewMemberPromotionBanner
            role="pet_parent"
            displayMode="marketing"
            loggedIn={false}
            className="mx-auto mt-8 max-w-3xl"
          />
          <MembershipPlans
            variant="marketing"
            initialTab="owner"
            sectionId={MEMBERSHIP_PLANS_SECTION_ID}
            promotionDisplayMode="marketing"
            promotionBadgeLabel={promo.planBadge}
            promotionDiscountHeadline={promo.discountHeadline}
            promotionCheckoutNote={promo.checkoutNote}
            activateMembershipLabel={t.membershipCheckout.activateMembership}
          />
        </div>
      </section>
      <MembershipFloatingDogBanner />
    </>
  );
}
