/** URL query helpers for pre-filtering /find-care by care type. */

export const CARE_TYPES_QUERY_KEY = "careTypes";

export function buildFindCareUrl(careTypeFilter: string): string {
  const params = new URLSearchParams();
  params.set(CARE_TYPES_QUERY_KEY, careTypeFilter);
  return `/find-care?${params.toString()}`;
}

export function parseCareTypesQuery(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
