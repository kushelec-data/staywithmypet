import type { Locale } from "@/i18n";

/** Language the member uses for bio and profile text (not spoken languages). */
export type ProfileContentLanguage = "en" | "et" | "ru" | "fi";

export const PROFILE_CONTENT_LANGUAGE_OPTIONS: ProfileContentLanguage[] = [
  "en",
  "et",
  "ru",
  "fi",
];

const VALID_CODES = new Set<string>(PROFILE_CONTENT_LANGUAGE_OPTIONS);

export function parseProfileContentLanguage(value: unknown): ProfileContentLanguage | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!VALID_CODES.has(normalized)) return null;
  return normalized as ProfileContentLanguage;
}

export function resolveProfileContentLanguage(row: {
  profile_language?: unknown;
  details?: unknown;
}): ProfileContentLanguage | null {
  const fromColumn = parseProfileContentLanguage(row.profile_language);
  if (fromColumn) return fromColumn;
  if (!row.details || typeof row.details !== "object" || Array.isArray(row.details)) {
    return null;
  }
  return parseProfileContentLanguage((row.details as Record<string, unknown>).profile_language);
}

export function siteLocaleToContentLanguage(locale: Locale): ProfileContentLanguage {
  return locale === "et" ? "et" : "en";
}

export function shouldShowProfileTranslationHelper(
  profileLanguage: ProfileContentLanguage | null | undefined,
  siteLocale: Locale,
): boolean {
  if (!profileLanguage) return false;
  return profileLanguage !== siteLocaleToContentLanguage(siteLocale);
}

export function mergeProfileContentLanguageIntoDetails(
  details: Record<string, unknown>,
  profileLanguage: ProfileContentLanguage | "" | null | undefined,
): Record<string, unknown> {
  const next = { ...details };
  const parsed = parseProfileContentLanguage(profileLanguage);
  if (parsed) {
    next.profile_language = parsed;
  } else {
    delete next.profile_language;
  }
  return next;
}

/** Chip / select label in the current UI locale. */
export function profileContentLanguageLabel(
  code: ProfileContentLanguage,
  locale: Locale,
): string {
  const labels: Record<ProfileContentLanguage, Record<Locale, string>> = {
    en: { en: "English", et: "Inglise" },
    et: { en: "Estonian", et: "Eesti" },
    ru: { en: "Russian", et: "Vene" },
    fi: { en: "Finnish", et: "Soome" },
  };
  return labels[code][locale];
}

/** Language name embedded in the translation-helper sentence. */
export function profileContentLanguageInSentence(
  code: ProfileContentLanguage,
  locale: Locale,
): string {
  if (locale === "et") {
    const et: Record<ProfileContentLanguage, string> = {
      en: "inglise",
      et: "eesti",
      ru: "vene",
      fi: "soome",
    };
    return et[code];
  }
  return profileContentLanguageLabel(code, locale);
}
