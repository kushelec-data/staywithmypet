"use client";

import {
  FORM_FIELD_CHIP_VALUE_CLASS,
  FORM_FIELD_CHIP_VALUE_SELECTED_CLASS,
  FORM_FIELD_LABEL_CLASS,
} from "@/lib/form-field-styles";
import { OtherOptionTextInput } from "@/components/profile/form/ProfileFormFields";
import { isOtherOptionValue } from "@/lib/other-option";

type PetFormSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function PetFormSection({ title, description, children }: PetFormSectionProps) {
  return (
    <section className="rounded-2xl border border-black/5 bg-surface/50 p-5 sm:p-6">
      <h2 className="font-heading text-base font-semibold text-foreground">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      <div className="mt-4 grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

type ChipGroupProps = {
  label: string;
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
  disabled?: boolean;
  otherField?: {
    text: string;
    onTextChange: (value: string) => void;
    label: string;
    placeholder: string;
    inputId: string;
  };
};

export function PetFormChipGroup({
  label,
  options,
  selected,
  onToggle,
  disabled,
  otherField,
}: ChipGroupProps) {
  const showOtherInput = Boolean(otherField) && selected.some(isOtherOptionValue);

  function handleToggle(value: string) {
    if (otherField && isOtherOptionValue(value) && selected.includes(value)) {
      otherField.onTextChange("");
    }
    onToggle(value);
  }

  return (
    <div className="sm:col-span-2">
      <span className={FORM_FIELD_LABEL_CLASS}>{label}</span>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const isOn = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              disabled={disabled}
              onClick={() => handleToggle(option)}
              className={`rounded-full border px-3 py-1.5 transition-colors ${
                isOn
                  ? `border-brand-teal/30 bg-brand-teal text-white ${FORM_FIELD_CHIP_VALUE_SELECTED_CLASS}`
                  : `border-black/5 bg-surface hover:bg-mint/40 ${FORM_FIELD_CHIP_VALUE_CLASS}`
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
      {showOtherInput && otherField ? (
        <OtherOptionTextInput
          id={otherField.inputId}
          label={otherField.label}
          placeholder={otherField.placeholder}
          value={otherField.text}
          onChange={otherField.onTextChange}
          disabled={disabled}
        />
      ) : null}
    </div>
  );
}
