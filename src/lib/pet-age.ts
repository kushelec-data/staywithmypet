import { parseISODateLocal } from "@/lib/pet-availability";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Human-readable age from YYYY-MM-DD (local calendar).
 * Returns null if invalid or future date.
 */
export function formatPetAgeFromDateOfBirth(iso: string | null | undefined): string | null {
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
      if (dayCount < 7) return dayCount <= 1 ? "Newborn" : `${dayCount} days old`;
      const weeks = Math.floor(dayCount / 7);
      return `${weeks} week${weeks === 1 ? "" : "s"} old`;
    }
    return `${totalMonths} month${totalMonths === 1 ? "" : "s"} old`;
  }

  return `${years} year${years === 1 ? "" : "s"} old`;
}

export function isIsoDateString(value: string): boolean {
  return ISO_DATE.test(value.trim());
}
