"use client";

import { useLanguage } from "@/context/LanguageContext";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CARE_TYPES, getCareTypeCardSummary } from "@/lib/care-types";
import { PAGE_CONTAINER, PAGE_SECTION } from "@/lib/layout";
import Link from "next/link";

export function ServicesSection() {
  const { t, locale } = useLanguage();
  const learnMore = locale === "et" ? "Loe lähemalt →" : "Learn more →";

  return (
    <section id="services" className={`${PAGE_SECTION} bg-surface/50`}>
      <div className={PAGE_CONTAINER}>
        <SectionHeading
          align="center"
          eyebrow={t.services.eyebrow}
          title={t.services.title}
          description={t.services.subtitle}
          className="mx-auto max-w-3xl"
        />

        <div className="mt-8 grid grid-cols-1 gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-6 lg:mt-14 lg:grid-cols-3 lg:gap-8">
          {CARE_TYPES.map((care, index) => {
            const i18nItem = t.services.items[index];
            const title = i18nItem?.title ?? care.name;
            const icon = i18nItem?.icon ?? care.icon;
            const description = getCareTypeCardSummary(care, locale);

            return (
              <Link
                key={care.slug}
                href={care.href}
                className="card-elevated group flex h-full flex-col rounded-3xl bg-surface p-5 transition-shadow hover:shadow-md sm:p-6 lg:p-8"
              >
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mint/60 text-xl sm:h-14 sm:w-14 sm:text-2xl"
                  aria-hidden
                >
                  {icon}
                </span>
                <h3 className="font-heading mt-4 text-lg font-semibold text-foreground group-hover:text-brand-teal sm:mt-6 sm:text-xl">
                  {title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted sm:mt-3 sm:text-base">
                  {description}
                </p>
                <span className="mt-4 text-sm font-semibold text-brand-teal group-hover:text-brand-pink">
                  {learnMore}
                </span>
              </Link>
            );
          })}
        </div>

        <p className="mt-8 text-center text-sm sm:mt-10 sm:text-base">
          <Link href="/find-care" className="font-semibold text-brand-teal hover:text-brand-pink">
            {t.services.cta}
          </Link>
        </p>
      </div>
    </section>
  );
}
