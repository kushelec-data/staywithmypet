"use client";

import { ProfileChipMultiSelect } from "@/components/profile/form/ProfileFormFields";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
import { FormFieldHelper } from "@/components/forms/RequiredFieldLabel";
import { useLanguage } from "@/context/LanguageContext";
import { toProfileLabeledChipOptions, toProfileStringChipOptions } from "@/lib/profile-option-labels";
import { careTypeOptions, petTypeOptions } from "@/lib/profile-friend-options";
import { OTHER_FIELD_COPY } from "@/lib/other-option";
import { useMemo } from "react";
import type { PetParentProfileFormInput } from "@/lib/profile-parent-form";

type PetParentProfileFormSectionProps = {
  form: PetParentProfileFormInput;
  onChange: (next: PetParentProfileFormInput) => void;
  disabled?: boolean;
  labels: {
    ownPetsSummary: string;
    ownPetsSummaryPlaceholder: string;
    careNeeds: string;
    careNeedsPlaceholder: string;
    homeLocationNotes: string;
    homeLocationNotesPlaceholder: string;
    preferredPetTypes: string;
    preferredCareTypes: string;
    petsLinkHint: string;
    petsLinkLabel: string;
  };
};

function patch(
  form: PetParentProfileFormInput,
  onChange: PetParentProfileFormSectionProps["onChange"],
  partial: Partial<PetParentProfileFormInput>,
) {
  onChange({ ...form, ...partial });
}

function toggleInList(
  form: PetParentProfileFormInput,
  onChange: PetParentProfileFormSectionProps["onChange"],
  key: "preferredPetTypes" | "preferredCareTypes",
  value: string,
) {
  const list = form[key];
  const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  patch(form, onChange, { [key]: next } as Partial<PetParentProfileFormInput>);
}

export function PetParentProfileFormSection({
  form,
  onChange,
  disabled,
  labels,
}: PetParentProfileFormSectionProps) {
  const { locale, t } = useLanguage();
  const optionalHint = t.petFormPhase2.optionalLater;
  const petTypeChips = useMemo(() => toProfileLabeledChipOptions(petTypeOptions, locale), [locale]);
  const careTypeChips = useMemo(() => toProfileStringChipOptions(careTypeOptions, locale), [locale]);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        {labels.petsLinkHint}{" "}
        <a href="/pets" className="font-semibold text-brand-teal hover:text-brand-pink">
          {labels.petsLinkLabel}
        </a>
      </p>

      <div>
        <label htmlFor="own_pets_summary" className="form-field-label">
          {labels.ownPetsSummary}
        </label>
        <FormFieldHelper>{optionalHint}</FormFieldHelper>
        <AutoResizeTextarea
          id="own_pets_summary"
          minRows={3}
          disabled={disabled}
          value={form.ownPetsSummary}
          onChange={(e) => patch(form, onChange, { ownPetsSummary: e.target.value })}
          placeholder={labels.ownPetsSummaryPlaceholder}
          className="input-field mt-1"
        />
      </div>

      <div>
        <label htmlFor="care_needs_notes" className="form-field-label">
          {labels.careNeeds}
        </label>
        <AutoResizeTextarea
          id="care_needs_notes"
          minRows={3}
          disabled={disabled}
          value={form.careNeedsNotes}
          onChange={(e) => patch(form, onChange, { careNeedsNotes: e.target.value })}
          placeholder={labels.careNeedsPlaceholder}
          className="input-field mt-1"
        />
      </div>

      <div>
        <label htmlFor="home_location_notes" className="form-field-label">
          {labels.homeLocationNotes}
        </label>
        <AutoResizeTextarea
          id="home_location_notes"
          minRows={2}
          disabled={disabled}
          value={form.homeLocationNotes}
          onChange={(e) => patch(form, onChange, { homeLocationNotes: e.target.value })}
          placeholder={labels.homeLocationNotesPlaceholder}
          className="input-field mt-1"
        />
      </div>

      <ProfileChipMultiSelect
        label={labels.preferredPetTypes}
        options={petTypeChips}
        selected={form.preferredPetTypes}
        onToggle={(v) => toggleInList(form, onChange, "preferredPetTypes", v)}
        disabled={disabled}
        otherField={{
          text: form.preferredPetTypesOther,
          onTextChange: (preferredPetTypesOther) => patch(form, onChange, { preferredPetTypesOther }),
          label: OTHER_FIELD_COPY.petType.label,
          placeholder: OTHER_FIELD_COPY.petType.placeholder,
          inputId: "preferred_pet_types_other",
        }}
      />

      <ProfileChipMultiSelect
        label={labels.preferredCareTypes}
        options={careTypeChips}
        selected={form.preferredCareTypes}
        onToggle={(v) => toggleInList(form, onChange, "preferredCareTypes", v)}
        disabled={disabled}
        otherField={{
          text: form.preferredCareTypesOther,
          onTextChange: (preferredCareTypesOther) => patch(form, onChange, { preferredCareTypesOther }),
          label: OTHER_FIELD_COPY.careType.label,
          placeholder: OTHER_FIELD_COPY.careType.placeholder,
          inputId: "preferred_care_types_other",
        }}
      />
    </div>
  );
}
