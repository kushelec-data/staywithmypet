import { isOtherOptionValue } from "@/lib/other-option";

export type PetTypeOption = { value: string; label: string };

/** Profile / preference pet type chips (Pet Friend care prefs, Pet Parent preferences, search). */
export const PET_TYPE_OPTIONS: PetTypeOption[] = [
  { value: "dog", label: "Dog" },
  { value: "cat", label: "Cat" },
  { value: "rabbit", label: "Rabbit" },
  { value: "bird", label: "Bird" },
  { value: "rodent", label: "Rodent" },
  { value: "fish", label: "Fish" },
  { value: "reptile", label: "Reptile" },
  { value: "other", label: "Other" },
];

/** @deprecated Use PET_TYPE_OPTIONS — kept for existing imports as `petTypeOptions`. */
export const petTypeOptions = PET_TYPE_OPTIONS;

const LEGACY_VALUE_ALIASES: Record<string, string> = {
  "small-mammal": "rodent",
  small_mammal: "rodent",
  "small mammal": "rodent",
};

const LEGACY_DISPLAY_LABELS: Record<string, string> = {
  "small-mammal": "Rodent",
  small_mammal: "Rodent",
  "small mammal": "Small mammal",
};

export function normalizePetTypeValue(value: string): string {
  const key = value.trim().toLowerCase();
  return LEGACY_VALUE_ALIASES[key] ?? key;
}

/** Normalize stored preference arrays (maps removed values like small-mammal → rodent). */
export function normalizePetTypeList(values: string[]): string[] {
  const out: string[] = [];
  for (const raw of values) {
    const v = normalizePetTypeValue(raw);
    if (!v || out.includes(v)) continue;
    out.push(v);
  }
  return out;
}

export function formatPetTypeLabel(value: string, otherCustom?: string | null): string {
  if (isOtherOptionValue(value)) {
    return otherCustom?.trim() || "Other";
  }
  const key = value.trim().toLowerCase();
  const normalized = normalizePetTypeValue(value);
  const fromOptions = PET_TYPE_OPTIONS.find((o) => o.value === normalized)?.label;
  if (fromOptions) return fromOptions;
  return LEGACY_DISPLAY_LABELS[key] ?? value;
}
