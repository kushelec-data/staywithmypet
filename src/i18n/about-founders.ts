/**
 * Founder bios from EST and ENG texts.xlsx (Our Story sheet), via generated partials.
 * Loaded by locale so ET never falls back to English merge/base copy.
 */
import { siteEnPartial } from "./generated/site-en";
import { siteEtPartial } from "./generated/site-et";
import type { Locale } from "./translations";

export type AboutFounder = {
  name: string;
  role: string;
  bio: string;
  image: string;
};

const foundersByLocale: Record<Locale, readonly AboutFounder[]> = {
  en: siteEnPartial.about.founders,
  et: siteEtPartial.about.founders,
};

export function getAboutFounders(locale: Locale): readonly AboutFounder[] {
  return foundersByLocale[locale] ?? foundersByLocale.en;
}
