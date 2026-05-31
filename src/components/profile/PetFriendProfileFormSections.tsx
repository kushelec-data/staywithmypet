"use client";

import { AvailabilityCalendar } from "@/components/calendar/AvailabilityCalendar";
import { ProfileCollapsibleSection } from "@/components/profile/ProfileCollapsibleSection";
import {
  ProfileChipMultiSelect,
  ProfileChipSingleSelect,
  ProfileYesNoToggle,
} from "@/components/profile/form/ProfileFormFields";
import {
  experienceLevelOptions,
  preferredCareLocationOptions,
} from "@/lib/pet-care-labels";
import type { PetFriendProfileFormInput } from "@/lib/profile-friend-form";
import {
  careTypeOptions,
  durationOfCareOptions,
  livingTypeOptions,
  petTypeOptions,
  preferredDaysTimesOptions,
} from "@/lib/profile-friend-options";
import { PET_WEIGHT_CATEGORY_OPTIONS } from "@/lib/pet-weight";
import { OTHER_FIELD_COPY, isOtherOptionValue } from "@/lib/other-option";
import { OtherOptionTextInput } from "@/components/profile/form/ProfileFormFields";
import { ArrowLeftRight, Dog, Heart, Home, MapPin, Sparkles } from "lucide-react";

type PetFriendProfileFormSectionsProps = {
  form: PetFriendProfileFormInput;
  onChange: (next: PetFriendProfileFormInput) => void;
  disabled?: boolean;
  /** Profile-level calendar (Pet Friend personal availability) */
  showCalendar?: boolean;
  petFriendId?: string | null;
  /** Open availability panel by default (deep-link). */
  availabilityDefaultOpen?: boolean;
  /** Render only the Availability section (wizard step). */
  onlyAvailabilitySection?: boolean;
};

function patch(
  form: PetFriendProfileFormInput,
  onChange: PetFriendProfileFormSectionsProps["onChange"],
  partial: Partial<PetFriendProfileFormInput>,
) {
  onChange({ ...form, ...partial });
}

function toggleInList(
  form: PetFriendProfileFormInput,
  onChange: PetFriendProfileFormSectionsProps["onChange"],
  key: keyof Pick<
    PetFriendProfileFormInput,
    | "petTypesWilling"
    | "preferredPetSizes"
    | "petTypesPreviouslyBorrowed"
    | "availableCareTypes"
    | "preferredDaysTimes"
  >,
  value: string,
) {
  const list = form[key];
  const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  patch(form, onChange, { [key]: next } as Partial<PetFriendProfileFormInput>);
}

