import { formatAvailabilityDates } from "@/lib/date-format";
import { normalizeAvailabilityDates, parseISODateLocal } from "@/lib/pet-availability";

export type PetAvailabilityCardPreview = {
  hasDates: boolean;
  previewLabels: string[];
  previewIsos: string[];
  moreCount: number;
  totalCount: number;
  allDates: string[];
};

/** First few dates for card preview; remainder as +N more. */
export function buildPetAvailabilityCardPreview(
  dates: string[] | null | undefined,
  maxPreview = 3,
  locale?: string,
): PetAvailabilityCardPreview {
  const sorted = normalizeAvailabilityDates(dates ?? []);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = sorted.filter((iso) => {
    const d = parseISODateLocal(iso);
    return d && d >= today;
  });

  const formatted = formatAvailabilityDates(upcoming, {
    maxPreview,
    locale,
  });

  if (!formatted.totalCount) {
    return {
      hasDates: false,
      previewLabels: [],
      previewIsos: [],
      moreCount: 0,
      totalCount: 0,
      allDates: [],
    };
  }

  return {
    hasDates: true,
    previewLabels: formatted.previewLabels,
    previewIsos: formatted.previewIsos,
    moreCount: formatted.moreCount,
    totalCount: formatted.totalCount,
    allDates: upcoming,
  };
}
