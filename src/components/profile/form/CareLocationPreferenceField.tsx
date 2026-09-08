"use client";

import { FormFieldError, FormFieldHelper, RequiredFieldLabel } from "@/components/forms/RequiredFieldLabel";
import { useLanguage } from "@/context/LanguageContext";
import { CARE_LOCATION_PREFERENCE_OPTIONS } from "@/lib/care-location-preference";
import { translateProfileHelper, translateProfileLabel } from "@/lib/profile-translations";

type CareLocationPreferenceFieldProps = {
  name: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  fieldId?: string;
  error?: string | null;
  className?: string;
};

export function CareLocationPreferenceField({
  name,
  value,
  onChange,
  disabled,
  required = false,
  fieldId,
  error,
  className = "sm:col-span-2",
}: CareLocationPreferenceFieldProps) {
  const { locale } = useLanguage();
  const pl = (en: string) => translateProfileLabel(en, locale);
  const helper = translateProfileHelper("Choose what suits your lifestyle and space", locale);

  return (
    <fieldset className={className} id={fieldId}>
      <RequiredFieldLabel as="legend" required={required}>
        {pl("Care Location Preference")}
      </RequiredFieldLabel>
      <FormFieldHelper>{helper}</FormFieldHelper>
      <div className="mt-2 grid gap-2">
        {CARE_LOCATION_PREFERENCE_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className="flex cursor-pointer items-start gap-2 text-sm font-medium text-[#333333] dark:text-foreground"
          >
            <input
              type="radio"
              name={name}
              disabled={disabled}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="mt-0.5 text-brand-teal"
            />
            <span>{pl(opt.label)}</span>
          </label>
        ))}
      </div>
      <FormFieldError message={error} />
    </fieldset>
  );
}
