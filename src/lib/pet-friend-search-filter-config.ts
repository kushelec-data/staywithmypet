/** Find Care / Pet Friend search filter options. */

export const petFriendSearchTypeOptions = [
  { value: "dog", label: "Dogs", aliases: ["dog"] },
  { value: "cat", label: "Cats", aliases: ["cat"] },
  { value: "rabbit", label: "Rabbits", aliases: ["rabbit"] },
  { value: "bird", label: "Birds", aliases: ["bird"] },
  {
    value: "rodent",
    label: "Rodent",
    aliases: ["rodent", "rodents", "small-mammal", "small_mammal", "small mammal"],
  },
  { value: "fish", label: "Fish", aliases: ["fish"] },
  { value: "reptile", label: "Reptiles", aliases: ["reptile"] },
  { value: "other", label: "Other", aliases: ["other"] },
] as const;

import { CARE_TYPE_FILTER_OPTIONS } from "@/lib/care-type-options";

export const petFriendSearchCareTypeOptions = CARE_TYPE_FILTER_OPTIONS;

export const petFriendSearchExperienceOptions = [
  {
    value: "first_time",
    label: "First-time Pet Friend",
    aliases: [
      "Beginner",
      "first-time",
      "first time",
      "First-time Pet Friend",
    ],
  },
  {
    value: "some_experience",
    label: "Some pet care experience",
    aliases: ["Some experience", "Intermediate", "intermediate"],
  },
  {
    value: "experienced",
    label: "Experienced with pets",
    aliases: ["Experienced sitter", "Very experienced", "Experienced"],
  },
] as const;

export const petFriendSearchHomeOptions = [
  { value: "has_garden", label: "Has garden" },
  { value: "apartment_ok", label: "Apartment OK" },
  { value: "no_other_pets", label: "No other pets" },
  { value: "has_other_pets", label: "Has other pets" },
  { value: "children_at_home", label: "Children at home" },
  { value: "smoke_free", label: "Smoke-free home" },
] as const;

export const petFriendSearchLanguageOptions = [
  { value: "English", label: "English" },
  { value: "Estonian", label: "Estonian" },
  { value: "Russian", label: "Russian" },
  { value: "Other", label: "Other" },
] as const;
