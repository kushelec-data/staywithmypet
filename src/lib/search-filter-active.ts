import { localizedLabelForValue, type LocalizedFilterOption } from "@/lib/filter-option-labels";
import {
  petSearchActivityOptions,
  petSearchCareLocationOptions,
  petSearchCareTypeOptions,
  petSearchEnergyOptions,
  petSearchLanguageOptions,
  petSearchSizeOptions,
  petSearchTemperamentOptions,
  petSearchTypeOptions,
} from "@/lib/pet-search-filter-config";
import type { Locale } from "@/i18n/translations";
import { getTranslations } from "@/i18n/translations";
import {
  petFriendSearchCareTypeOptions,
  petFriendSearchExperienceOptions,
  petFriendSearchHomeOptions,
  petFriendSearchLanguageOptions,
  petFriendSearchTypeOptions,
} from "@/lib/pet-friend-search-filter-config";
import { formatDate } from "@/lib/date-format";
import type { PetFriendSearchFilterState } from "@/lib/pet-friend-search";
import type { PetSearchFilterState } from "@/lib/public-pet-search";
import type { ActiveFilterChip } from "@/components/search/ActiveFilterChips";

function labelFor(
  options: readonly { value: string; label: string }[],
  value: string,
): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

function multiChipsLocalized(
  prefix: string,
  values: string[],
  options: readonly LocalizedFilterOption[],
  locale: Locale,
  onRemove: (value: string) => void,
): ActiveFilterChip[] {
  return values.map((value) => ({
    id: `${prefix}-${value}`,
    label: localizedLabelForValue(options, value, locale),
    onRemove: () => onRemove(value),
  }));
}

function multiChips(
  prefix: string,
  values: string[],
  options: readonly { value: string; label: string }[],
  onRemove: (value: string) => void,
): ActiveFilterChip[] {
  return values.map((value) => ({
    id: `${prefix}-${value}`,
    label: labelFor(options, value),
    onRemove: () => onRemove(value),
  }));
}

export function buildPetSearchActiveChips(
  filters: PetSearchFilterState,
  onChange: (next: PetSearchFilterState) => void,
  locale: Locale = "en",
): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  if (filters.location.trim()) {
    chips.push({
      id: "location",
      label: filters.location.trim(),
      onRemove: () => onChange({ ...filters, location: "" }),
    });
  }

  for (const iso of filters.availabilityDates) {
    chips.push({
      id: `date-${iso}`,
      label: formatDate(iso),
      onRemove: () =>
        onChange({
          ...filters,
          availabilityDates: filters.availabilityDates.filter((d) => d !== iso),
        }),
    });
  }

  chips.push(
    ...multiChipsLocalized("species", filters.species, petSearchTypeOptions, locale, (value) =>
      onChange({ ...filters, species: filters.species.filter((v) => v !== value) }),
    ),
  );
  chips.push(
    ...multiChips("breed", filters.breeds, filters.breeds.map((b) => ({ value: b, label: b })), (value) =>
      onChange({ ...filters, breeds: filters.breeds.filter((v) => v !== value) }),
    ),
  );
  chips.push(
    ...multiChipsLocalized("size", filters.sizes, petSearchSizeOptions, locale, (value) =>
      onChange({ ...filters, sizes: filters.sizes.filter((v) => v !== value) }),
    ),
  );
  chips.push(
    ...multiChipsLocalized("energy", filters.energyLevels, petSearchEnergyOptions, locale, (value) =>
      onChange({ ...filters, energyLevels: filters.energyLevels.filter((v) => v !== value) }),
    ),
  );
  chips.push(
    ...multiChipsLocalized(
      "temperament",
      filters.temperaments,
      petSearchTemperamentOptions,
      locale,
      (value) => onChange({ ...filters, temperaments: filters.temperaments.filter((v) => v !== value) }),
    ),
  );
  chips.push(
    ...multiChipsLocalized("activity", filters.activityNeeds, petSearchActivityOptions, locale, (value) =>
      onChange({ ...filters, activityNeeds: filters.activityNeeds.filter((v) => v !== value) }),
    ),
  );

  if (filters.careLocation) {
    chips.push({
      id: "care-location",
      label: localizedLabelForValue(petSearchCareLocationOptions, filters.careLocation, locale),
      onRemove: () => onChange({ ...filters, careLocation: "" }),
    });
  }

  chips.push(
    ...multiChipsLocalized("care-type", filters.careTypes, petSearchCareTypeOptions, locale, (value) =>
      onChange({ ...filters, careTypes: filters.careTypes.filter((v) => v !== value) }),
    ),
  );

  if (filters.verifiedOnly) {
    chips.push({
      id: "verified",
      label: getTranslations(locale).searchFilters.verifiedOnly,
      onRemove: () => onChange({ ...filters, verifiedOnly: false }),
    });
  }

  chips.push(
    ...multiChipsLocalized("lang", filters.languages, petSearchLanguageOptions, locale, (value) =>
      onChange({ ...filters, languages: filters.languages.filter((v) => v !== value) }),
    ),
  );

  return chips;
}

export function buildPetFriendSearchActiveChips(
  filters: PetFriendSearchFilterState,
  onChange: (next: PetFriendSearchFilterState) => void,
  locale: Locale = "en",
): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  if (filters.location.trim()) {
    chips.push({
      id: "location",
      label: filters.location.trim(),
      onRemove: () => onChange({ ...filters, location: "" }),
    });
  }

  for (const iso of filters.availabilityDates) {
    chips.push({
      id: `date-${iso}`,
      label: formatDate(iso),
      onRemove: () =>
        onChange({
          ...filters,
          availabilityDates: filters.availabilityDates.filter((d) => d !== iso),
        }),
    });
  }

  chips.push(
    ...multiChipsLocalized(
      "pet-type",
      filters.petTypesAccepted,
      petFriendSearchTypeOptions,
      locale,
      (value) =>
        onChange({
          ...filters,
          petTypesAccepted: filters.petTypesAccepted.filter((v) => v !== value),
        }),
    ),
  );
  chips.push(
    ...multiChipsLocalized(
      "care-type",
      filters.careTypesOffered,
      petFriendSearchCareTypeOptions,
      locale,
      (value) =>
        onChange({
          ...filters,
          careTypesOffered: filters.careTypesOffered.filter((v) => v !== value),
        }),
    ),
  );
  chips.push(
    ...multiChipsLocalized(
      "experience",
      filters.experienceLevels,
      petFriendSearchExperienceOptions,
      locale,
      (value) =>
        onChange({
          ...filters,
          experienceLevels: filters.experienceLevels.filter((v) => v !== value),
        }),
    ),
  );
  chips.push(
    ...multiChipsLocalized(
      "home",
      filters.homeSuitability,
      petFriendSearchHomeOptions,
      locale,
      (value) =>
        onChange({
          ...filters,
          homeSuitability: filters.homeSuitability.filter((v) => v !== value),
        }),
    ),
  );
  chips.push(
    ...multiChipsLocalized(
      "lang",
      filters.languages,
      petFriendSearchLanguageOptions,
      locale,
      (value) => onChange({ ...filters, languages: filters.languages.filter((v) => v !== value) }),
    ),
  );

  if (filters.verifiedOnly) {
    chips.push({
      id: "verified",
      label: getTranslations(locale).searchFilters.verifiedOnly,
      onRemove: () => onChange({ ...filters, verifiedOnly: false }),
    });
  }

  return chips;
}
