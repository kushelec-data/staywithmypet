"use client";

import { useLanguage } from "@/context/LanguageContext";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PAGE_CONTAINER, PAGE_SECTION } from "@/lib/layout";

export function WhyChooseUsSection() {
  const { t } = useLanguage();

  return (
    <section id="why-choose-us" className={PAGE_SECTION}>
      <div className={PAGE_CONTAINER}>
        <SectionHeading
          align="center"
          eyebrow={t.whyChooseUs.eyebrow}
          title={t.whyChooseUs.title}
          description={t.whyChooseUs.subtitle}
          className="mx-auto max-w-3xl"
        />

        <div className="mt-8 grid grid-cols-1 gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-6 lg:mt-14 lg:gap-8">
          {t.whyChooseUs.cards.map((card) => (
            <article
              key={card.title}
              className="card-elevated flex flex-col gap-4 rounded-3xl bg-surface p-5 transition-shadow duration-200 hover:shadow-md sm:flex-row sm:gap-5 sm:p-6 lg:p-8"
            >
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-pink-muted text-xl ring-1 ring-brand-pink/20 sm:h-14 sm:w-14 sm:text-2xl"
                aria-hidden
              >
                {card.icon}
              </span>
              <div className="min-w-0">
                <h3 className="font-heading text-lg font-semibold leading-snug text-foreground sm:text-xl">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted sm:mt-3 sm:text-base">{card.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
