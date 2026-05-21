/** Weight categories for pets (stored in `pets.size_label` and friend `preferred_pet_sizes`). */

export const PET_WEIGHT_CATEGORY_KEYS = [
  "under_5_kg",
  "5_10_kg",
  "10_15_kg",
  "over_15_kg",
] as const;

export type PetWeightCategoryKey = (typeof PET_WEIGHT_CATEGORY_KEYS)[number];

export const PET_WEIGHT_CATEGORY_OPTIONS = [
  { value: "under_5_kg", label: "Tiny / Under 5 kg" },
  { value: "5_10_kg", label: "Small–Medium / 5–10 kg" },
  { value: "10_15_kg", label: "Medium–Large / 10–15 kg" },
  { value: "over_15_kg", label: "Large / Over 15 kg" },
] as const;

/** Short kg line for cards: “Breed · 5–10 kg · 3 years old”. */
export function petWeightCategoryShortLabel(key: string | null | undefined): string | null {
  const k = normalizePetWeightStorageValue(key);
  if (!k) return null;
  switch (k) {
    case "under_5_kg":
      return "Under 5 kg";
    case "5_10_kg":
      return "5–10 kg";
    case "10_15_kg":
      return "10–15 kg";
    case "over_15_kg":
      return "Over 15 kg";
    default:
      return null;
  }
}

/** Full UI label (forms, filters). */
export function petWeightCategoryFullLabel(key: string | null | undefined): string | null {
  const k = normalizePetWeightStorageValue(key);
  if (!k) return null;
  const opt = PET_WEIGHT_CATEGORY_OPTIONS.find((o) => o.value === k);
  return opt?.label ?? null;
}

/**
 * Normalize DB / legacy values to a canonical key.
 * Legacy: Small / Medium / Large → approximate weight bands.
 */
export function normalizePetWeightStorageValue(raw: string | null | undefined): PetWeightCategoryKey | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  if ((PET_WEIGHT_CATEGORY_KEYS as readonly string[]).includes(t)) {
    return t as PetWeightCategoryKey;
  }
  const lower = t.toLowerCase();
  if (lower === "small") return "5_10_kg";
  if (lower === "medium") return "10_15_kg";
  if (lower === "large") return "over_15_kg";
  /** Human-readable fragments */
  if (/under\s*5|tiny|under.?5\s*kg/i.test(t)) return "under_5_kg";
  if (/5\s*[–-]\s*10|5.?10\s*kg/i.test(t)) return "5_10_kg";
  if (/10\s*[–-]\s*15|10.?15\s*kg/i.test(t)) return "10_15_kg";
  if (/over\s*15|15\s*[+]|large.*kg/i.test(t)) return "over_15_kg";
  return null;
}

/** For friend profile summaries: turn stored keys into short labels. */
export function formatPreferredPetWeightSizes(sizes: string[]): string[] {
  return sizes
    .map((s) => petWeightCategoryFullLabel(s) ?? petWeightCategoryShortLabel(s) ?? s)
    .filter(Boolean);
}

/** Friend profile `preferred_pet_sizes`: normalize legacy labels to canonical keys. */
export function normalizePreferredPetSizesList(sizes: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of sizes) {
    const key =
      normalizePetWeightStorageValue(raw) ??
      ((PET_WEIGHT_CATEGORY_KEYS as readonly string[]).includes(raw)
        ? (raw as PetWeightCategoryKey)
        : null);
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}
