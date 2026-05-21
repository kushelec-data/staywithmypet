import { en } from "./en";
import { et } from "./et";

export type Locale = "en" | "et";

export const defaultLocale: Locale = "en";

export const locales: Locale[] = ["en", "et"];

export const translations = {
  en,
  et,
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
