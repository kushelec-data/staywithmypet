export const petAnimalTypes = [
  { value: "dog", label: "Dog" },
  { value: "cat", label: "Cat" },
  { value: "rabbit", label: "Rabbit" },
  { value: "bird", label: "Bird" },
  { value: "rodent", label: "Rodent" },
  { value: "fish", label: "Fish" },
  { value: "reptile", label: "Reptile" },
  { value: "other", label: "Other" },
] as const;

import { PET_WEIGHT_CATEGORY_OPTIONS } from "@/lib/pet-weight";

export const petGenderOptions = ["Male", "Female", "Neutered", "Other"] as const;

/** Weight band options for create/edit pet (stored in `size_label`). */
export const petSizeOptions = PET_WEIGHT_CATEGORY_OPTIONS.map((o) => ({ ...o }));

export const petEnergyOptions = ["Low", "Medium", "High"] as const;

export const petTemperamentOptions = [
  "Friendly",
  "Shy",
  "Vocal",
  "Active",
  "Calm",
  "Kid-friendly",
  "Dog-friendly",
  "Cat-friendly",
  "Protective",
] as const;

export const petWalkNeedsOptions = ["None", "1x per day", "2x per day", "More"] as const;

export const petFriendRequirementOptions = [
  "Experienced only",
  "No children",
  "No other pets",
  "Non-smoker",
  "Pet-friendly home",
  "No specific requirements",
] as const;

export const petCareLocationOptions = [
  "At pet friend's home",
  "At pet owner's home",
  "Either / flexible",
] as const;

export const petCareTypeOptions = [
  "Walks",
  "Daycare",
  "Home visits",
  "Feeding only",
  "Play visits",
  "Overnight care / 24h stay",
] as const;

export const estoniaLocationSuggestions = [
  "Tallinn",
  "Tartu",
  "Pärnu",
  "Narva",
  "Viimsi",
  "Keila",
  "Haapsalu",
  "Kuressaare",
] as const;
