import type { Locale } from "@/i18n/translations";
import { parseISODateLocal } from "@/lib/pet-availability";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Human-readable age from YYYY-MM-DD (local calendar).
 * Returns null if invalid or future date.
 */
function ageUnit(
  count: number,
  enSingular: string,
  enPlural: string,
  etSuffix: string,
  locale: Locale,
): string {
  if (locale === "et") return `${count} ${etSuffix}`;
  return `${count} ${count === 1 ? enSingular : enPlural} old`;
}

export function formatPetAgeFromDateOfBirth(
  iso: string | null | undefined,
  locale: Locale = "en",
): string | null {
  if (!iso?.trim() || !ISO_DATE.test(iso.trim())) return null;
  const birth = parseISODateLocal(iso.trim());
  if (!birth) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const b = new Date(birth);
  b.setHours(0, 0, 0, 0);
  if (b > today) return null;

  let years = today.getFullYear() - b.getFullYear();
  let months = today.getMonth() - b.getMonth();
  let days = today.getDate() - b.getDate();
  if (days < 0) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const totalMonths = years * 12 + months;

  if (totalMonths < 12) {
    if (totalMonths <= 0) {
      const diffMs = today.getTime() - b.getTime();
      const dayCount = Math.max(0, Math.floor(diffMs / 86400000));
      if (dayCount < 7) {
        if (dayCount <= 1) return locale === "et" ? "Vastsündinu" : "Newborn";
        return ageUnit(dayCount, "day", "days", "päeva vana", locale);
      }
      const weeks = Math.floor(dayCount / 7);
      return ageUnit(weeks, "week", "weeks", "nädalat vana", locale);
    }
    return ageUnit(totalMonths, "month", "months", "kuud vana", locale);
  }

  return ageUnit(years, "year", "years", "aastat vana", locale);
}

export function isIsoDateString(value: string): boolean {
  return ISO_DATE.test(value.trim());
}
