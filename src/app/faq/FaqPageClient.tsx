"use client";

import { FaqAccordion } from "@/components/content/FaqAccordion";
import { PageCta } from "@/components/layout/PageCta";
import { PageHero } from "@/components/layout/PageHero";
import { PageMain } from "@/components/layout/PageMain";
import { useLanguage } from "@/context/LanguageContext";

export function FaqPageClient() {
  const { t } = useLanguage();

  return (
    <>
      <PageHero badge={t.faq.badge} title={t.faq.title} description={t.faq.subtitle} />
      <PageMain tight>
        <div className="mx-auto max-w-3xl">
          <FaqAccordion />
        </div>
      </PageMain>
      <PageCta
        title={t.faq.cta.title}
        description={t.faq.cta.description}
        primaryLabel={t.faq.cta.primary}
        primaryHref="/find-pets"
        secondaryLabel={t.faq.cta.secondary}
        secondaryHref="/find-care"
      />
    </>
  );
}
