import { careTypeOptions, petTypeOptions, sizeOptions } from "@/lib/legacy/search-filters";
import {
  experienceLevelOptions,
  preferredCareLocationOptions,
} from "@/lib/pet-care-labels";

export { experienceLevelOptions, preferredCareLocationOptions };

export const livingTypeOptions = ["Apartment", "House", "Townhouse", "Other"] as const;

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
