"use client";

import { AvailabilityCalendar } from "@/components/calendar/AvailabilityCalendar";
import { ProfileCollapsibleSection } from "@/components/profile/ProfileCollapsibleSection";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
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
import { useLanguage } from "@/context/LanguageContext";
import {
  toProfileLabeledChipOptions,
  toProfileStringChipOptions,
} from "@/lib/profile-option-labels";
import { translateProfileHelper, translateProfileLabel } from "@/lib/profile-translations";
import type { ProfileRequiredFieldId } from "@/lib/profile-required-fields";
import { FormFieldError } from "@/components/forms/RequiredFieldLabel";
import { ArrowLeftRight, Dog, Heart, Home, MapPin, Sparkles } from "lucide-react";
import { useMemo } from "react";

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
  required?: boolean;
  fieldErrors?: Partial<Record<ProfileRequiredFieldId, string>>;
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
  required = false,
  fieldErrors,
}: PetFriendProfileFormSectionsProps) {
  const { locale, t } = useLanguage();
  const setup = t.account.profileSetup;
  const petFriendPreferences = t.profileEdit.petFriend.preferences;
  const pl = (en: string) => translateProfileLabel(en, locale);

  const petTypeChipOptions = useMemo(() => toProfileLabeledChipOptions(petTypeOptions, locale), [locale]);
  const careTypeChipOptions = useMemo(() => toProfileStringChipOptions(careTypeOptions, locale), [locale]);
  const weightChipOptions = useMemo(
    () => toProfileLabeledChipOptions(PET_WEIGHT_CATEGORY_OPTIONS, locale),
    [locale],
  );
  const experienceChipOptions = useMemo(
    () =>
      experienceLevelOptions.map((o) => ({
        ...o,
        label: pl(o.label),
        icon:
          o.value === "first_time" ? (
            <Heart className="h-3.5 w-3.5" />
          ) : o.value === "experienced" ? (
            <Sparkles className="h-3.5 w-3.5" />
          ) : (
            <Dog className="h-3.5 w-3.5" />
          ),
      })),
    [locale],
  );
  const careLocationChipOptions = useMemo(
    () =>
      preferredCareLocationOptions.map((o) => ({
        ...o,
        label: pl(o.label),
        icon:
          o.value === "at_my_home" ? (
            <Home className="h-3.5 w-3.5" />
          ) : o.value === "at_pet_parent_home" ? (
            <MapPin className="h-3.5 w-3.5" />
          ) : (
            <ArrowLeftRight className="h-3.5 w-3.5" />
          ),
      })),
    [locale],
  );
  const livingTypeSelectOptions = useMemo(
    () => toProfileStringChipOptions(livingTypeOptions, locale),
    [locale],
  );
  const daysTimesOptions = useMemo(
    () => toProfileStringChipOptions(preferredDaysTimesOptions, locale),
    [locale],
  );
  const durationOptions = useMemo(
    () => toProfileStringChipOptions(durationOfCareOptions, locale),
    [locale],
  );

  return (
    <div className="space-y-4 sm:col-span-2">
      {!onlyAvailabilitySection ? (
        <ProfileCollapsibleSection
          id="pet-care-preferences"
          title={pl("Pet care preferences")}
          description={pl("What pets and care you're comfortable offering.")}
          defaultOpen
        >
          <ProfileChipMultiSelect
            label={pl("Pet types willing to care for")}
            options={petTypeChipOptions}
            selected={form.petTypesWilling}
            onToggle={(v) => toggleInList(form, onChange, "petTypesWilling", v)}
            disabled={disabled}
            required={required}
            fieldId="friend-pet-types"
            error={fieldErrors?.pet_types}
            otherField={{
              text: form.petTypesWillingOther,
              onTextChange: (petTypesWillingOther) => patch(form, onChange, { petTypesWillingOther }),
              label: OTHER_FIELD_COPY.petType.label,
              placeholder: OTHER_FIELD_COPY.petType.placeholder,
              inputId: "pet_types_willing_other",
            }}
          />
          <ProfileChipMultiSelect
            label={pl("Preferred pet size")}
            options={weightChipOptions}
            selected={form.preferredPetSizes}
            onToggle={(v) => toggleInList(form, onChange, "preferredPetSizes", v)}
            disabled={disabled}
            required={required}
            fieldId="friend-pet-sizes"
            error={fieldErrors?.pet_sizes}
          />
          <ProfileChipMultiSelect
            label={pl("Available care types")}
            options={careTypeChipOptions}
            selected={form.availableCareTypes}
            onToggle={(v) => toggleInList(form, onChange, "availableCareTypes", v)}
            disabled={disabled}
            required={required}
            fieldId="friend-care-services"
            error={fieldErrors?.care_services}
            otherField={{
              text: form.availableCareTypesOther,
              onTextChange: (availableCareTypesOther) => patch(form, onChange, { availableCareTypesOther }),
              label: OTHER_FIELD_COPY.careType.label,
              placeholder: OTHER_FIELD_COPY.careType.placeholder,
              inputId: "available_care_types_other",
            }}
          />
          <ProfileChipSingleSelect
            label={pl("Pet care experience")}
            options={experienceChipOptions}
            value={form.experienceLevel}
            onChange={(experienceLevel) => patch(form, onChange, { experienceLevel })}
            disabled={disabled}
            required={required}
            fieldId="friend-experience-level"
            error={fieldErrors?.experience}
          />
          <ProfileChipSingleSelect
            label={pl("Preferred care location")}
            options={careLocationChipOptions}
            value={form.preferredCareLocation}
            onChange={(preferredCareLocation) => patch(form, onChange, { preferredCareLocation })}
            disabled={disabled}
            required={required}
            fieldId="friend-service-area"
            error={fieldErrors?.service_area}
          />
          <ProfileChipMultiSelect
            label={pl("Pet types previously cared for")}
            options={petTypeChipOptions}
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
          <div id="friend-care-preference-toggles" className="sm:col-span-2 space-y-0">
          <ProfileYesNoToggle
            label={petFriendPreferences.willingSpecialMedicalNeeds}
            value={form.willingSpecialMedicalNeeds}
            onChange={(v) => patch(form, onChange, { willingSpecialMedicalNeeds: v })}
            disabled={disabled}
            required={required}
          />
          <ProfileYesNoToggle
            label={petFriendPreferences.comfortableBehavioralQuirks}
            value={form.willingBehavioralQuirks}
            onChange={(v) => patch(form, onChange, { willingBehavioralQuirks: v })}
            disabled={disabled}
          />
          <ProfileYesNoToggle
            label={petFriendPreferences.happySeniorPets}
            value={form.willingSeniors}
            onChange={(v) => patch(form, onChange, { willingSeniors: v })}
            disabled={disabled}
          />
          <ProfileYesNoToggle
            label={petFriendPreferences.happyPuppiesKittens}
            value={form.willingPuppiesKittens}
            onChange={(v) => patch(form, onChange, { willingPuppiesKittens: v })}
            disabled={disabled}
            required={required}
          />
          <FormFieldError message={fieldErrors?.care_preference_toggles} />
          </div>
        </ProfileCollapsibleSection>
      ) : null}

      {onlyAvailabilitySection ? (
        <ProfileCollapsibleSection
          id="availability"
          title={pl("Availability")}
          description={pl("When and how long you can help.")}
          defaultOpen={availabilityDefaultOpen}
        >
          <ProfileChipMultiSelect
            label={pl("Preferred days & times")}
            options={daysTimesOptions}
            selected={form.preferredDaysTimes}
            onToggle={(v) => toggleInList(form, onChange, "preferredDaysTimes", v)}
            disabled={disabled}
          />
          <div className="sm:col-span-1">
            <label htmlFor="duration_of_care" className="form-field-label">
              {pl("Duration of care preferred")}
            </label>
            <select
              id="duration_of_care"
              value={form.durationOfCarePreferred}
              disabled={disabled}
              onChange={(e) => patch(form, onChange, { durationOfCarePreferred: e.target.value })}
              className="input-field mt-1"
            >
              {durationOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {showCalendar ? (
            <div id="friend-availability-calendar" className="sm:col-span-2">
              <p className="text-base font-semibold text-foreground">{setup.editMyAvailability}</p>
              <p className="mt-1 text-sm text-muted">{setup.editAvailabilityHint}</p>
              <div className="mt-4 rounded-3xl border border-black/5 bg-gradient-to-b from-cream/50 via-mint/15 to-surface p-4 shadow-sm ring-1 ring-black/5 sm:p-6">
                <AvailabilityCalendar
                  selectedDates={form.availabilitySelectedDates}
                  onChange={(dates) => patch(form, onChange, { availabilitySelectedDates: dates })}
                  disabled={disabled}
                  petFriendId={petFriendId}
                  viewRole="pet-friend"
                />
              </div>
              <FormFieldError message={fieldErrors?.availability} />
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <label htmlFor="availability_notes" className="form-field-label">
              {pl("Additional availability notes")}
            </label>
            <AutoResizeTextarea
              id="availability_notes"
              minRows={2}
              disabled={disabled}
              value={form.availabilityNotes}
              onChange={(e) => patch(form, onChange, { availabilityNotes: e.target.value })}
              placeholder={translateProfileHelper("e.g. Flexible evenings, school holidays", locale)}
              className="input-field mt-1"
            />
          </div>
        </ProfileCollapsibleSection>
      ) : null}

      {!onlyAvailabilitySection && showCalendar ? (
        <ProfileCollapsibleSection
          id="availability"
          title={pl("Availability")}
          description={pl("When and how long you can help.")}
          defaultOpen
        >
          <div id="friend-availability-calendar" className="sm:col-span-2">
            <p className="text-base font-semibold text-foreground">{setup.editMyAvailability}</p>
            <p className="mt-1 text-sm text-muted">{setup.editAvailabilityHint}</p>
            <div className="mt-4 rounded-3xl border border-black/5 bg-gradient-to-b from-cream/50 via-mint/15 to-surface p-4 shadow-sm ring-1 ring-black/5 sm:p-6">
              <AvailabilityCalendar
                selectedDates={form.availabilitySelectedDates}
                onChange={(dates) => patch(form, onChange, { availabilitySelectedDates: dates })}
                disabled={disabled}
                petFriendId={petFriendId}
                viewRole="pet-friend"
              />
            </div>
            <FormFieldError message={fieldErrors?.availability} />
          </div>
        </ProfileCollapsibleSection>
      ) : null}

      {!onlyAvailabilitySection ? (
        <ProfileCollapsibleSection
          id="living-situation"
          title={pl("Living situation")}
          description={pl("Your home environment for Pet Parents.")}
        >
        <div className="sm:col-span-1">
          <label htmlFor="living_type" className="form-field-label">
            {pl("Living type")}
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
            {livingTypeSelectOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
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
          label={pl("Pets at home?")}
          value={form.hasPetsAtHome}
          onChange={(v) => patch(form, onChange, { hasPetsAtHome: v })}
          disabled={disabled}
        />
        {form.hasPetsAtHome ? (
          <div className="sm:col-span-2">
            <label htmlFor="pets_at_home_notes" className="form-field-label">
              {pl("Pets at home (optional detail)")}
            </label>
            <input
              id="pets_at_home_notes"
              type="text"
              disabled={disabled}
              value={form.petsAtHomeNotes}
              onChange={(e) => patch(form, onChange, { petsAtHomeNotes: e.target.value })}
              placeholder={translateProfileHelper("e.g. 1 friendly cat", locale)}
              className="input-field mt-1"
            />
          </div>
        ) : null}
        <ProfileYesNoToggle
          label={pl("Children at home?")}
          value={form.hasChildren}
          onChange={(v) => patch(form, onChange, { hasChildren: v })}
          disabled={disabled}
        />
        <ProfileYesNoToggle
          label={pl("Yard or garden access?")}
          value={form.yardGardenAccess}
          onChange={(v) => patch(form, onChange, { yardGardenAccess: v })}
          disabled={disabled}
        />
        <ProfileYesNoToggle
          label={pl("Nearby park access?")}
          value={form.nearbyParkAccess}
          onChange={(v) => patch(form, onChange, { nearbyParkAccess: v })}
          disabled={disabled}
        />
        </ProfileCollapsibleSection>
      ) : null}
    </div>
  );
}
