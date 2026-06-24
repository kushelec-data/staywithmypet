/** Pet search filter options (from “Pet search filters” spec). */

import { CARE_TYPE_FILTER_OPTIONS } from "@/lib/care-type-options";
import { buildLocalizedFilterOption, type LocalizedFilterOption } from "@/lib/filter-option-labels";

export const petSearchTypeOptions: LocalizedFilterOption[] = [
  buildLocalizedFilterOption("dog", "Dog"),
  buildLocalizedFilterOption("cat", "Cat"),
  buildLocalizedFilterOption("rabbit", "Rabbit"),
  buildLocalizedFilterOption("bird", "Bird"),
  buildLocalizedFilterOption("rodent", "Rodent"),
  buildLocalizedFilterOption("fish", "Fish"),
  buildLocalizedFilterOption("reptile", "Reptile"),
  buildLocalizedFilterOption("other", "Other"),
];

export const petSearchSizeOptions: LocalizedFilterOption[] = [
  buildLocalizedFilterOption("under_5_kg", "Tiny / Under 5 kg"),
  buildLocalizedFilterOption("5_10_kg", "Small-Medium / 5-10 kg", ["Small–Medium / 5–10 kg"]),
  buildLocalizedFilterOption("10_15_kg", "Medium-Large /10-15 kg", ["Medium–Large / 10–15 kg"]),
  buildLocalizedFilterOption("over_15_kg", "Large / Over 15 kg"),
];

export const petSearchEnergyOptions: LocalizedFilterOption[] = [
  buildLocalizedFilterOption("Low", "Low (prefers relaxing)", ["Low (chill mode)"]),
  buildLocalizedFilterOption("Medium", "Moderate (ready to play)"),
  buildLocalizedFilterOption("High", "High (full of energy)", ["High (zoomies all day)"]),
];

export const petSearchTemperamentOptions: LocalizedFilterOption[] = [
  buildLocalizedFilterOption("Kid-friendly", "Kid-friendly"),
  buildLocalizedFilterOption("Friendly with dogs", "Friendly with dogs", ["Dog-friendly"]),
  buildLocalizedFilterOption("Friendly with cats", "Friendly with cats", ["Cat-friendly"]),
  buildLocalizedFilterOption("Shy", "Shy"),
  buildLocalizedFilterOption("Independent", "Independent"),
  buildLocalizedFilterOption("Playful", "Playful", ["Active"]),
  buildLocalizedFilterOption("Calm", "Calm"),
];

export const petSearchActivityOptions: LocalizedFilterOption[] = [
  buildLocalizedFilterOption("None", "None"),
  buildLocalizedFilterOption("Short walks", "Short walks"),
  buildLocalizedFilterOption("Long walks", "Long walks"),
  buildLocalizedFilterOption("High activity", "High activity"),
  buildLocalizedFilterOption("Outdoor play", "Outdoor play"),
];

export const petSearchCareLocationOptions: LocalizedFilterOption[] = [
  buildLocalizedFilterOption("At pet friend's home", "At pet borrower's home", [
    "At pet friend's home",
  ]),
  buildLocalizedFilterOption("At pet owner's home", "At pet owner's home", [
    "At pet parent's home",
  ]),
  buildLocalizedFilterOption("Either / flexible", "Either / flexible", [
    "Flexible — either home works",
  ]),
];

export const petSearchCareTypeOptions: LocalizedFilterOption[] = CARE_TYPE_FILTER_OPTIONS.map(
  (opt) => buildLocalizedFilterOption(opt.value, opt.label, opt.aliases),
);

export const petSearchLanguageOptions: LocalizedFilterOption[] = [
  buildLocalizedFilterOption("English", "English"),
  buildLocalizedFilterOption("Estonian", "Estonian"),
  buildLocalizedFilterOption("Russian", "Russian"),
  buildLocalizedFilterOption("Other", "Other"),
];
