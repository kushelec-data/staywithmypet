/** Pet search filter options (from “Pet search filters” spec). */

export const petSearchTypeOptions = [
  { value: "dog", label: "Dog" },
  { value: "cat", label: "Cat" },
  { value: "rabbit", label: "Rabbit" },
  { value: "bird", label: "Bird" },
  { value: "rodent", label: "Rodent" },
  { value: "fish", label: "Fish" },
  { value: "reptile", label: "Reptile" },
  { value: "other", label: "Other" },
] as const;

export const petSearchSizeOptions = [
  { value: "under_5_kg", label: "Tiny / Under 5 kg" },
  { value: "5_10_kg", label: "Small–Medium / 5–10 kg" },
  { value: "10_15_kg", label: "Medium–Large / 10–15 kg" },
  { value: "over_15_kg", label: "Large / Over 15 kg" },
] as const;

export const petSearchEnergyOptions = [
  { value: "Low", label: "Low (chill mode)" },
  { value: "Medium", label: "Moderate (ready to play)" },
  { value: "High", label: "High (zoomies all day)" },
] as const;

export const petSearchTemperamentOptions = [
  { value: "Kid-friendly", label: "Kid-friendly" },
  { value: "Friendly with dogs", label: "Friendly with dogs", aliases: ["Dog-friendly"] },
  { value: "Friendly with cats", label: "Friendly with cats", aliases: ["Cat-friendly"] },
  { value: "Shy", label: "Shy" },
  { value: "Independent", label: "Independent" },
  { value: "Playful", label: "Playful", aliases: ["Active"] },
  { value: "Calm", label: "Calm" },
  { value: "Protective", label: "Protective" },
] as const;

export const petSearchMedicalOptions = [
  { value: "needs_medication", label: "Needs medication" },
  { value: "no_medication", label: "No medication needed" },
] as const;

export const petSearchActivityOptions = [
  { value: "None", label: "None" },
  { value: "Short walks", label: "Short walks" },
  { value: "Long walks", label: "Long walks" },
  { value: "High activity", label: "High activity" },
  { value: "Outdoor play", label: "Outdoor play" },
] as const;

export const petSearchCareLocationOptions = [
  { value: "At pet friend's home", label: "At pet friend's home" },
  { value: "At pet owner's home", label: "At pet parent's home" },
  { value: "Either / flexible", label: "Flexible — either home works" },
] as const;

export const petSearchCareTypeOptions = [
  { value: "Walks", label: "Walks", aliases: ["Walks only"] },
  { value: "Daycare", label: "Daycare" },
  { value: "Overnight care / 24h stay", label: "Overnight", aliases: ["Overnight stays"] },
  { value: "Long-term care", label: "Long-term" },
  { value: "Home visits", label: "Visits", aliases: ["Play visits", "Visits / check-ins"] },
  { value: "Feeding only", label: "Feeding", aliases: ["Feeding"] },
  { value: "Emergency care", label: "Emergency care", aliases: ["Emergency"] },
] as const;

export const petSearchLanguageOptions = [
  { value: "English", label: "English" },
  { value: "Estonian", label: "Estonian" },
  { value: "Russian", label: "Russian" },
  { value: "Other", label: "Other" },
] as const;
