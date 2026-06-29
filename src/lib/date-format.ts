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

/** Monday 1 Jan 2024 — anchor for Mon–Sun calendar column headers. */
const CALENDAR_WEEKDAY_ANCHOR = new Date(2024, 0, 1);

/** Calendar nav title, e.g. "June 2026" / "juuni 2026". */
export function formatMonthYear(date: Date, locale?: DateFormatLocale): string {
  return new Intl.DateTimeFormat(resolveDateLocale(locale), {
    month: "long",
    year: "numeric",
  }).format(date);
}

/** Weekday column labels (Monday first). Compact → "E T K …" / "M T W …". */
export function formatCalendarWeekdayLabels(
  locale?: DateFormatLocale,
  compact = false,
): string[] {
  const formatter = new Intl.DateTimeFormat(resolveDateLocale(locale), {
    weekday: compact ? "narrow" : "short",
  });
  const labels: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(CALENDAR_WEEKDAY_ANCHOR);
    day.setDate(CALENDAR_WEEKDAY_ANCHOR.getDate() + i);
    labels.push(formatter.format(day));
  }
  return labels;
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

/** True when every ISO date in the sorted list forms one contiguous range (no gaps). */
export function areSelectedDatesConsecutive(dates: string[] | null | undefined): boolean {
  const sorted = normalizeAvailabilityDates(dates ?? []);
  if (sorted.length <= 1) return true;
  const full = eachISODateInRangeInclusive(sorted[0]!, sorted[sorted.length - 1]!);
  return full.length === sorted.length;
}

function formatDayCountSuffix(count: number, locale?: DateFormatLocale): string {
  const loc = resolveDateLocale(locale);
  if (loc.startsWith("et")) {
    return count === 1 ? "(1 päev)" : `(${count} päeva)`;
  }
  return count === 1 ? "(1 day)" : `(${count} days)`;
}

export type FormatBookingDatesOptions = {
  locale?: DateFormatLocale;
  includeYear?: boolean;
  /** When false, omits the "(N days)" suffix. Default true. */
  includeDayCount?: boolean;
};

/**
 * Request/booking date summary: consecutive → "Jun 6–10 (5 days)";
 * non-consecutive → "Jun 6, 7, 12, 14, 25, 26 (6 days)".
 */
/** Tailwind classes for long booking date strings in cards and headers. */
export const BOOKING_DATES_TEXT_CLASS = "min-w-0 break-words";

export type BookingDatesRowInput = {
  requested_dates?: string[] | null;
  requestedDates?: string[] | null;
  date_from?: string | null;
  date_to?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
};

const DATES_TO_BE_CONFIRMED = "Dates to be confirmed";

/**
 * Preferred label for requests/bookings/emails: uses `requested_dates` when present,
 * otherwise falls back to stored from/to span (legacy rows only).
 */
export function formatBookingDatesForRow(
  row: BookingDatesRowInput,
  options?: FormatBookingDatesOptions,
): string {
  const requested = normalizeAvailabilityDates(row.requested_dates ?? row.requestedDates ?? []);
  if (requested.length) {
    return formatBookingDates(requested, options) ?? DATES_TO_BE_CONFIRMED;
  }

  const from = row.date_from ?? (row.starts_at ? row.starts_at.slice(0, 10) : null);
  const to = row.date_to ?? (row.ends_at ? row.ends_at.slice(0, 10) : null);
  if (!from && !to) return DATES_TO_BE_CONFIRMED;
  if (from && to) {
    return formatDateRange(from, to, options?.locale, { includeYear: options?.includeYear });
  }
  if (from) return formatDate(from, options?.locale, { includeYear: options?.includeYear });
  if (to) return formatDate(to, options?.locale, { includeYear: options?.includeYear });
  return DATES_TO_BE_CONFIRMED;
}

export function formatBookingDates(
  selectedDates: string[] | null | undefined,
  options?: FormatBookingDatesOptions,
): string | null {
  const sorted = normalizeAvailabilityDates(selectedDates ?? []);
  if (!sorted.length) return null;

  const locale = options?.locale;
  const includeYear = options?.includeYear ?? false;
  const includeDayCount = options?.includeDayCount ?? true;
  const count = sorted.length;
  const suffix = includeDayCount ? ` ${formatDayCountSuffix(count, locale)}` : "";

  if (count === 1) {
    return `${formatDate(sorted[0]!, locale, { includeYear })}${suffix}`;
  }

  if (areSelectedDatesConsecutive(sorted)) {
    const range = formatDateRange(sorted[0]!, sorted[sorted.length - 1]!, locale, {
      includeYear,
    });
    return `${range}${suffix}`;
  }

  const labels = sorted.map((iso) => formatDate(iso, locale, { includeYear }));
  return `${labels.join(", ")}${suffix}`;
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

/** When dates form one contiguous range, compact range; otherwise comma list (no day count). */
export function formatAvailabilityRangeOrList(
  dates: string[] | null | undefined,
  locale?: DateFormatLocale,
): string | null {
  return formatBookingDates(dates, { locale, includeDayCount: false });
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
