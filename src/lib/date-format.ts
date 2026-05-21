import {
  eachISODateInRangeInclusive,
  normalizeAvailabilityDates,
  parseISODateLocal,
} from "@/lib/pet-availability";
import type { Locale } from "@/i18n/translations";

export type DateFormatLocale = Locale | string | undefined;

export type FormatAvailabilityDatesOptions = {
  locale?: DateFormatLocale;
  maxPreview?: number;
  /** When true, only dates on or after today (local) are included. */
  upcomingOnly?: boolean;
};

export type FormatAvailabilityDatesResult = {
  previewLabels: string[];
  previewIsos: string[];
  moreCount: number;
  totalCount: number;
};

/** Map app locale to BCP 47 for Intl. */
export function resolveDateLocale(locale?: DateFormatLocale): string {
  if (locale === "et") return "et-EE";
  if (locale === "en") return "en-US";
  if (typeof locale === "string" && locale.trim()) return locale;
  return "en-US";
}

export type FormatDateOptions = {
  /** Full month + day + year, e.g. "May 21, 2026" (emails). */
  includeYear?: boolean;
};

/** Compact single date, e.g. "May 1"; with `includeYear`, e.g. "May 21, 2026". */
export function formatDate(
  iso: string,
  locale?: DateFormatLocale,
  options?: FormatDateOptions,
): string {
  const d = parseISODateLocal(iso);
  if (!d) return iso;
  if (options?.includeYear) {
    return new Intl.DateTimeFormat(resolveDateLocale(locale), {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(d);
  }
  return new Intl.DateTimeFormat(resolveDateLocale(locale), {
    month: "short",
    day: "numeric",
  }).format(d);
}

/**
 * Inclusive range label: "May 1–5" (same month) or "May 28 – Jun 2" (cross-month).
 * Single day → "May 1".
 */
export function formatDateRange(
  start: string,
  end: string,
  locale?: DateFormatLocale,
  options?: FormatDateOptions,
): string {
  const ds = parseISODateLocal(start);
  const de = parseISODateLocal(end);
  if (!ds || !de) {
    if (start === end) return formatDate(start, locale, options);
    return `${formatDate(start, locale, options)} – ${formatDate(end, locale, options)}`;
  }

  if (
    ds.getFullYear() === de.getFullYear() &&
    ds.getMonth() === de.getMonth() &&
    ds.getDate() === de.getDate()
  ) {
    return formatDate(start, locale, options);
  }

  if (options?.includeYear) {
    return `${formatDate(start, locale, options)} – ${formatDate(end, locale, options)}`;
  }

  const loc = resolveDateLocale(locale);
  const sameMonth =
    ds.getFullYear() === de.getFullYear() && ds.getMonth() === de.getMonth();

  if (sameMonth) {
    const month = new Intl.DateTimeFormat(loc, { month: "short" }).format(ds);
    return `${month} ${ds.getDate()}–${de.getDate()}`;
  }

  return `${formatDate(start, locale, options)} – ${formatDate(end, locale, options)}`;
}

/** Comma-separated short dates with optional overflow suffix. */
export function formatDateListShort(
  dates: string[] | null | undefined,
  options?: { locale?: DateFormatLocale; maxShown?: number },
): string | null {
  const sorted = normalizeAvailabilityDates(dates ?? []);
  if (!sorted.length) return null;

  const maxShown = options?.maxShown ?? sorted.length;
  const shown = sorted.slice(0, maxShown);
  const labels = shown.map((iso) => formatDate(iso, options?.locale));
  const more = sorted.length > maxShown ? ` (+${sorted.length - maxShown} more)` : "";
  return `${labels.join(", ")}${more}`;
}

/** When dates form one contiguous range, compact range; otherwise comma list. */
export function formatAvailabilityRangeOrList(
  dates: string[] | null | undefined,
  locale?: DateFormatLocale,
): string | null {
  const sorted = normalizeAvailabilityDates(dates ?? []);
  if (!sorted.length) return null;

  if (sorted.length === 1) return formatDate(sorted[0]!, locale);

  const full = eachISODateInRangeInclusive(sorted[0]!, sorted[sorted.length - 1]!);
  if (full.length === sorted.length) {
    return formatDateRange(sorted[0]!, sorted[sorted.length - 1]!, locale);
  }

  return formatDateListShort(sorted, { locale });
}

/** Prefix helper for availability summaries, e.g. "Available May 1–5". */
export function formatAvailableLabel(
  dates: string[] | null | undefined,
  locale?: DateFormatLocale,
): string | null {
  const body = formatAvailabilityRangeOrList(dates, locale);
  return body ? `Available ${body}` : null;
}

/** Chip preview labels + overflow count for card UIs. */
export function formatAvailabilityDates(
  dates: string[] | null | undefined,
  options?: FormatAvailabilityDatesOptions,
): FormatAvailabilityDatesResult {
  const maxPreview = options?.maxPreview ?? 3;
  const sorted = normalizeAvailabilityDates(dates ?? []);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filtered = options?.upcomingOnly
    ? sorted.filter((iso) => {
        const d = parseISODateLocal(iso);
        return d && d >= today;
      })
    : sorted;

  if (!filtered.length) {
    return {
      previewLabels: [],
      previewIsos: [],
      moreCount: 0,
      totalCount: 0,
    };
  }

  const previewIsos = filtered.slice(0, maxPreview);
  const previewLabels = previewIsos.map((iso) => formatDate(iso, options?.locale));
  const moreCount = Math.max(0, filtered.length - maxPreview);

  return {
    previewLabels,
    previewIsos,
    moreCount,
    totalCount: filtered.length,
  };
}
