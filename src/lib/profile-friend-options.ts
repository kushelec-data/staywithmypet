import { careTypeOptions, petTypeOptions, sizeOptions } from "@/lib/legacy/search-filters";
import {
  experienceLevelOptions,
  preferredCareLocationOptions,
} from "@/lib/pet-care-labels";

export { experienceLevelOptions, preferredCareLocationOptions };

export const livingTypeOptions = ["Apartment", "House", "Other"] as const;

/** Legacy DB values — Townhouse merged into House in the picker. */
export function normalizeLivingTypeValue(value: string | null | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return livingTypeOptions[0];
  if (trimmed === "Townhouse") return "House";
  return trimmed;
}

export const preferredDaysTimesOptions = [
  "Weekdays",
  "Weekends",
  "Mornings",
  "Afternoons",
  "Evenings",
  "Flexible",
] as const;

export const durationOfCareOptions = [
  "A few hours",
  "One day",
  "Several days",
  "One week",
  "Longer stays",
  "Flexible",
] as const;

export { petTypeOptions, sizeOptions, careTypeOptions };
