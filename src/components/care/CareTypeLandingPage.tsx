"use client";

import { PageCta } from "@/components/layout/PageCta";
import { PageHero } from "@/components/layout/PageHero";
import { PageMain } from "@/components/layout/PageMain";
import { useLanguage } from "@/context/LanguageContext";
import { getLocalizedCareType, type CareTypeContent, type CareTypeSection } from "@/lib/care-types";
import { CONTENT_CONTAINER } from "@/lib/layout";
import { PUBLIC_CARD, PUBLIC_SECTION_TITLE } from "@/lib/public-layout";
import Link from "next/link";
import { useMemo } from "react";

const SECTION_PAD = "py-10 lg:py-12";

function CareSectionBlock({ section }: { section: CareTypeSection }) {
  return (
    <section className={SECTION_PAD}>
      <div className={CONTENT_CONTAINER}>
        <div className={`${PUBLIC_CARD} max-w-3xl`}>
          <h2 className={PUBLIC_SECTION_TITLE}>{section.title}</h2>
          {section.paragraphs?.map((p) => (
            <p key={p} className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
              {p}
            </p>
          ))}
          {section.bullets?.length ? (
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted sm:text-base">
              {section.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}

type CareTypeLandingPageProps = {
  care: CareTypeContent;
};

export function CareTypeLandingPage({ care }: CareTypeLandingPageProps) {
  const { locale, t } = useLanguage();
  const localized = useMemo(() => getLocalizedCareType(care, locale), [care, locale]);
  const learnMore =
    locale === "et" ? "Tagasi kõigi teenuste juurde" : "Back to all care types";

  return (
    <>
      <PageHero
        variant="mint"
        badge={t.services.eyebrow}
        title={localized.heroTitle}
        description={localized.intro}
      />

      <PageMain>
        <CareSectionBlock section={localized.whatIsIt} />
        <CareSectionBlock section={localized.whoIsItFor} />
        <CareSectionBlock section={localized.whyChoose} />
        <CareSectionBlock section={localized.howItWorks} />

        <section className="pb-8">
          <div className={CONTENT_CONTAINER}>
            <p className="text-center text-sm text-muted">
              <Link href="/#services" className="font-semibold text-brand-teal hover:text-brand-pink">
                {learnMore}
              </Link>
            </p>
          </div>
        </section>
      </PageMain>

      <PageCta
        title={localized.cta.title}
        description={localized.cta.description}
        primaryLabel={localized.cta.primaryLabel}
        primaryHref={localized.findCareHref}
        secondaryLabel={localized.cta.secondaryLabel}
        secondaryHref={localized.cta.secondaryHref}
        imageSrc={localized.cta.imageSrc}
        imageAlt={localized.cta.imageAlt}
      />
    </>
  );
}
