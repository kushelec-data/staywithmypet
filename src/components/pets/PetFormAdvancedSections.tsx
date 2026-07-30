"use client";

import { ProfileCollapsibleSection } from "@/components/profile/ProfileCollapsibleSection";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
import { PetFormChipGroup } from "@/components/pets/PetFormSection";
import { FormFieldHelper } from "@/components/forms/RequiredFieldLabel";
import { OtherOptionTextInput } from "@/components/profile/form/ProfileFormFields";
import { PET_FORM_SECTION_IDS, type PetFormSectionId } from "@/lib/pet-form-completion";
import type { PetProfileFormInput } from "@/lib/pet-data";
import { useLanguage } from "@/context/LanguageContext";
import { translateProfileLabel } from "@/lib/profile-translations";

type PetFormAdvancedSectionsProps = {
  form: PetProfileFormInput;
  saving: boolean;
  optionalLabel: string;
  localizedEnergyOptions: { value: string; label: string }[];
  localizedWalkOptions: { value: string; label: string }[];
  localizedFriendReqOptions: { value: string; label: string }[];
  localizedCareLocationOptions: { value: string; label: string }[];
  selectWalkNeedsPlaceholder: string;
  selectEnergyPlaceholder: string;
  openSections: Partial<Record<PetFormSectionId, boolean>>;
  onOpenSection: (sectionId: PetFormSectionId, open: boolean) => void;
  onPatch: <K extends keyof PetProfileFormInput>(key: K, value: PetProfileFormInput[K]) => void;
  onToggleList: (key: "friendRequirements", value: string) => void;
  sensitiveCopy: {
    medication: string;
    healthConditions: string;
    behaviourNotes: string;
    feedingInstructions: string;
    specialCare: string;
  };
  sectionCopy: {
    health: string;
    healthDescription: string;
    feeding: string;
    feedingDescription: string;
    walking: string;
    walkingDescription: string;
    behaviour: string;
    behaviourDescription: string;
    friendRequirements: string;
    friendRequirementsDescription: string;
    careLocation: string;
    careLocationDescription: string;
    notes: string;
    notesDescription: string;
    medicationUnset: string;
  };
  pl: (en: string) => string;
  yesLabel: string;
  noLabel: string;
};

