"use client";

import { ProfileChipMultiSelect } from "@/components/profile/form/ProfileFormFields";
import { careTypeOptions, petTypeOptions } from "@/lib/profile-friend-options";
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
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        {labels.petsLinkHint}{" "}
        <a href="/pets" className="font-semibold text-brand-teal hover:text-brand-pink">
          {labels.petsLinkLabel}
        </a>
      </p>

      <div>
        <label htmlFor="own_pets_summary" className="text-sm font-medium text-foreground">
          {labels.ownPetsSummary}
        </label>
        <textarea
          id="own_pets_summary"
          rows={3}
          disabled={disabled}
          value={form.ownPetsSummary}
          onChange={(e) => patch(form, onChange, { ownPetsSummary: e.target.value })}
          placeholder={labels.ownPetsSummaryPlaceholder}
          className="input-field mt-1 resize-y"
        />
      </div>

      <div>
        <label htmlFor="care_needs_notes" className="text-sm font-medium text-foreground">
          {labels.careNeeds}
        </label>
        <textarea
          id="care_needs_notes"
          rows={3}
          disabled={disabled}
          value={form.careNeedsNotes}
          onChange={(e) => patch(form, onChange, { careNeedsNotes: e.target.value })}
          placeholder={labels.careNeedsPlaceholder}
          className="input-field mt-1 resize-y"
        />
      </div>

      <div>
        <label htmlFor="home_location_notes" className="text-sm font-medium text-foreground">
          {labels.homeLocationNotes}
        </label>
        <textarea
          id="home_location_notes"
          rows={2}
          disabled={disabled}
          value={form.homeLocationNotes}
          onChange={(e) => patch(form, onChange, { homeLocationNotes: e.target.value })}
          placeholder={labels.homeLocationNotesPlaceholder}
          className="input-field mt-1 resize-y"
        />
      </div>

      <ProfileChipMultiSelect
        label={labels.preferredPetTypes}
        options={petTypeOptions}
        selected={form.preferredPetTypes}
        onToggle={(v) => toggleInList(form, onChange, "preferredPetTypes", v)}
        disabled={disabled}
      />

      <ProfileChipMultiSelect
        label={labels.preferredCareTypes}
        options={careTypeOptions}
        selected={form.preferredCareTypes}
        onToggle={(v) => toggleInList(form, onChange, "preferredCareTypes", v)}
        disabled={disabled}
      />
    </div>
  );
}
