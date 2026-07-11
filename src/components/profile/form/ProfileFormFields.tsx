"use client";

import type { ReactNode } from "react";
import { SelectableChip } from "@/components/ui/SelectableChip";
import { useLanguage } from "@/context/LanguageContext";
import { RequiredFieldLabel, FormFieldError } from "@/components/forms/RequiredFieldLabel";
import { isOtherOptionValue } from "@/lib/other-option";
import { translateProfileLabel } from "@/lib/profile-translations";

type OtherFieldConfig = {
  text: string;
  onTextChange: (value: string) => void;
  label: string;
  placeholder: string;
  inputId: string;
};

type ChipMultiSelectProps = {
  label: string;
  options: readonly { value: string; label: string }[] | readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
  disabled?: boolean;
  className?: string;
  otherField?: OtherFieldConfig;
  required?: boolean;
  fieldId?: string;
  error?: string | null;
};

function normalizeOptions(
  options: readonly { value: string; label: string }[] | readonly string[],
): { value: string; label: string }[] {
  if (typeof options[0] === "string") {
    return (options as readonly string[]).map((o) => ({ value: o, label: o }));
  }
  return [...(options as readonly { value: string; label: string }[])];
}

export function ProfileChipMultiSelect({
  label,
  options,
  selected,
  onToggle,
  disabled,
  className = "sm:col-span-2",
  otherField,
  required = false,
  fieldId,
  error,
}: ChipMultiSelectProps) {
  const items = normalizeOptions(options);
  const showOtherInput = Boolean(otherField) && selected.some(isOtherOptionValue);

  function handleToggle(value: string) {
    if (otherField && isOtherOptionValue(value) && selected.includes(value)) {
      otherField.onTextChange("");
    }
    onToggle(value);
  }

  return (
    <div className={className} id={fieldId}>
      <RequiredFieldLabel as="span" required={required}>
        {label}
      </RequiredFieldLabel>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((opt) => {
          const isOn = selected.includes(opt.value);
          return (
            <SelectableChip
              key={opt.value}
              selected={isOn}
              disabled={disabled}
              onClick={() => handleToggle(opt.value)}
            >
              {opt.label}
            </SelectableChip>
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
      <FormFieldError message={error} />
    </div>
  );
}

export function OtherOptionTextInput({
  id,
  label,
  placeholder,
  value,
  onChange,
  disabled,
  className = "mt-3",
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="form-field-label">
        {label}
      </label>
      <input
        id={id}
        type="text"
        required
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-field mt-1"
      />
    </div>
  );
}

type ChipSingleSelectProps = {
  label: string;
  options: readonly { value: string; label: string; icon?: ReactNode }[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  fieldId?: string;
  error?: string | null;
};

export function ProfileChipSingleSelect({
  label,
  options,
  value,
  onChange,
  disabled,
  className = "sm:col-span-2",
  required = false,
  fieldId,
  error,
}: ChipSingleSelectProps) {
  return (
    <div className={className} id={fieldId}>
      <RequiredFieldLabel as="span" required={required}>
        {label}
      </RequiredFieldLabel>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((opt) => {
          const isOn = value === opt.value;
          return (
            <SelectableChip
              key={opt.value}
              selected={isOn}
              disabled={disabled}
              icon={opt.icon}
              onClick={() => onChange(opt.value)}
            >
              {opt.label}
            </SelectableChip>
          );
        })}
      </div>
      <FormFieldError message={error} />
    </div>
  );
}

export function ProfileYesNoToggle({
  label,
  value,
  onChange,
  disabled,
  required = false,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  required?: boolean;
}) {
  const { locale } = useLanguage();
  const yesLabel = translateProfileLabel("Yes", locale);
  const noLabel = translateProfileLabel("No", locale);

  return (
    <fieldset className="sm:col-span-1">
      <RequiredFieldLabel as="legend" required={required}>
        {label}
      </RequiredFieldLabel>
      <div className="mt-2 flex gap-3">
        <label className="flex items-center gap-2 text-sm font-medium text-[#333333] dark:text-foreground">
          <input
            type="radio"
            name={label}
            disabled={disabled}
            checked={value === true}
            onChange={() => onChange(true)}
            className="text-brand-teal"
          />
          {yesLabel}
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-[#333333] dark:text-foreground">
          <input
            type="radio"
            name={label}
            disabled={disabled}
            checked={value === false}
            onChange={() => onChange(false)}
            className="text-brand-teal"
          />
          {noLabel}
        </label>
      </div>
    </fieldset>
  );
}
