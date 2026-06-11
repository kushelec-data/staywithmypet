import { en } from "./en";
import { et } from "./et";
import { siteEnPartial } from "./generated/site-en";
import { siteEtPartial } from "./generated/site-et";
import { deepMerge } from "./merge-site-texts";

export type Locale = "en" | "et";

export const defaultLocale: Locale = "en";

export const locales: Locale[] = ["en", "et"];

export const translations = {
  en: deepMerge(en, siteEnPartial),
  et: deepMerge(et, siteEtPartial),
} as const;

export type Translations = typeof en;

type StringifyLeaves<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly StringifyLeaves<U>[]
    : T extends object
      ? { [K in keyof T]: StringifyLeaves<T[K]> }
      : T;

export type Dictionary = StringifyLeaves<Translations>;

export function getTranslations(locale: Locale): Dictionary {
  return translations[locale] ?? translations[defaultLocale];
}
