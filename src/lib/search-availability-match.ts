import { normalizeAvailabilityDates } from "@/lib/pet-availability";

/** Match listing availability against user-selected filter dates (any overlap). */
export function matchesSearchAvailabilityDates(
  listingDates: string[],
  selectedDates: string[],
): boolean {
  const selected = normalizeAvailabilityDates(selectedDates);
  if (!selected.length) return true;
  const listing = normalizeAvailabilityDates(listingDates);
  if (!listing.length) return false;
  const wanted = new Set(selected);
  return listing.some((d) => wanted.has(d.slice(0, 10)));
}
