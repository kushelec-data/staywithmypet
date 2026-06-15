import { buildFindCareUrl } from "@/lib/care-search-params";
import {
  CARE_TYPES_LOCALE_COPY,
  type CareTypeLocaleCopy,
  type CareTypeLocaleSection,
} from "@/lib/generated/care-types-content";

export type CareTypeSlug =
  | "daycare"
  | "walks"
  | "overnight-care"
  | "home-visits"
  | "feeding-only"
  | "play-visits";

export type CareTypeSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type LocalizedCareTypeView = {
  slug: CareTypeSlug;
  name: string;
  icon: string;
  href: `/care/${CareTypeSlug}`;
  findCareFilter: string;
  findCareHref: string;
  meta: { title: string; description: string };
  heroTitle: string;
  intro: string;
  whatIsIt: CareTypeSection;
  whoIsItFor: CareTypeSection;
  whyChoose: CareTypeSection;
  howItWorks: CareTypeSection;
  cta: {
    title: string;
    description: string;
    primaryLabel: string;
    secondaryLabel?: string;
    secondaryHref?: string;
    imageSrc?: string;
    imageAlt?: string;
  };
};

export type CareTypeContent = {
  slug: CareTypeSlug;
  name: string;
  icon: string;
  href: `/care/${CareTypeSlug}`;
  findCareFilter: string;
  findCareHref: string;
  cardSummary: { en: string; et: string };
  localeCopy: CareTypeLocaleCopy;
};

type Locale = "en" | "et";

const CARE_TYPE_STATIC: Record<
  CareTypeSlug,
  Pick<CareTypeContent, "slug" | "icon" | "href" | "findCareFilter" | "findCareHref">
> = {
  daycare: {
    slug: "daycare",
    icon: "🏠",
    href: "/care/daycare",
    findCareFilter: "Daycare",
    findCareHref: buildFindCareUrl("Daycare"),
  },
  walks: {
    slug: "walks",
    icon: "🦮",
    href: "/care/walks",
    findCareFilter: "Walks only",
    findCareHref: buildFindCareUrl("Walks only"),
  },
  "overnight-care": {
    slug: "overnight-care",
    icon: "🌙",
    href: "/care/overnight-care",
    findCareFilter: "Overnight care / 24h stay",
    findCareHref: buildFindCareUrl("Overnight care / 24h stay"),
  },
  "home-visits": {
    slug: "home-visits",
    icon: "💚",
    href: "/care/home-visits",
    findCareFilter: "Home visits",
    findCareHref: buildFindCareUrl("Home visits"),
  },
  "feeding-only": {
    slug: "feeding-only",
    icon: "🍽️",
    href: "/care/feeding-only",
    findCareFilter: "Feeding only",
    findCareHref: buildFindCareUrl("Feeding only"),
  },
  "play-visits": {
    slug: "play-visits",
    icon: "🎾",
    href: "/care/play-visits",
    findCareFilter: "Play visits",
    findCareHref: buildFindCareUrl("Play visits"),
  },
};

function pickLocale<T extends string>(pair: { en: T; et: T }, locale: Locale): T {
  return locale === "et" ? pair.et : pair.en;
}

function toSection(section: { en: CareTypeLocaleSection; et: CareTypeLocaleSection }, locale: Locale): CareTypeSection {
  const source = locale === "et" ? section.et : section.en;
  return {
    title: source.title,
    ...(source.paragraphs?.length ? { paragraphs: source.paragraphs } : {}),
    ...(source.bullets?.length ? { bullets: source.bullets } : {}),
  };
}

function buildCareType(slug: CareTypeSlug): CareTypeContent {
  const localeCopy = CARE_TYPES_LOCALE_COPY[slug];
  const staticMeta = CARE_TYPE_STATIC[slug];
  return {
    ...staticMeta,
    name: localeCopy.name.en,
    cardSummary: localeCopy.cardSummary,
    localeCopy,
  };
}

const CARE_TYPE_LIST: CareTypeContent[] = (
  Object.keys(CARE_TYPE_STATIC) as CareTypeSlug[]
).map(buildCareType);

export const CARE_TYPES = CARE_TYPE_LIST;

export const CARE_TYPE_SLUGS = CARE_TYPE_LIST.map((c) => c.slug);

export function getCareTypeBySlug(slug: string): CareTypeContent | undefined {
  return CARE_TYPE_LIST.find((c) => c.slug === slug);
}

export function getCareTypeCardSummary(care: CareTypeContent, locale: Locale): string {
  return locale === "et" ? care.cardSummary.et : care.cardSummary.en;
}

export function getLocalizedCareType(care: CareTypeContent, locale: Locale): LocalizedCareTypeView {
  const copy = care.localeCopy;
  return {
    slug: care.slug,
    name: pickLocale(copy.name, locale),
    icon: care.icon,
    href: care.href,
    findCareFilter: care.findCareFilter,
    findCareHref: care.findCareHref,
    meta: {
      title: pickLocale(copy.meta.title, locale),
      description: pickLocale(copy.meta.description, locale),
    },
    heroTitle: pickLocale(copy.heroTitle, locale),
    intro: pickLocale(copy.intro, locale),
    whatIsIt: toSection(copy.whatIsIt, locale),
    whoIsItFor: toSection(copy.whoIsItFor, locale),
    whyChoose: toSection(copy.whyChoose, locale),
    howItWorks: toSection(copy.howItWorks, locale),
    cta: {
      title: pickLocale(copy.cta.title, locale),
      description: pickLocale(copy.cta.description, locale),
      primaryLabel: pickLocale(copy.cta.primaryLabel, locale),
      secondaryLabel: pickLocale(copy.cta.secondaryLabel, locale),
      secondaryHref: copy.cta.secondaryHref,
      imageSrc: copy.cta.imageSrc,
      imageAlt: copy.cta.imageAlt ? pickLocale(copy.cta.imageAlt, locale) : undefined,
    },
  };
}
