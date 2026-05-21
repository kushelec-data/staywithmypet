"use client";

import { GooglePlacesInput } from "@/components/location/GooglePlacesInput";
import { ActiveFilterChips } from "@/components/search/ActiveFilterChips";
import { AvailabilityDatePicker } from "@/components/search/AvailabilityDatePicker";
import { FilterChipGroup } from "@/components/search/FilterChipGroup";
import { FilterOptionCards } from "@/components/search/FilterOptionCards";
import { FilterSection, SearchFilterPanel } from "@/components/search/SearchFilterPanel";
import {
  careTypeIconForValue,
  LocationFlexibleIcon,
  LocationFriendHomeIcon,
  LocationParentHomeIcon,
} from "@/components/search/filter-icons";
import { useLanguage } from "@/context/LanguageContext";
import { breedsForSpecies } from "@/lib/pet-breeds";
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
import { buildPetSearchActiveChips } from "@/lib/search-filter-active";
import { emptyPetSearchFilters, type PetSearchFilterState } from "@/lib/public-pet-search";
import { useMemo, type ReactNode } from "react";

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-muted">
      <span>{label}</span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full border border-border bg-muted/30 transition checked:border-brand-teal checked:bg-brand-teal focus:ring-2 focus:ring-brand-teal/30"
        style={{
          backgroundImage: checked
            ? "radial-gradient(circle at 1.15rem 50%, white 0.45rem, transparent 0.5rem)"
            : "radial-gradient(circle at 0.35rem 50%, white 0.45rem, transparent 0.5rem)",
        }}
      />
    </label>
  );
}

const CARE_LOCATION_ICONS: Record<string, ReactNode> = {
  "At pet friend's home": <LocationFriendHomeIcon />,
  "At pet owner's home": <LocationParentHomeIcon />,
  "Either / flexible": <LocationFlexibleIcon />,
};

type PetSearchFiltersProps = {
  searchMode?: "pets";
  filters: PetSearchFilterState;
  onChange: (filters: PetSearchFilterState) => void;
  onApply: () => void;
  onClearAll?: () => void;
};

