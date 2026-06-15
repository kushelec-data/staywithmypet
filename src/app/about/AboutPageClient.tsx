"use client";

import { FounderCard } from "@/components/team/FounderCard";
import { PageHero } from "@/components/layout/PageHero";
import { AppImage } from "@/components/ui/AppImage";
import { CtaBanner } from "@/components/ui/CtaBanner";
import { useLanguage } from "@/context/LanguageContext";
import { getTranslations } from "@/i18n/translations";
import { IMAGES } from "@/lib/images";
import { CONTENT_CONTAINER } from "@/lib/layout";
import { PUBLIC_CARD, PUBLIC_CARD_MINT, PUBLIC_SECTION_TITLE } from "@/lib/public-layout";

const SECTION_PAD = "py-10 lg:py-12";

export function AboutPageClient() {
  const { locale, t } = useLanguage();
  const a = t.about;
  const founders = getTranslations(locale).about.founders;

  return (
    <>
      <PageHero badge={a.badge} title={a.title} description={a.subtitle} compact />

      <section className={SECTION_PAD}>
        <div className={CONTENT_CONTAINER}>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start lg:gap-10">
            <div className="min-w-0">
              <h2 className={PUBLIC_SECTION_TITLE}>{a.missionTitle}</h2>
              <div className="mt-4 space-y-3">
                {a.missionParagraphs.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)} className="text-sm leading-relaxed text-muted sm:text-base">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
            <div className="relative mx-auto h-[min(360px,50vh)] w-full max-w-lg overflow-hidden rounded-3xl bg-cream shadow-lg shadow-brand-teal/10 ring-1 ring-black/5 lg:mx-0 lg:ml-auto">
              <div className="relative h-full w-full">
                <AppImage
                  src={IMAGES.about.community}
                  alt={a.imageAlt}
                  seed="about-mission"
                  fallbackCaption={a.imageFallbackCaption}
                  captionOnlyFallback
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-contain object-[50%_20%]"
                />
              </div>
            </div>
          </div>
          <ul className="mt-8 flex flex-wrap justify-center gap-2 lg:justify-start">
            {a.missionPillars.map((pillar) => (
              <li
                key={pillar}
                className="rounded-full border border-brand-teal/15 bg-mint/30 px-4 py-2 text-sm font-semibold text-brand-teal shadow-sm"
              >
                {pillar}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={`border-t border-black/5 ${SECTION_PAD}`}>
        <div className={CONTENT_CONTAINER}>
          <h2 className={`${PUBLIC_SECTION_TITLE} text-center`}>{a.storyTitle}</h2>
          <article className={`${PUBLIC_CARD_MINT} mx-auto mt-6 max-w-3xl`}>
            <div className="space-y-4">
              {a.storyParagraphs.map((paragraph, index) => (
                <p
                  key={paragraph.slice(0, 32)}
                  className={`text-sm leading-relaxed text-muted sm:text-base ${
                    index === 0 ? "font-medium text-foreground" : ""
                  }`}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className={`border-t border-black/5 ${SECTION_PAD}`}>
        <div className={CONTENT_CONTAINER}>
          <div className="text-center">
            <h2 className={PUBLIC_SECTION_TITLE}>{a.teamTitle}</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-muted sm:text-base">{a.teamIntro}</p>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
            {founders.map((founder) => (
              <FounderCard
                key={`${locale}-${founder.name}`}
                coFounderLabel={a.coFounderBadge}
                {...founder}
              />
            ))}
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-center text-sm leading-relaxed text-muted sm:text-base">
            {a.teamClosing}
          </p>
        </div>
      </section>

      <section className={`border-t border-black/5 ${SECTION_PAD}`}>
        <div className={CONTENT_CONTAINER}>
          <h2 className={`${PUBLIC_SECTION_TITLE} text-center`}>{a.valuesTitle}</h2>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
            {a.values.map((v) => (
              <article key={v.title} className={`${PUBLIC_CARD} flex flex-col gap-2 !p-4`}>
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mint/40 text-lg"
                  aria-hidden
                >
                  {v.icon}
                </span>
                <h3 className="font-heading text-sm font-semibold text-foreground">{v.title}</h3>
                <p className="text-sm leading-snug text-muted">{v.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`border-t border-black/5 ${SECTION_PAD}`}>
        <div className={CONTENT_CONTAINER}>
          <div className={`${PUBLIC_CARD_MINT} mx-auto max-w-3xl`}>
            <h2 className={`${PUBLIC_SECTION_TITLE} text-center`}>{a.whyChooseTitle}</h2>
            <p className="mt-4 text-center text-sm leading-relaxed text-muted sm:text-base">{a.whyChooseIntro}</p>
            <p className="mt-3 text-center text-sm leading-relaxed text-muted sm:text-base">{a.whyChooseLead}</p>
            <p className="mt-5 text-sm font-semibold text-foreground">{a.whyChooseTrustLine}</p>
            <ul className="mt-4 space-y-4">
              {a.whyChooseItems.map((item) => (
                <li key={item.title} className="flex gap-3">
                  <span
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-teal/15 text-xs font-bold text-brand-teal"
                    aria-hidden
                  >
                    ✓
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{item.description}</p>
                    {"footnote" in item && typeof item.footnote === "string" && item.footnote ? (
                      <p className="mt-1 text-xs italic text-muted">{item.footnote}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-center text-sm leading-relaxed text-muted sm:text-base">{a.whyChooseClosing}</p>
          </div>
        </div>
      </section>

      <section className={`border-t border-black/5 ${SECTION_PAD}`}>
        <div className={CONTENT_CONTAINER}>
          <CtaBanner
            withPageShell={false}
            heading={a.ctaTitle}
            subtext={a.ctaDescription}
            primaryLabel={t.common.joinCommunity}
            primaryHref="/signup"
          />
        </div>
      </section>
    </>
  );
}
