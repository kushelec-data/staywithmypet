import { languageOptions } from "@/lib/legacy/search-filters";
import type { ProfileDetails } from "@/lib/profile-details";
import {
  formatListWithOtherDisplay,
  isOtherOptionValue,
  OTHER_OPTION_LABEL,
  strFromOtherField,
} from "@/lib/other-option";
import { translateProfileLabel } from "@/lib/profile-translations";
import type { Locale } from "@/i18n";

/** Profile setup/edit language chips (includes Other). Search filters use `languageOptions` only. */
export const profileLanguageOptions = [...languageOptions, OTHER_OPTION_LABEL] as const;

export function languagesOtherFromDetails(
  details: ProfileDetails | Record<string, unknown> | null | undefined,
): string {
  if (!details || typeof details !== "object") return "";
  return strFromOtherField((details as Record<string, unknown>).languages_other);
}

export function mergeLanguagesOtherIntoDetails(
  details: Record<string, unknown>,
  languages: readonly string[],
  languagesOther: string,
): Record<string, unknown> {
  const next = { ...details };
  const hasOther = languages.some(isOtherOptionValue);
  const trimmed = languagesOther.trim();
  if (hasOther && trimmed) {
    next.languages_other = trimmed;
  } else {
    delete next.languages_other;
  }
  return next;
}

export function formatProfileLanguagesForDisplay(
  languages: readonly string[],
  languagesOther: string | null | undefined,
  locale: Locale,
): string[] {
  return formatListWithOtherDisplay([...languages], languagesOther, (value) =>
    translateProfileLabel(value, locale),
  );
}

export function formatProfileLanguagesLine(
  languages: readonly string[],
  languagesOther: string | null | undefined,
  locale: Locale,
): string {
  return formatProfileLanguagesForDisplay(languages, languagesOther, locale).join(", ");
}

export function toggleProfileLanguage(
  languages: readonly string[],
  languagesOther: string,
  lang: string,
): { languages: string[]; languagesOther: string } {
  if (languages.includes(lang)) {
    const next = languages.filter((l) => l !== lang);
    if (isOtherOptionValue(lang)) {
      return { languages: next, languagesOther: "" };
    }
    return { languages: next, languagesOther };
  }
  return { languages: [...languages, lang], languagesOther };
}

export function profileLanguagesOtherMissing(
  languages: readonly string[],
  languagesOther: string,
): boolean {
  return languages.some(isOtherOptionValue) && !languagesOther.trim();
}
