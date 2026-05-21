import {
  petSearchActivityOptions,
  petSearchCareLocationOptions,
  petSearchCareTypeOptions,
  petSearchEnergyOptions,
  petSearchLanguageOptions,
  petSearchMedicalOptions,
  petSearchSizeOptions,
  petSearchTemperamentOptions,
  petSearchTypeOptions,
} from "@/lib/pet-search-filter-config";
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
    ...multiChips("species", filters.species, petSearchTypeOptions, (value) =>
      onChange({ ...filters, species: filters.species.filter((v) => v !== value) }),
    ),
  );
  chips.push(
    ...multiChips("breed", filters.breeds, filters.breeds.map((b) => ({ value: b, label: b })), (value) =>
      onChange({ ...filters, breeds: filters.breeds.filter((v) => v !== value) }),
    ),
  );
  chips.push(
    ...multiChips("size", filters.sizes, petSearchSizeOptions, (value) =>
      onChange({ ...filters, sizes: filters.sizes.filter((v) => v !== value) }),
    ),
  );
  chips.push(
    ...multiChips("energy", filters.energyLevels, petSearchEnergyOptions, (value) =>
      onChange({ ...filters, energyLevels: filters.energyLevels.filter((v) => v !== value) }),
    ),
  );
  chips.push(
    ...multiChips("temperament", filters.temperaments, petSearchTemperamentOptions, (value) =>
      onChange({ ...filters, temperaments: filters.temperaments.filter((v) => v !== value) }),
    ),
  );
  chips.push(
    ...multiChips("medical", filters.medicalNeeds, petSearchMedicalOptions, (value) =>
      onChange({
        ...filters,
        medicalNeeds: filters.medicalNeeds.filter((v) => v !== value),
      }),
    ),
  );
  chips.push(
    ...multiChips("activity", filters.activityNeeds, petSearchActivityOptions, (value) =>
      onChange({ ...filters, activityNeeds: filters.activityNeeds.filter((v) => v !== value) }),
    ),
  );

  if (filters.careLocation) {
    chips.push({
      id: "care-location",
      label: labelFor(petSearchCareLocationOptions, filters.careLocation),
      onRemove: () => onChange({ ...filters, careLocation: "" }),
    });
  }

  chips.push(
    ...multiChips("care-type", filters.careTypes, petSearchCareTypeOptions, (value) =>
      onChange({ ...filters, careTypes: filters.careTypes.filter((v) => v !== value) }),
    ),
  );

  if (filters.verifiedOnly) {
    chips.push({
      id: "verified",
      label: "Verified",
      onRemove: () => onChange({ ...filters, verifiedOnly: false }),
    });
  }

  chips.push(
    ...multiChips("lang", filters.languages, petSearchLanguageOptions, (value) =>
      onChange({ ...filters, languages: filters.languages.filter((v) => v !== value) }),
    ),
  );

  return chips;
}

export function buildPetFriendSearchActiveChips(
  filters: PetFriendSearchFilterState,
  onChange: (next: PetFriendSearchFilterState) => void,
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
    ...multiChips("pet-type", filters.petTypesAccepted, petFriendSearchTypeOptions, (value) =>
      onChange({
        ...filters,
        petTypesAccepted: filters.petTypesAccepted.filter((v) => v !== value),
      }),
    ),
  );
  chips.push(
    ...multiChips("care-type", filters.careTypesOffered, petFriendSearchCareTypeOptions, (value) =>
      onChange({
        ...filters,
        careTypesOffered: filters.careTypesOffered.filter((v) => v !== value),
      }),
    ),
  );
  chips.push(
    ...multiChips("experience", filters.experienceLevels, petFriendSearchExperienceOptions, (value) =>
      onChange({
        ...filters,
        experienceLevels: filters.experienceLevels.filter((v) => v !== value),
      }),
    ),
  );
  chips.push(
    ...multiChips("home", filters.homeSuitability, petFriendSearchHomeOptions, (value) =>
      onChange({
        ...filters,
        homeSuitability: filters.homeSuitability.filter((v) => v !== value),
      }),
    ),
  );
  chips.push(
    ...multiChips("lang", filters.languages, petFriendSearchLanguageOptions, (value) =>
      onChange({ ...filters, languages: filters.languages.filter((v) => v !== value) }),
    ),
  );

  if (filters.verifiedOnly) {
    chips.push({
      id: "verified",
      label: "Verified",
      onRemove: () => onChange({ ...filters, verifiedOnly: false }),
    });
  }

  return chips;
}
