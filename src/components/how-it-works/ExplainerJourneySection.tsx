"use client";

import Link from "next/link";
import { PawPrint, User } from "lucide-react";
import { ExplainerVideoMock } from "@/components/how-it-works/ExplainerVideoMock";
import { useLanguage } from "@/context/LanguageContext";
import { useState } from "react";

type ActiveJourneyCard = "pet-parent" | "pet-friend";

export function HowItWorksExplainerSection({ tightTop = false }: { tightTop?: boolean }) {
  const { t } = useLanguage();
  const section = t.howItWorksPage.explainerSection;
  const explainer = t.howItWorksPage.explainer;
  const [activeCard, setActiveCard] = useState<ActiveJourneyCard>("pet-parent");

  const cards = [
    {
      key: "pet-parent" as const,
      id: "pet-parent-workflow",
      variant: "pet-parent" as const,
      title: section.petParent.title,
      description: section.petParent.description,
      ctaHref: "/find-care",
      ctaLabel: section.petParent.cta,
      copy: explainer.petParent,
      accent: "parent" as const,
    },
    {
      key: "pet-friend" as const,
      id: "pet-friend-workflow",
      variant: "pet-friend" as const,
      title: section.petFriend.title,
      description: section.petFriend.description,
      ctaHref: "/signup",
      ctaLabel: section.petFriend.cta,
      copy: explainer.petFriend,
      accent: "friend" as const,
    },
  ];

  return (
    <section
      className={`overflow-x-hidden border-t border-black/5 ${tightTop ? "py-6 sm:py-8 lg:py-10" : "py-10 lg:py-12"}`}
    >
      <div className="mx-auto w-full min-w-0 max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {section.heading}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">{section.subheading}</p>
        </div>

        <div className="mt-6 grid min-w-0 grid-cols-1 gap-5 sm:gap-6 md:mt-8 lg:grid-cols-2 lg:gap-8">
          {cards.map((card) => {
            const isActiveCard = activeCard === card.key;
            return (
              <article
                key={card.key}
                id={card.id}
                className={`scroll-mt-24 flex min-w-0 flex-col overflow-x-hidden rounded-3xl border p-4 shadow-lg transition-[opacity,box-shadow] duration-500 sm:p-6 ${
                  card.accent === "parent"
                    ? "border-brand-teal/25 bg-gradient-to-br from-mint/35 via-cream/85 to-surface"
                    : "border-brand-pink/20 bg-gradient-to-br from-amber-50/80 via-surface to-brand-pink/5"
                } ${
                  isActiveCard
                    ? card.accent === "parent"
                      ? "shadow-brand-teal/20 ring-2 ring-brand-teal/35"
                      : "shadow-brand-pink/15 ring-2 ring-brand-pink/30"
                    : "opacity-[0.82] ring-1 ring-black/5"
                }`}
              >
                <div className="mb-4 flex min-w-0 flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                        card.accent === "parent"
                          ? "bg-brand-teal/15 text-brand-teal"
                          : "bg-brand-pink/15 text-brand-pink"
                      }`}
                      aria-hidden
                    >
                      {card.accent === "parent" ? (
                        <PawPrint className="h-5 w-5" strokeWidth={2} />
                      ) : (
                        <User className="h-5 w-5" strokeWidth={2} />
                      )}
                    </span>
                    <h3 className="font-heading text-xl font-semibold text-foreground sm:text-2xl">
                      {card.title}
                    </h3>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                      card.accent === "parent"
                        ? "bg-brand-teal/15 text-brand-teal"
                        : "bg-brand-pink/15 text-brand-pink"
                    }`}
                  >
                    {card.accent === "parent" ? explainer.parentJourneyBadge : explainer.friendJourneyBadge}
                  </span>
                </div>

                <ExplainerVideoMock
                  variant={card.variant}
                  copy={card.copy}
                  isPlaybackActive={isActiveCard}
                  onSequenceComplete={() =>
                    setActiveCard(card.key === "pet-parent" ? "pet-friend" : "pet-parent")
                  }
                  controls={{
                    play: explainer.play,
                    pause: explainer.pause,
                    replay: explainer.replay,
                    muteLabel: explainer.muteLabel,
                    goToScene: explainer.goToScene,
                  }}
                />

                <p className="mt-4 text-sm leading-relaxed text-muted">{card.description}</p>

                <Link
                  href={card.ctaHref}
                  className={`mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-full px-6 py-3 text-sm font-semibold shadow-md transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    card.accent === "parent"
                      ? "bg-brand-teal text-white shadow-brand-teal/20 hover:bg-brand-teal-hover focus-visible:outline-brand-teal"
                      : "border border-black/10 bg-surface text-foreground shadow-sm hover:border-brand-teal/30 hover:bg-mint/40 focus-visible:outline-brand-teal dark:border-white/10"
                  }`}
                >
                  {card.ctaLabel}
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
