/** Find Care / Pet Friend search filter options. */

import { CARE_TYPE_FILTER_OPTIONS } from "@/lib/care-type-options";
import {
  buildLocalizedFilterOption,
  type LocalizedFilterOption,
} from "@/lib/filter-option-labels";

export const petFriendSearchTypeOptions: LocalizedFilterOption[] = [
  buildLocalizedFilterOption("dog", "Dogs", ["Dog", "dog"], "petFriend"),
  buildLocalizedFilterOption("cat", "Cats", ["Cat", "cat"], "petFriend"),
  buildLocalizedFilterOption("rabbit", "Rabbits", ["Rabbit", "rabbit"], "petFriend"),
  buildLocalizedFilterOption("bird", "Birds", ["Bird", "bird"], "petFriend"),
  buildLocalizedFilterOption(
    "rodent",
    "Rodent",
    ["rodent", "rodents", "small-mammal", "small_mammal", "small mammal"],
    "petFriend",
  ),
  buildLocalizedFilterOption("fish", "Fish", ["fish"], "petFriend"),
  buildLocalizedFilterOption("reptile", "Reptiles", ["Reptile", "reptile"], "petFriend"),
  buildLocalizedFilterOption("other", "Other", ["other"], "petFriend"),
];

export const petFriendSearchCareTypeOptions: LocalizedFilterOption[] =
  CARE_TYPE_FILTER_OPTIONS.map((opt) =>
    buildLocalizedFilterOption(opt.value, opt.label, opt.aliases, "petFriend"),
  );

export const petFriendSearchExperienceOptions: LocalizedFilterOption[] = [
  buildLocalizedFilterOption(
    "first_time",
    "First-time Pet Friend",
    ["Beginner", "first-time", "first time", "First-timer", "First-time Pet Friend"],
    "petFriend",
  ),
  buildLocalizedFilterOption(
    "some_experience",
    "Some pet care experience",
    ["Some experience", "Intermediate", "intermediate"],
    "petFriend",
  ),
  buildLocalizedFilterOption(
    "experienced",
    "Experienced with pets",
    ["Experienced sitter", "Very experienced", "Experienced"],
    "petFriend",
  ),
];

export const petFriendSearchHomeOptions: LocalizedFilterOption[] = [
  buildLocalizedFilterOption("has_garden", "Has garden", ["Garden"], "petFriend"),
  buildLocalizedFilterOption("apartment_ok", "Apartment OK", ["Apartment"], "petFriend"),
  buildLocalizedFilterOption("no_other_pets", "No other pets", undefined, "petFriend"),
  buildLocalizedFilterOption("has_other_pets", "Has other pets", ["Other Pets"], "petFriend"),
  buildLocalizedFilterOption("children_at_home", "Children at home", ["Kids"], "petFriend"),
  buildLocalizedFilterOption("smoke_free", "Smoke-free home", undefined, "petFriend"),
];

export const petFriendSearchLanguageOptions: LocalizedFilterOption[] = [
  buildLocalizedFilterOption("English", "English", undefined, "petFriend"),
  buildLocalizedFilterOption("Estonian", "Estonian", undefined, "petFriend"),
  buildLocalizedFilterOption("Russian", "Russian", undefined, "petFriend"),
  buildLocalizedFilterOption("Other", "Other", undefined, "petFriend"),
];
