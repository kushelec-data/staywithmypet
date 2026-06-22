import { isOtherOptionValue, OTHER_OPTION_VALUE } from "@/lib/other-option";

/** Stored care type values — keep unchanged in DB and new records. */
export const CANONICAL_CARE_TYPE_OPTIONS = [
  "Walks only",
  "Daycare",
  "Home visits",
  "Feeding only",
  "Play visits",
  "Overnight care / 24h stay",
] as const;

export type CanonicalCareType = (typeof CANONICAL_CARE_TYPE_OPTIONS)[number];

/** Multi-select forms (pet profile, Pet Friend / Parent preferences). */
export const careTypeOptions = [...CANONICAL_CARE_TYPE_OPTIONS, "Other"] as const;

/** Single-select request form — no custom “Other” value. */
export const careTypeRequestOptions = [...CANONICAL_CARE_TYPE_OPTIONS] as const;

export type CareTypeFilterOption = {
  value: string;
  label: string;
  aliases?: readonly string[];
};

/** User-facing English labels for stored care type values. */
const CARE_TYPE_DISPLAY_LABEL_EN: Record<string, string> = {
  "Walks only": "Walks",
};

function careTypeDisplayLabelEn(canonicalOrStored: string): string {
  return CARE_TYPE_DISPLAY_LABEL_EN[canonicalOrStored] ?? canonicalOrStored;
}

/** Search filters (Find Pets + Find Care). Value is stored; label is user-facing. */
export const CARE_TYPE_FILTER_OPTIONS: CareTypeFilterOption[] = [
  { value: "Walks only", label: "Walks", aliases: ["Walks", "walks_only"] },
  { value: "Daycare", label: "Daycare" },
  {
    value: "Home visits",
    label: "Home visits",
    aliases: ["Visits", "Visits / check-ins"],
  },
  { value: "Feeding only", label: "Feeding only", aliases: ["Feeding"] },
  { value: "Play visits", label: "Play visits" },
  {
    value: "Overnight care / 24h stay",
    label: "Overnight care / 24h stay",
    aliases: ["Overnight stays", "Overnight stay", "Overnight"],
  },
];

const CANONICAL_SET = new Set<string>(CANONICAL_CARE_TYPE_OPTIONS);

/** Retired filter values — still readable on old records; never offered in UI. */
const DEPRECATED_CARE_TYPE_LABELS: Record<string, string> = {
  "long-term": "Long-term care",
  "long-term care": "Long-term care",
  "long term": "Long-term care",
  "long term care": "Long-term care",
  emergency: "Emergency care",
  "emergency care": "Emergency care",
};

const LEGACY_TO_CANONICAL: Record<string, CanonicalCareType> = {
  walks: "Walks only",
  walks_only: "Walks only",
  "walks only": "Walks only",
  visits: "Home visits",
  "visits / check-ins": "Home visits",
  feeding: "Feeding only",
  "feeding only": "Feeding only",
  "play visits": "Play visits",
  overnight: "Overnight care / 24h stay",
  "overnight stays": "Overnight care / 24h stay",
  "overnight stay": "Overnight care / 24h stay",
  "overnight care / 24h stay": "Overnight care / 24h stay",
  daycare: "Daycare",
  "home visits": "Home visits",
};

const REMOVED_FILTER_KEYS = new Set(["long-term", "long-term care", "long term", "emergency", "emergency care"]);

function normKey(s: string): string {
  return s.trim().toLowerCase();
}

function aliasesForFilterValue(selected: string): string[] {
  const opt = CARE_TYPE_FILTER_OPTIONS.find((o) => o.value === selected);
  if (!opt) return [selected];
  return [opt.value, ...(opt.aliases ?? [])];
}

/** All string variants that match a selected filter chip (includes legacy DB values). */
export function careTypeFilterMatchVariants(selected: string): string[] {
  return aliasesForFilterValue(selected);
}

/** Map legacy stored / URL values to a canonical filter value, or null if removed/unknown. */
export function normalizeCareTypeFilterValue(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const key = normKey(trimmed);
  if (REMOVED_FILTER_KEYS.has(key)) return null;
  if (CANONICAL_SET.has(trimmed)) return trimmed;

  const legacy = LEGACY_TO_CANONICAL[key];
  if (legacy) return legacy;

  for (const opt of CARE_TYPE_FILTER_OPTIONS) {
    if (normKey(opt.value) === key) return opt.value;
    if (opt.aliases?.some((alias) => normKey(alias) === key)) return opt.value;
  }

  return null;
}

/** Resolve any stored/legacy care type string to its canonical stored value. */
export function resolveCanonicalCareTypeStored(raw: string): string {
  const trimmed = raw.trim();
  if (CANONICAL_SET.has(trimmed)) return trimmed;

  const key = normKey(trimmed);
  const legacy = LEGACY_TO_CANONICAL[key];
  if (legacy) return legacy;

  for (const opt of CARE_TYPE_FILTER_OPTIONS) {
    if (normKey(opt.value) === key) return opt.value;
    if (opt.aliases?.some((alias) => normKey(alias) === key)) return opt.value;
  }

  return trimmed;
}

/** Drop duplicate care types (e.g. walks_only + Walks only + Walks → one entry). */
export function dedupeCareTypeValues(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of values) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;

    if (isOtherOptionValue(trimmed)) {
      if (seen.has(OTHER_OPTION_VALUE)) continue;
      seen.add(OTHER_OPTION_VALUE);
      out.push(trimmed);
      continue;
    }

    const canonical = resolveCanonicalCareTypeStored(trimmed);
    const key = normKey(canonical);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }

  return out;
}

export function dedupeCareTypeDisplayLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const label of labels) {
    const key = normKey(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }

  return out;
}

/** Human-readable label for any stored care type (canonical, legacy, or deprecated). */
export function formatCareTypeLabel(
  raw: string | null | undefined,
  otherCustom?: string | null,
): string | null {
  if (!raw?.trim()) return null;
  if (isOtherOptionValue(raw)) {
    return otherCustom?.trim() || "Other";
  }

  const trimmed = raw.trim();
  const key = normKey(trimmed);

  if (CANONICAL_SET.has(trimmed)) return careTypeDisplayLabelEn(trimmed);

  const canonical = LEGACY_TO_CANONICAL[key];
  if (canonical) return careTypeDisplayLabelEn(canonical);

  const deprecated = DEPRECATED_CARE_TYPE_LABELS[key];
  if (deprecated) return deprecated;

  for (const opt of CARE_TYPE_FILTER_OPTIONS) {
    if (normKey(opt.value) === key) return careTypeDisplayLabelEn(opt.value);
    if (opt.aliases?.some((alias) => normKey(alias) === key)) {
      return careTypeDisplayLabelEn(opt.value);
    }
  }

  return trimmed;
}

/** Format a list of stored care types for display (deduped). */
export function formatCareTypeLabels(
  values: string[],
  otherCustom?: string | null,
): string[] {
  const labels = dedupeCareTypeValues(values)
    .map((v) => formatCareTypeLabel(v, otherCustom))
    .filter((label): label is string => Boolean(label?.trim()));

  return dedupeCareTypeDisplayLabels(labels);
}
