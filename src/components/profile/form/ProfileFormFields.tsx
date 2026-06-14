"use client";

import type { ReactNode } from "react";
import { SelectableChip } from "@/components/ui/SelectableChip";
import {
  FORM_FIELD_LABEL_CLASS,
  FORM_FIELD_LEGEND_CLASS,
  FORM_FIELD_OPTION_LABEL_CLASS,
} from "@/lib/form-field-styles";
import { isOtherOptionValue } from "@/lib/other-option";

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
    <div className={className}>
      <span className={FORM_FIELD_LABEL_CLASS}>{label}</span>
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
};

export function ProfileChipSingleSelect({
  label,
  options,
  value,
  onChange,
  disabled,
  className = "sm:col-span-2",
}: ChipSingleSelectProps) {
  return (
    <div className={className}>
      <span className={FORM_FIELD_LABEL_CLASS}>{label}</span>
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
    </div>
  );
}

export function ProfileYesNoToggle({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="sm:col-span-1">
      <legend className={FORM_FIELD_LEGEND_CLASS}>{label}</legend>
      <div className="mt-2 flex gap-3">
        <label className={FORM_FIELD_OPTION_LABEL_CLASS}>
          <input
            type="radio"
            name={label}
            disabled={disabled}
            checked={value === true}
            onChange={() => onChange(true)}
            className="text-brand-teal"
          />
          Yes
        </label>
        <label className={FORM_FIELD_OPTION_LABEL_CLASS}>
          <input
            type="radio"
            name={label}
            disabled={disabled}
            checked={value === false}
            onChange={() => onChange(false)}
            className="text-brand-teal"
          />
          No
        </label>
      </div>
    </fieldset>
  );
}
