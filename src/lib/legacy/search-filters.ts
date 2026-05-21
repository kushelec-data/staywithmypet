export const petTypeOptions = [
  { value: "dog", label: "Dog" },
  { value: "cat", label: "Cat" },
  { value: "rabbit", label: "Rabbit" },
  { value: "bird", label: "Bird" },
  { value: "fish", label: "Fish" },
  { value: "reptile", label: "Reptile" },
  { value: "small-mammal", label: "Small mammal" },
  { value: "other", label: "Other" },
];

/** Preferred pet weight bands (matches `pets.size_label` keys). */
export const sizeOptions = ["under_5_kg", "5_10_kg", "10_15_kg", "over_15_kg"] as const;

export const energyLevelOptions = ["High", "Moderate", "Low"] as const;

export const temperamentOptions = [
  "Kid-friendly",
  "Dog-friendly",
  "Cat-friendly",
] as const;

export const walkNeedsOptions = [
  "none",
  "1x per day",
  "2x per day",
  "more",
] as const;

export const serviceOptions = [
  { value: "borrower", label: "Pet Friend (borrower)" },
  { value: "owner", label: "Pet Parent (owner)" },
  { value: "both", label: "Both" },
] as const;

export const careTypeOptions = [
  "Walks only",
  "Daycare",
  "Home visits",
  "Feeding only",
  "Play visits",
  "Overnight stays",
] as const;

export const languageOptions = [
  "English",
  "Estonian",
  "Russian",
  "Finnish",
  "German",
  "French",
  "Spanish",
] as const;
