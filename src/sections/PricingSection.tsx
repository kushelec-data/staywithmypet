"use client";

import { useLanguage } from "@/context/LanguageContext";
import { MembershipPlans } from "@/components/pricing/MembershipPlans";
import { MembershipFloatingDogBanner } from "@/components/membership/MembershipFloatingDogBanner";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CONTENT_CONTAINER, PAGE_SECTION } from "@/lib/layout";
import { MEMBERSHIP_PLANS_SECTION_ID } from "@/lib/membership-plans-scroll";

export function PricingSection() {
  const { t } = useLanguage();

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
          <MembershipPlans
            variant="marketing"
            initialTab="owner"
            sectionId={MEMBERSHIP_PLANS_SECTION_ID}
          />
        </div>
      </section>
      <MembershipFloatingDogBanner />
    </>
  );
}
