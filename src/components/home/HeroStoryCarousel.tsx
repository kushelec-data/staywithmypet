"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppImage } from "@/components/ui/AppImage";
import { useLanguage } from "@/context/LanguageContext";
import { IMAGES } from "@/lib/images";

const AUTO_ADVANCE_MS = 4000;

const STORY_IMAGE_PATHS = IMAGES.hero.stories;

/** Pet library fallbacks if a hero slide file is missing */
const STORY_FALLBACK_IMAGES = [
  IMAGES.pets.buddy,
  IMAGES.pets.luna,
  IMAGES.pets.buddy,
  IMAGES.pets.daisy,
  IMAGES.pets.luna,
] as const;

const STORY_HREFS = [
  "/find-pets",
  "/find-pets",
  "/find-pets",
  "/find-care",
  "/signup",
] as const;

const STORY_EMOJIS = ["🐕", "🌆", "🦮", "🤝", "🐾"] as const;

/** Overlay side — keeps copy off faces when object-position favors the other side */
const STORY_ALIGNS = ["left", "right", "left", "right", "left"] as const;

/** Focal point per slide (Tailwind arbitrary object-position) */
const STORY_OBJECT_POSITIONS = [
  "object-[50%_28%]",
  "object-[38%_30%]",
  "object-[50%_32%]",
  "object-[62%_28%]",
  "object-[62%_28%]",
] as const;

type StorySlide = {
  title: string;
  text: string;
  cta: string;
  href: string;
  image: string;
  fallbackImage: string;
  imageAlt: string;
  emoji: string;
  badge?: string;
  align: "left" | "right";
  objectPositionClass: string;
};

function StorySlideImage({
  slide,
  index,
  priority,
  isActive,
  prefersReducedMotion,
}: {
  slide: StorySlide;
  index: number;
  priority?: boolean;
  isActive: boolean;
  prefersReducedMotion: boolean;
}) {
  const [src, setSrc] = useState(slide.image);
  const [exhausted, setExhausted] = useState(false);

  useEffect(() => {
    setSrc(slide.image);
    setExhausted(false);
  }, [slide.image]);

  const zoomClass = prefersReducedMotion
    ? ""
    : isActive
      ? "scale-[1.03]"
      : "scale-100";

  return (
    <div
      className={`h-full w-full overflow-hidden ${
        prefersReducedMotion ? "" : "transition-transform duration-700 ease-out"
      } ${zoomClass}`}
    >
      <AppImage
        key={exhausted ? `placeholder-${index}` : src}
        src={exhausted ? "" : src}
        alt={slide.imageAlt}
        seed={`hero-story-${index + 1}`}
        fallbackCaption={slide.title}
        fallbackEmoji={slide.emoji}
        sizes="(max-width: 1024px) 92vw, 50vw"
        className={`h-full w-full object-cover ${slide.objectPositionClass}`}
        priority={priority}
        onError={() => {
          if (src !== slide.fallbackImage) {
            setSrc(slide.fallbackImage);
            return;
          }
          setExhausted(true);
        }}
      />
    </div>
  );
}

export function HeroStoryCarousel() {
  const { t } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const slides: StorySlide[] = useMemo(
    () =>
      t.hero.storyCarousel.slides.map((copy, index) => ({
        title: copy.title,
        text: copy.text,
        cta: copy.cta,
        badge: "badge" in copy ? copy.badge : undefined,
        imageAlt: copy.imageAlt,
        href: STORY_HREFS[index],
        image: STORY_IMAGE_PATHS[index],
        fallbackImage: STORY_FALLBACK_IMAGES[index],
        emoji: STORY_EMOJIS[index],
        align: STORY_ALIGNS[index],
        objectPositionClass: STORY_OBJECT_POSITIONS[index],
      })),
    [t.hero.storyCarousel.slides],
  );

  const slideCount = slides.length;
  const activeSlide = slides[activeIndex];

  const fadeTransition = prefersReducedMotion
    ? "transition-none"
    : "transition-opacity duration-500 ease-out";

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (isHovered || prefersReducedMotion || slideCount <= 1) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slideCount);
    }, AUTO_ADVANCE_MS);

    return () => clearInterval(interval);
  }, [isHovered, prefersReducedMotion, slideCount]);

  const goToSlide = (index: number) => {
    setActiveIndex(index);
  };

  const overlayAlignClass =
    activeSlide.align === "right"
      ? "right-4 left-auto text-right sm:right-6 sm:left-auto"
      : "left-4 right-auto sm:left-6";

  return (
    <div
      className="w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label={t.hero.storyCarousel.ariaLabel}
        className="relative aspect-[5/4] max-h-[min(13rem,34vh)] w-full overflow-hidden rounded-3xl bg-gradient-to-br from-cream/90 via-mint/25 to-cream/70 shadow-lg shadow-black/10 ring-1 ring-black/5 sm:max-h-[min(19rem,40vh)] lg:ml-auto lg:max-h-[min(26rem,42vh)]"
      >
        <div className="relative h-full w-full" aria-live="polite">
          {slides.map((slide, index) => {
            const isActive = index === activeIndex;
            return (
              <article
                key={slide.title}
                className={`absolute inset-0 ${fadeTransition} ${
                  isActive ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0"
                }`}
                aria-hidden={!isActive}
              >
                <StorySlideImage
                  slide={slide}
                  index={index}
                  priority={index === 0}
                  isActive={isActive}
                  prefersReducedMotion={prefersReducedMotion}
                />

                {slide.badge ? (
                  <span className="absolute left-3 top-3 z-20 rounded-full border border-white/70 bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-brand-teal shadow-sm backdrop-blur-sm sm:text-xs">
                    {slide.badge}
                  </span>
                ) : null}

                <div
                  className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-black/45 via-black/10 to-transparent"
                  aria-hidden
                />
              </article>
            );
          })}

          {activeSlide ? (
            <div
              key={activeIndex}
              className={`absolute bottom-4 z-20 max-w-[88%] text-white motion-safe:hero-story-text-in sm:bottom-6 sm:max-w-[70%] ${overlayAlignClass} ${
                prefersReducedMotion ? "" : ""
              }`}
            >
              <h3 className="font-heading text-xl font-bold leading-tight drop-shadow-md sm:text-3xl">
                {activeSlide.title}
              </h3>
              <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-white/90 drop-shadow sm:text-base">
                {activeSlide.text}
              </p>
              <Link
                href={activeSlide.href}
                className="mt-3 inline-flex min-h-[2.25rem] w-full max-w-full items-center justify-center rounded-full border border-white/35 bg-brand-teal/80 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-black/25 backdrop-blur-md transition hover:bg-brand-teal/95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:mt-3.5 sm:w-auto sm:text-sm"
              >
                {activeSlide.cta}
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      <div
        className="mt-2.5 flex justify-center gap-2 sm:mt-3 lg:justify-end"
        role="tablist"
        aria-label={t.hero.storyCarousel.dotsLabel}
      >
        {slides.map((slide, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={slide.title}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={t.hero.storyCarousel.goToSlide
                .replace("{n}", String(index + 1))
                .replace("{title}", slide.title)}
              className={`rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal ${
                prefersReducedMotion ? "" : "transition-all duration-300 ease-out"
              } ${isActive ? "h-3 w-3 bg-brand-teal" : "h-2 w-2 bg-brand-teal/30 hover:bg-brand-teal/50"}`}
              onClick={() => goToSlide(index)}
            />
          );
        })}
      </div>
    </div>
  );
}