export function PetFormAdvancedSections({
  form,
  saving,
  optionalLabel,
  localizedEnergyOptions,
  localizedWalkOptions,
  localizedFriendReqOptions,
  localizedCareLocationOptions,
  selectWalkNeedsPlaceholder,
  selectEnergyPlaceholder,
  openSections,
  onOpenSection,
  onPatch,
  onToggleList,
  sensitiveCopy,
  sectionCopy,
  pl,
  yesLabel,
  noLabel,
}: PetFormAdvancedSectionsProps) {
  const { locale } = useLanguage();

  return (
    <div className="space-y-4">
      <ProfileCollapsibleSection
        id={PET_FORM_SECTION_IDS.health}
        title={sectionCopy.health}
        description={sectionCopy.healthDescription}
        optionalLabel={optionalLabel}
        open={openSections[PET_FORM_SECTION_IDS.health]}
        onOpenChange={(open) => onOpenSection(PET_FORM_SECTION_IDS.health, open)}
      >
        <div className="sm:col-span-2">
          <span className="form-field-label">{pl("Requires medication")}</span>
          <div className="mt-2 flex flex-wrap gap-4">
            <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-[#333333] dark:text-foreground">
              <input
                type="radio"
                name="medication"
                checked={form.requiresMedication === true}
                onChange={() => onPatch("requiresMedication", true)}
              />
              {yesLabel}
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-[#333333] dark:text-foreground">
              <input
                type="radio"
                name="medication"
                checked={form.requiresMedication === false}
                onChange={() => onPatch("requiresMedication", false)}
              />
              {noLabel}
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-muted">
              <input
                type="radio"
                name="medication"
                checked={form.requiresMedication === null}
                onChange={() => onPatch("requiresMedication", null)}
              />
              {sectionCopy.medicationUnset}
            </label>
          </div>
          <FormFieldHelper>{sensitiveCopy.medication}</FormFieldHelper>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="health" className="form-field-label">
            {pl("Health characteristics")}
          </label>
          <AutoResizeTextarea
            id="health"
            minRows={2}
            value={form.healthCharacteristics}
            onChange={(e) => onPatch("healthCharacteristics", e.target.value)}
            className="input-field mt-1 w-full"
          />
          <FormFieldHelper>{sensitiveCopy.healthConditions}</FormFieldHelper>
        </div>
      </ProfileCollapsibleSection>

      <ProfileCollapsibleSection
        id={PET_FORM_SECTION_IDS.feeding}
        title={sectionCopy.feeding}
        description={sectionCopy.feedingDescription}
        optionalLabel={optionalLabel}
        open={openSections[PET_FORM_SECTION_IDS.feeding]}
        onOpenChange={(open) => onOpenSection(PET_FORM_SECTION_IDS.feeding, open)}
      >
        <div>
          <label htmlFor="feeding" className="form-field-label">
            {pl("Feeding Schedule")}
          </label>
          <input
            id="feeding"
            value={form.feedingSchedule}
            onChange={(e) => onPatch("feedingSchedule", e.target.value)}
            className="input-field mt-1 w-full"
          />
          <FormFieldHelper>{sensitiveCopy.feedingInstructions}</FormFieldHelper>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="eating" className="form-field-label">
            {pl("Eating habits")}
          </label>
          <AutoResizeTextarea
            id="eating"
            minRows={2}
            value={form.eatingHabits}
            onChange={(e) => onPatch("eatingHabits", e.target.value)}
            className="input-field mt-1 w-full"
          />
          <FormFieldHelper>{sensitiveCopy.feedingInstructions}</FormFieldHelper>
        </div>
      </ProfileCollapsibleSection>

      <ProfileCollapsibleSection
        id={PET_FORM_SECTION_IDS.walking}
        title={sectionCopy.walking}
        description={sectionCopy.walkingDescription}
        optionalLabel={optionalLabel}
        open={openSections[PET_FORM_SECTION_IDS.walking]}
        onOpenChange={(open) => onOpenSection(PET_FORM_SECTION_IDS.walking, open)}
      >
        <div className="sm:col-span-2">
          <label htmlFor="walk" className="form-field-label">
            {pl("Walk needs")}
          </label>
          <select
            id="walk"
            value={form.walkNeeds}
            onChange={(e) => onPatch("walkNeeds", e.target.value)}
            className="input-field mt-1 w-full"
          >
            <option value="">{selectWalkNeedsPlaceholder}</option>
            {localizedWalkOptions.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
        </div>
      </ProfileCollapsibleSection>

      <ProfileCollapsibleSection
        id={PET_FORM_SECTION_IDS.behaviour}
        title={sectionCopy.behaviour}
        description={sectionCopy.behaviourDescription}
        optionalLabel={optionalLabel}
        open={openSections[PET_FORM_SECTION_IDS.behaviour]}
        onOpenChange={(open) => onOpenSection(PET_FORM_SECTION_IDS.behaviour, open)}
      >
        <div>
          <label htmlFor="energy" className="form-field-label">
            {pl("Energy level")}
          </label>
          <select
            id="energy"
            value={form.energyLevel}
            onChange={(e) => onPatch("energyLevel", e.target.value)}
            className="input-field mt-1 w-full"
          >
            <option value="">{selectEnergyPlaceholder}</option>
            {localizedEnergyOptions.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="challenging" className="form-field-label">
            {pl("Challenging traits")}
          </label>
          <AutoResizeTextarea
            id="challenging"
            minRows={2}
            value={form.challengingTraits}
            onChange={(e) => onPatch("challengingTraits", e.target.value)}
            className="input-field mt-1 w-full"
          />
          <FormFieldHelper>{sensitiveCopy.behaviourNotes}</FormFieldHelper>
        </div>
      </ProfileCollapsibleSection>

      <ProfileCollapsibleSection
        id={PET_FORM_SECTION_IDS.friendRequirements}
        title={sectionCopy.friendRequirements}
        description={sectionCopy.friendRequirementsDescription}
        optionalLabel={optionalLabel}
        open={openSections[PET_FORM_SECTION_IDS.friendRequirements]}
        onOpenChange={(open) => onOpenSection(PET_FORM_SECTION_IDS.friendRequirements, open)}
      >
        <PetFormChipGroup
          label={pl("Requirements")}
          options={localizedFriendReqOptions}
          selected={form.friendRequirements}
          onToggle={(v) => onToggleList("friendRequirements", v)}
          disabled={saving}
        />
      </ProfileCollapsibleSection>

      <ProfileCollapsibleSection
        id={PET_FORM_SECTION_IDS.careLocation}
        title={sectionCopy.careLocation}
        description={sectionCopy.careLocationDescription}
        optionalLabel={optionalLabel}
        open={openSections[PET_FORM_SECTION_IDS.careLocation]}
        onOpenChange={(open) => onOpenSection(PET_FORM_SECTION_IDS.careLocation, open)}
      >
        <div className="sm:col-span-2">
          <span className="form-field-label">{pl("Care location preference")}</span>
          <div className="mt-2 space-y-2">
            {localizedCareLocationOptions.map((opt) => (
              <label key={opt.value} className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="care_location"
                  checked={form.careLocation === opt.value}
                  onChange={() => onPatch("careLocation", opt.value)}
                />
                {opt.label}
              </label>
            ))}
            <label className="flex min-h-11 items-center gap-2 text-sm text-muted">
              <input
                type="radio"
                name="care_location"
                checked={!form.careLocation}
                onChange={() => onPatch("careLocation", "")}
              />
              {translateProfileLabel("Not specified", locale)}
            </label>
          </div>
        </div>
      </ProfileCollapsibleSection>

      <ProfileCollapsibleSection
        id={PET_FORM_SECTION_IDS.notes}
        title={sectionCopy.notes}
        description={sectionCopy.notesDescription}
        optionalLabel={optionalLabel}
        open={openSections[PET_FORM_SECTION_IDS.notes]}
        onOpenChange={(open) => onOpenSection(PET_FORM_SECTION_IDS.notes, open)}
      >
        <div className="sm:col-span-2">
          <label htmlFor="notes" className="form-field-label">
            {pl("Additional Notes")}
          </label>
          <AutoResizeTextarea
            id="notes"
            minRows={3}
            value={form.additionalNotes}
            onChange={(e) => onPatch("additionalNotes", e.target.value)}
            className="input-field mt-1 w-full"
          />
          <FormFieldHelper>{sensitiveCopy.specialCare}</FormFieldHelper>
        </div>
      </ProfileCollapsibleSection>
    </div>
  );
}
