"use client";

import { CtaBanner } from "@/components/ui/CtaBanner";
import { AppImage } from "@/components/ui/AppImage";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import { IMAGES } from "@/lib/images";
import { CONTENT_CONTAINER } from "@/lib/layout";
import { HowItWorksExplainerSection } from "@/components/how-it-works/ExplainerVideoMock";
import { PUBLIC_CARD_MINT, PUBLIC_SECTION_TITLE } from "@/lib/public-layout";

const SECTION_PAD = "py-10 lg:py-12";

export function HowItWorksPageClient() {
  const { t } = useLanguage();
  const h = t.howItWorksPage;
  const { petParent, petFriend } = h.explainerSection;

  return (
    <div className="min-w-0 bg-gradient-to-b from-cream/60 via-background to-background">
      <header className="border-b border-black/5 bg-gradient-to-b from-mint/25 via-cream/40 to-background">
        <div className={`${CONTENT_CONTAINER} min-w-0 py-6 sm:py-8 lg:py-10`}>
          <div className="grid min-w-0 grid-cols-1 items-center gap-5 lg:grid-cols-2 lg:gap-8">
            <div className="min-w-0">
              <h1 className="font-heading text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl lg:text-4xl">
                {h.title}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">{h.subtitle}</p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button href="#pet-parent-workflow" size="lg">
                  {petParent.cta}
                </Button>
                <Button href="#pet-friend-workflow" variant="outline" size="lg">
                  {petFriend.cta}
                </Button>
              </div>
            </div>
            <div className="relative mx-auto w-full min-w-0 max-w-md lg:max-w-none lg:justify-self-end">
              <div className="relative aspect-[4/3] max-h-[min(14rem,36vh)] w-full overflow-hidden rounded-3xl shadow-lg shadow-brand-teal/10 ring-1 ring-black/5 sm:max-h-[min(18rem,40vh)] lg:max-h-[min(26rem,42vh)]">
                <AppImage
                  src={IMAGES.howItWorks.hero}
                  alt={h.imageAlt}
                  seed="how-it-works-hero"
                  fallbackCaption={h.imageFallbackCaption}
                  fallbackEmoji="🐕"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <HowItWorksExplainerSection tightTop />

      <section className={`border-t border-black/5 ${SECTION_PAD}`}>
        <div className={CONTENT_CONTAINER}>
          <h2 className={`${PUBLIC_SECTION_TITLE} text-center`}>{h.trust.title}</h2>
          <ul className="mt-5 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {h.trust.items.map((item) => (
              <li key={item.title} className={`${PUBLIC_CARD_MINT} flex min-w-0 gap-3 !p-4 sm:!p-5`}>
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10 text-base text-brand-teal"
                  aria-hidden
                >
                  {item.icon}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-1 text-sm leading-snug text-muted">{item.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={`border-t border-black/5 ${SECTION_PAD}`}>
        <div className={CONTENT_CONTAINER}>
          <CtaBanner
            withPageShell={false}
            heading={h.ctaTitle}
            subtext={h.ctaDescription}
            primaryLabel={h.findCareCta}
            primaryHref="/find-care"
            secondaryLabel={h.becomeFriendCta}
            secondaryHref="/signup"
          />
        </div>
      </section>
    </div>
  );
}