export function PetSearchFilters({
  filters,
  onChange,
  onApply,
  onClearAll,
}: PetSearchFiltersProps) {
  const { t } = useLanguage();
  const f = t.searchFilters;

  const breedOptions = useMemo(() => {
    const speciesWithBreeds = filters.species.filter((s) => breedsForSpecies(s).length > 0);
    const breeds = new Set<string>();
    for (const sp of speciesWithBreeds) {
      for (const b of breedsForSpecies(sp)) breeds.add(b);
    }
    return [...breeds].map((b) => ({ value: b, label: b }));
  }, [filters.species]);

  const showBreedFilter = breedOptions.length > 0;

  const careLocationCards = useMemo(
    () =>
      petSearchCareLocationOptions.map((opt) => ({
        value: opt.value,
        label: opt.label,
        description:
          opt.value.includes("friend")
            ? f.careLocationFriendHint
            : opt.value.includes("owner")
              ? f.careLocationParentHint
              : f.careLocationFlexibleHint,
        icon: CARE_LOCATION_ICONS[opt.value] ?? <LocationFlexibleIcon />,
      })),
    [f],
  );

  const careTypeChips = useMemo(
    () =>
      petSearchCareTypeOptions.map((opt) => ({
        value: opt.value,
        label: opt.label,
        icon: careTypeIconForValue(opt.value),
      })),
    [],
  );

  function handleClear() {
    const empty = emptyPetSearchFilters();
    onChange(empty);
    onClearAll?.();
  }

  const activeChips = buildPetSearchActiveChips(filters, onChange);

  return (
    <SearchFilterPanel title={f.petSearch} onSubmit={onApply} onClearAll={handleClear}>
      <ActiveFilterChips chips={activeChips} />

      <FilterSection title={f.location}>
        <GooglePlacesInput
          id="pet_search_location"
          value={filters.location}
          onChange={(location) => onChange({ ...filters, location })}
          onPlaceSelect={(place) =>
            onChange({
              ...filters,
              location: place.city?.trim() || place.formatted_address?.trim() || filters.location,
            })
          }
          placeholder={f.locationPlaceholder}
          className="input-field mt-0"
          autoComplete="off"
        />
      </FilterSection>

      <FilterSection title={f.availability}>
        <AvailabilityDatePicker
          selectedDates={filters.availabilityDates}
          onChange={(availabilityDates) => onChange({ ...filters, availabilityDates })}
        />
      </FilterSection>

      <FilterSection title={f.petType} id="filter-pet-type">
        <FilterChipGroup
          ariaLabelledBy="filter-pet-type"
          options={[...petSearchTypeOptions]}
          selected={filters.species}
          maxVisible={4}
          onChange={(species) => {
            const breeds = species.some((s) => breedsForSpecies(s).length > 0)
              ? filters.breeds
              : [];
            onChange({ ...filters, species, breeds });
          }}
        />
      </FilterSection>

      {showBreedFilter ? (
        <FilterSection title={f.breed} id="filter-breed">
          <p className="mb-2 text-xs text-muted">{f.breedHint}</p>
          <FilterChipGroup
            ariaLabelledBy="filter-breed"
            options={breedOptions}
            selected={filters.breeds}
            maxVisible={8}
            onChange={(breeds) => onChange({ ...filters, breeds })}
          />
        </FilterSection>
      ) : null}

      <FilterSection title={f.size} id="filter-size">
        <FilterChipGroup
          ariaLabelledBy="filter-size"
          options={[...petSearchSizeOptions]}
          selected={filters.sizes}
          onChange={(sizes) => onChange({ ...filters, sizes })}
        />
      </FilterSection>

      <FilterSection title={f.energyLevel} id="filter-energy">
        <FilterChipGroup
          ariaLabelledBy="filter-energy"
          options={[...petSearchEnergyOptions]}
          selected={filters.energyLevels}
          onChange={(energyLevels) => onChange({ ...filters, energyLevels })}
        />
      </FilterSection>

      <FilterSection title={f.temperament} id="filter-temperament">
        <FilterChipGroup
          ariaLabelledBy="filter-temperament"
          options={[...petSearchTemperamentOptions]}
          selected={filters.temperaments}
          maxVisible={5}
          onChange={(temperaments) => onChange({ ...filters, temperaments })}
        />
      </FilterSection>

      <FilterSection title={f.medicalNeeds} id="filter-medical">
        <FilterChipGroup
          ariaLabelledBy="filter-medical"
          options={[...petSearchMedicalOptions]}
          selected={filters.medicalNeeds}
          onChange={(medicalNeeds) =>
            onChange({
              ...filters,
              medicalNeeds: medicalNeeds as PetSearchFilterState["medicalNeeds"],
            })
          }
        />
      </FilterSection>

      <FilterSection title={f.activityNeeds} id="filter-activity">
        <FilterChipGroup
          ariaLabelledBy="filter-activity"
          options={[...petSearchActivityOptions]}
          selected={filters.activityNeeds}
          onChange={(activityNeeds) => onChange({ ...filters, activityNeeds })}
        />
      </FilterSection>

      <FilterSection title={f.careLocation} id="filter-care-location">
        <FilterOptionCards
          ariaLabelledBy="filter-care-location"
          options={careLocationCards}
          value={filters.careLocation}
          onChange={(careLocation) => onChange({ ...filters, careLocation })}
        />
      </FilterSection>

      <FilterSection title={f.careType} id="filter-care-type">
        <FilterChipGroup
          ariaLabelledBy="filter-care-type"
          options={careTypeChips}
          selected={filters.careTypes}
          onChange={(careTypes) => onChange({ ...filters, careTypes })}
        />
      </FilterSection>

      <FilterSection title={f.verification}>
        <ToggleRow
          label={f.verifiedOnly}
          checked={filters.verifiedOnly}
          onChange={(verifiedOnly) => onChange({ ...filters, verifiedOnly })}
        />
      </FilterSection>

      <FilterSection title={f.languages} id="filter-languages">
        <FilterChipGroup
          ariaLabelledBy="filter-languages"
          options={[...petSearchLanguageOptions]}
          selected={filters.languages}
          onChange={(languages) => onChange({ ...filters, languages })}
        />
      </FilterSection>
    </SearchFilterPanel>
  );
}
