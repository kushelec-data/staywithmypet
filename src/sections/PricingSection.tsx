"use client";

import { useLanguage } from "@/context/LanguageContext";
import { PetMascotCTA } from "@/components/marketing/PetMascotCTA";
import { MembershipPlans } from "@/components/pricing/MembershipPlans";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CONTENT_CONTAINER, PAGE_SECTION } from "@/lib/layout";

export function PricingSection() {
  const { t } = useLanguage();

  return (
    <section id="pricing" className={`${PAGE_SECTION} bg-gradient-to-b from-pastel-blue/20 to-background`}>
      <div className={CONTENT_CONTAINER}>
        <SectionHeading
          align="center"
          title={t.pricing.title}
          description={t.pricing.subtitle}
          className="mx-auto max-w-3xl"
        />
        <PetMascotCTA variant="pricing" className="mx-auto mt-8 max-w-5xl" />
        <MembershipPlans variant="marketing" initialTab="owner" />
      </div>
    </section>
  );
}
