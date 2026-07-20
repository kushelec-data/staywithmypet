"use client";

import { PhoneCountryFields } from "@/components/profile/PhoneCountryFields";
import { ProfileCollapsibleSection } from "@/components/profile/ProfileCollapsibleSection";
import { useLanguage } from "@/context/LanguageContext";
import { FORM_FIELD_LABEL_CLASS } from "@/lib/form-field-styles";
import {
  emptyPreferredVetClinicFormValues,
  PREFERRED_VET_NOTES_MAX,
  type PreferredVetClinicFormValues,
} from "@/lib/preferred-vet-clinic";

export { emptyPreferredVetClinicFormValues };
export type { PreferredVetClinicFormValues };

type PreferredVetClinicFormSectionProps = {
  values: PreferredVetClinicFormValues;
  onChange: (values: PreferredVetClinicFormValues) => void;
  disabled?: boolean;
  embedded?: boolean;
};

export function PreferredVetClinicFormSection({
  values,
  onChange,
  disabled = false,
  embedded = false,
}: PreferredVetClinicFormSectionProps) {
  const { t } = useLanguage();
  const copy = t.trustSafety.preferredVet;

  function patch(partial: Partial<PreferredVetClinicFormValues>) {
    onChange({ ...values, ...partial });
  }

  const body = (
    <div className="space-y-4 sm:col-span-2">
      {!embedded ? <p className="text-sm text-muted">{copy.sectionHint}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="preferred-vet-clinic-name" className={FORM_FIELD_LABEL_CLASS}>
            {copy.clinicNameLabel}
          </label>
          <input
            id="preferred-vet-clinic-name"
            type="text"
            value={values.clinicName}
            disabled={disabled}
            onChange={(e) => patch({ clinicName: e.target.value })}
            className="input-field mt-1"
            placeholder={copy.clinicNamePlaceholder}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="preferred-vet-veterinarian-name" className={FORM_FIELD_LABEL_CLASS}>
            {copy.veterinarianNameLabel}
          </label>
          <input
            id="preferred-vet-veterinarian-name"
            type="text"
            value={values.veterinarianName}
            disabled={disabled}
            onChange={(e) => patch({ veterinarianName: e.target.value })}
            className="input-field mt-1"
            placeholder={copy.veterinarianNamePlaceholder}
          />
        </div>

        <div className="sm:col-span-2">
          <PhoneCountryFields
            idPrefix="preferred-vet-phone"
            label={copy.clinicPhoneLabel}
            dialCode={values.phoneDialCode}
            nationalNumber={values.phoneNational}
            onDialCodeChange={(phoneDialCode) => patch({ phoneDialCode })}
            onNationalChange={(phoneNational) => patch({ phoneNational })}
            disabled={disabled}
          />
        </div>

        <div className="sm:col-span-2">
          <PhoneCountryFields
            idPrefix="preferred-vet-emergency-phone"
            label={copy.emergencyPhoneLabel}
            dialCode={values.emergencyPhoneDialCode}
            nationalNumber={values.emergencyPhoneNational}
            onDialCodeChange={(emergencyPhoneDialCode) => patch({ emergencyPhoneDialCode })}
            onNationalChange={(emergencyPhoneNational) => patch({ emergencyPhoneNational })}
            disabled={disabled}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="preferred-vet-email" className={FORM_FIELD_LABEL_CLASS}>
            {copy.emailLabel}
          </label>
          <input
            id="preferred-vet-email"
            type="email"
            value={values.email}
            disabled={disabled}
            onChange={(e) => patch({ email: e.target.value })}
            className="input-field mt-1"
            placeholder={copy.emailPlaceholder}
            autoComplete="email"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="preferred-vet-address" className={FORM_FIELD_LABEL_CLASS}>
            {copy.addressLabel}
          </label>
          <input
            id="preferred-vet-address"
            type="text"
            value={values.address}
            disabled={disabled}
            onChange={(e) => patch({ address: e.target.value })}
            className="input-field mt-1"
            placeholder={copy.addressPlaceholder}
          />
        </div>

        <div>
          <label htmlFor="preferred-vet-city" className={FORM_FIELD_LABEL_CLASS}>
            {copy.cityLabel}
          </label>
          <input
            id="preferred-vet-city"
            type="text"
            value={values.city}
            disabled={disabled}
            onChange={(e) => patch({ city: e.target.value })}
            className="input-field mt-1"
            placeholder={copy.cityPlaceholder}
          />
        </div>

        <div>
          <label htmlFor="preferred-vet-postal-code" className={FORM_FIELD_LABEL_CLASS}>
            {copy.postalCodeLabel}
          </label>
          <input
            id="preferred-vet-postal-code"
            type="text"
            value={values.postalCode}
            disabled={disabled}
            onChange={(e) => patch({ postalCode: e.target.value })}
            className="input-field mt-1"
            placeholder={copy.postalCodePlaceholder}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="preferred-vet-opening-hours" className={FORM_FIELD_LABEL_CLASS}>
            {copy.openingHoursLabel}
          </label>
          <input
            id="preferred-vet-opening-hours"
            type="text"
            value={values.openingHours}
            disabled={disabled}
            onChange={(e) => patch({ openingHours: e.target.value })}
            className="input-field mt-1"
            placeholder={copy.openingHoursPlaceholder}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="preferred-vet-notes" className={FORM_FIELD_LABEL_CLASS}>
            {copy.notesLabel}
          </label>
          <textarea
            id="preferred-vet-notes"
            value={values.notes}
            disabled={disabled}
            onChange={(e) => patch({ notes: e.target.value })}
            className="input-field mt-1 min-h-[96px]"
            placeholder={copy.notesPlaceholder}
            maxLength={PREFERRED_VET_NOTES_MAX}
          />
          <p className="mt-1 text-xs text-muted">
            {values.notes.length}/{PREFERRED_VET_NOTES_MAX}
          </p>
        </div>

        <div className="sm:col-span-2">
          <label className="flex items-start gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={values.shareDuringBooking}
              disabled={disabled}
              onChange={(e) => patch({ shareDuringBooking: e.target.checked })}
              className="mt-1"
            />
            <span>{copy.shareDuringBookingLabel}</span>
          </label>
        </div>
      </div>
    </div>
  );

  if (embedded) return body;

  return (
    <ProfileCollapsibleSection id="preferred-vet-clinic" title={copy.sectionTitle} defaultOpen>
      {body}
    </ProfileCollapsibleSection>
  );
}