export function PetFriendProfileFormSections({
  form,
  onChange,
  disabled,
  showCalendar = true,
  petFriendId,
  availabilityDefaultOpen = false,
  onlyAvailabilitySection = false,
}: PetFriendProfileFormSectionsProps) {
  return (
    <div className="space-y-4 sm:col-span-2">
      {!onlyAvailabilitySection ? (
        <ProfileCollapsibleSection
          id="pet-care-preferences"
          title="Pet care preferences"
          description="What pets and care you're comfortable offering."
          defaultOpen
        >
          <ProfileChipMultiSelect
            label="Pet types willing to care for"
            options={petTypeOptions}
            selected={form.petTypesWilling}
            onToggle={(v) => toggleInList(form, onChange, "petTypesWilling", v)}
            disabled={disabled}
            otherField={{
              text: form.petTypesWillingOther,
              onTextChange: (petTypesWillingOther) => patch(form, onChange, { petTypesWillingOther }),
              label: OTHER_FIELD_COPY.petType.label,
              placeholder: OTHER_FIELD_COPY.petType.placeholder,
              inputId: "pet_types_willing_other",
            }}
          />
          <ProfileChipMultiSelect
            label="Preferred pet size"
            options={PET_WEIGHT_CATEGORY_OPTIONS}
            selected={form.preferredPetSizes}
            onToggle={(v) => toggleInList(form, onChange, "preferredPetSizes", v)}
            disabled={disabled}
          />
          <ProfileChipMultiSelect
            label="Available care types"
            options={careTypeOptions}
            selected={form.availableCareTypes}
            onToggle={(v) => toggleInList(form, onChange, "availableCareTypes", v)}
            disabled={disabled}
            otherField={{
              text: form.availableCareTypesOther,
              onTextChange: (availableCareTypesOther) => patch(form, onChange, { availableCareTypesOther }),
              label: OTHER_FIELD_COPY.careType.label,
              placeholder: OTHER_FIELD_COPY.careType.placeholder,
              inputId: "available_care_types_other",
            }}
          />
          <ProfileChipSingleSelect
            label="Pet care experience"
            options={experienceLevelOptions.map((o) => ({
              ...o,
              icon:
                o.value === "first_time" ? (
                  <Heart className="h-3.5 w-3.5" />
                ) : o.value === "energetic" ? (
                  <Sparkles className="h-3.5 w-3.5" />
                ) : (
                  <Dog className="h-3.5 w-3.5" />
                ),
            }))}
            value={form.experienceLevel}
            onChange={(experienceLevel) => patch(form, onChange, { experienceLevel })}
            disabled={disabled}
          />
          <ProfileChipSingleSelect
            label="Preferred care location"
            options={preferredCareLocationOptions.map((o) => ({
              ...o,
              icon:
                o.value === "at_my_home" ? (
                  <Home className="h-3.5 w-3.5" />
                ) : o.value === "at_pet_parent_home" ? (
                  <MapPin className="h-3.5 w-3.5" />
                ) : (
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                ),
            }))}
            value={form.preferredCareLocation}
            onChange={(preferredCareLocation) => patch(form, onChange, { preferredCareLocation })}
            disabled={disabled}
          />
          <ProfileChipMultiSelect
            label="Pet types previously cared for"
            options={petTypeOptions}
            selected={form.petTypesPreviouslyBorrowed}
            onToggle={(v) => toggleInList(form, onChange, "petTypesPreviouslyBorrowed", v)}
            disabled={disabled}
            otherField={{
              text: form.petTypesPreviouslyBorrowedOther,
              onTextChange: (petTypesPreviouslyBorrowedOther) =>
                patch(form, onChange, { petTypesPreviouslyBorrowedOther }),
              label: OTHER_FIELD_COPY.petType.label,
              placeholder: OTHER_FIELD_COPY.petType.placeholder,
              inputId: "pet_types_previously_borrowed_other",
            }}
          />
          <ProfileYesNoToggle
            label="Willing to care for special medical needs?"
            value={form.willingSpecialMedicalNeeds}
            onChange={(v) => patch(form, onChange, { willingSpecialMedicalNeeds: v })}
            disabled={disabled}
          />
          <ProfileYesNoToggle
            label="Comfortable with behavioral quirks?"
            value={form.willingBehavioralQuirks}
            onChange={(v) => patch(form, onChange, { willingBehavioralQuirks: v })}
            disabled={disabled}
          />
          <ProfileYesNoToggle
            label="Happy to care for senior pets?"
            value={form.willingSeniors}
            onChange={(v) => patch(form, onChange, { willingSeniors: v })}
            disabled={disabled}
          />
          <ProfileYesNoToggle
            label="Happy with puppies & kittens?"
            value={form.willingPuppiesKittens}
            onChange={(v) => patch(form, onChange, { willingPuppiesKittens: v })}
            disabled={disabled}
          />
        </ProfileCollapsibleSection>
      ) : null}

      {onlyAvailabilitySection ? (
        <ProfileCollapsibleSection
          id="availability"
          title="Availability"
          description="When and how long you can help."
          defaultOpen={availabilityDefaultOpen}
        >
          <ProfileChipMultiSelect
            label="Preferred days & times"
            options={preferredDaysTimesOptions}
            selected={form.preferredDaysTimes}
            onToggle={(v) => toggleInList(form, onChange, "preferredDaysTimes", v)}
            disabled={disabled}
          />
          <div className="sm:col-span-1">
            <label htmlFor="duration_of_care" className="form-field-label">
              Duration of care preferred
            </label>
            <select
              id="duration_of_care"
              value={form.durationOfCarePreferred}
              disabled={disabled}
              onChange={(e) => patch(form, onChange, { durationOfCarePreferred: e.target.value })}
              className="input-field mt-1"
            >
              {durationOfCareOptions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          {showCalendar ? (
            <div className="sm:col-span-2">
              <p className="text-base font-semibold text-foreground">Edit my availability</p>
              <p className="mt-1 text-sm text-muted">
                Tap days you’re available. Pet Parents will see your availability on your public profile.
              </p>
              <div className="mt-4 rounded-3xl border border-black/5 bg-gradient-to-b from-cream/50 via-mint/15 to-surface p-4 shadow-sm ring-1 ring-black/5 sm:p-6">
                <AvailabilityCalendar
                  selectedDates={form.availabilitySelectedDates}
                  onChange={(dates) => patch(form, onChange, { availabilitySelectedDates: dates })}
                  disabled={disabled}
                  petFriendId={petFriendId}
                  viewRole="pet-friend"
                />
              </div>
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <label htmlFor="availability_notes" className="form-field-label">
              Additional availability notes
            </label>
            <textarea
              id="availability_notes"
              rows={2}
              disabled={disabled}
              value={form.availabilityNotes}
              onChange={(e) => patch(form, onChange, { availabilityNotes: e.target.value })}
              placeholder="e.g. Flexible evenings, school holidays"
              className="input-field mt-1 resize-y"
            />
          </div>
        </ProfileCollapsibleSection>
      ) : null}

      {!onlyAvailabilitySection ? (
        <ProfileCollapsibleSection
          id="living-situation"
          title="Living situation"
          description="Your home environment for Pet Parents."
        >
        <div className="sm:col-span-1">
          <label htmlFor="living_type" className="form-field-label">
            Living type
          </label>
          <select
            id="living_type"
            value={form.livingType}
            disabled={disabled}
            onChange={(e) => {
              const livingType = e.target.value;
              patch(form, onChange, {
                livingType,
                livingTypeOther: isOtherOptionValue(livingType) ? form.livingTypeOther : "",
              });
            }}
            className="input-field mt-1"
          >
            {livingTypeOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          {isOtherOptionValue(form.livingType) ? (
            <OtherOptionTextInput
              id="living_type_other"
              label={OTHER_FIELD_COPY.livingType.label}
              placeholder={OTHER_FIELD_COPY.livingType.placeholder}
              value={form.livingTypeOther}
              onChange={(livingTypeOther) => patch(form, onChange, { livingTypeOther })}
              disabled={disabled}
            />
          ) : null}
        </div>
        <ProfileYesNoToggle
          label="Pets at home?"
          value={form.hasPetsAtHome}
          onChange={(v) => patch(form, onChange, { hasPetsAtHome: v })}
          disabled={disabled}
        />
        {form.hasPetsAtHome ? (
          <div className="sm:col-span-2">
            <label htmlFor="pets_at_home_notes" className="form-field-label">
              Pets at home (optional detail)
            </label>
            <input
              id="pets_at_home_notes"
              type="text"
              disabled={disabled}
              value={form.petsAtHomeNotes}
              onChange={(e) => patch(form, onChange, { petsAtHomeNotes: e.target.value })}
              placeholder="e.g. 1 friendly cat"
              className="input-field mt-1"
            />
          </div>
        ) : null}
        <ProfileYesNoToggle
          label="Children at home?"
          value={form.hasChildren}
          onChange={(v) => patch(form, onChange, { hasChildren: v })}
          disabled={disabled}
        />
        <ProfileYesNoToggle
          label="Yard or garden access?"
          value={form.yardGardenAccess}
          onChange={(v) => patch(form, onChange, { yardGardenAccess: v })}
          disabled={disabled}
        />
        <ProfileYesNoToggle
          label="Nearby park access?"
          value={form.nearbyParkAccess}
          onChange={(v) => patch(form, onChange, { nearbyParkAccess: v })}
          disabled={disabled}
        />
        </ProfileCollapsibleSection>
      ) : null}
    </div>
  );
}
