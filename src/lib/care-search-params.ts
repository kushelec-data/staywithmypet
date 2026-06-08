/** URL query helpers for pre-filtering /find-care by care type. */

import { normalizeCareTypeFilterValue } from "@/lib/care-type-options";

export const CARE_TYPES_QUERY_KEY = "careTypes";

export function buildFindCareUrl(careTypeFilter: string): string {
  const params = new URLSearchParams();
  const normalized = normalizeCareTypeFilterValue(careTypeFilter) ?? careTypeFilter.trim();
  params.set(CARE_TYPES_QUERY_KEY, normalized);
  return `/find-care?${params.toString()}`;
}

export function parseCareTypesQuery(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of value.split(",")) {
    const normalized = normalizeCareTypeFilterValue(part);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}
