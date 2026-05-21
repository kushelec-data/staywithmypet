"use client";

import { GooglePlacesInput } from "@/components/location/GooglePlacesInput";
import { ActiveFilterChips } from "@/components/search/ActiveFilterChips";
import { AvailabilityDatePicker } from "@/components/search/AvailabilityDatePicker";
import { FilterChipGroup } from "@/components/search/FilterChipGroup";
import { FilterSection, SearchFilterPanel } from "@/components/search/SearchFilterPanel";
import { careTypeIconForValue } from "@/components/search/filter-icons";
import { useLanguage } from "@/context/LanguageContext";
import {
  petFriendSearchCareTypeOptions,
  petFriendSearchExperienceOptions,
  petFriendSearchHomeOptions,
  petFriendSearchLanguageOptions,
  petFriendSearchTypeOptions,
} from "@/lib/pet-friend-search-filter-config";
import {
  emptyPetFriendSearchFilters,
  type PetFriendSearchFilterState,
} from "@/lib/pet-friend-search";
import { buildPetFriendSearchActiveChips } from "@/lib/search-filter-active";
import { useMemo } from "react";

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

type PetFriendSearchFiltersProps = {
  filters: PetFriendSearchFilterState;
  onChange: (filters: PetFriendSearchFilterState) => void;
  onApply: () => void;
  onClearAll?: () => void;
};

export function PetFriendSearchFilters({
  filters,
  onChange,
  onApply,
  onClearAll,
}: PetFriendSearchFiltersProps) {
  const { t } = useLanguage();
  const f = t.searchFilters;

  const careTypeChips = useMemo(
    () =>
      petFriendSearchCareTypeOptions.map((opt) => ({
        value: opt.value,
        label: opt.label,
        icon: careTypeIconForValue(opt.value),
      })),
    [],
  );

  function handleClear() {
    const empty = emptyPetFriendSearchFilters();
    onChange(empty);
    onClearAll?.();
  }

  const activeChips = buildPetFriendSearchActiveChips(filters, onChange);

  return (
    <SearchFilterPanel title={f.petFriendSearch} onSubmit={onApply} onClearAll={handleClear}>
      <ActiveFilterChips chips={activeChips} />

      <FilterSection title={f.location}>
        <GooglePlacesInput
          id="care_search_location"
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
        <p className="mt-2 text-xs text-muted">{f.availabilityCalendarHint}</p>
      </FilterSection>

      <FilterSection title={f.petTypesAccepted} id="filter-pet-types-accepted">
        <FilterChipGroup
          ariaLabelledBy="filter-pet-types-accepted"
          options={[...petFriendSearchTypeOptions]}
          selected={filters.petTypesAccepted}
          maxVisible={4}
          onChange={(petTypesAccepted) => onChange({ ...filters, petTypesAccepted })}
        />
      </FilterSection>

      <FilterSection title={f.careTypeOffered} id="filter-care-offered">
        <FilterChipGroup
          ariaLabelledBy="filter-care-offered"
          options={careTypeChips}
          selected={filters.careTypesOffered}
          onChange={(careTypesOffered) => onChange({ ...filters, careTypesOffered })}
        />
      </FilterSection>

      <FilterSection title={f.experience} id="filter-experience">
        <FilterChipGroup
          ariaLabelledBy="filter-experience"
          options={[...petFriendSearchExperienceOptions]}
          selected={filters.experienceLevels}
          onChange={(experienceLevels) => onChange({ ...filters, experienceLevels })}
        />
      </FilterSection>

      <FilterSection title={f.homeSuitability} id="filter-home">
        <FilterChipGroup
          ariaLabelledBy="filter-home"
          options={[...petFriendSearchHomeOptions]}
          selected={filters.homeSuitability}
          maxVisible={4}
          onChange={(homeSuitability) => onChange({ ...filters, homeSuitability })}
        />
      </FilterSection>

      <FilterSection title={f.languages} id="filter-friend-languages">
        <FilterChipGroup
          ariaLabelledBy="filter-friend-languages"
          options={[...petFriendSearchLanguageOptions]}
          selected={filters.languages}
          onChange={(languages) => onChange({ ...filters, languages })}
        />
      </FilterSection>

      <FilterSection title={f.verification}>
        <ToggleRow
          label={f.verifiedOnly}
          checked={filters.verifiedOnly}
          onChange={(verifiedOnly) => onChange({ ...filters, verifiedOnly })}
        />
      </FilterSection>
    </SearchFilterPanel>
  );
}
