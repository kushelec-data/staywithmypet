/** URL query helpers for pre-filling search pages by location. */

export const SEARCH_LOCATION_QUERY_KEY = "location";

/** Append ?location= to a search href when a location is provided. */
export function appendSearchLocation(href: string, location: string): string {
  const trimmed = location.trim();
  if (!trimmed) return href;
  const params = new URLSearchParams();
  params.set(SEARCH_LOCATION_QUERY_KEY, trimmed);
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}${params.toString()}`;
}

/** Read and normalise the ?location= value from the URL. */
export function parseSearchLocationQuery(value: string | null | undefined): string {
  return value?.trim() ?? "";
}
