/**
 * Founder role + bio from EST and ENG texts.xlsx → Our Story sheet (rows 29–35).
 * Synced into generated/site-en.ts and generated/site-et.ts via scripts/sync-site-texts.mjs.
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

export function getAboutFounders(locale: Locale): readonly AboutFounder[] {
  if (locale === "et") {
    return siteEtPartial.about.founders;
  }
  return siteEnPartial.about.founders;
}
