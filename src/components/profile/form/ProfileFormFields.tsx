"use client";

import type { ReactNode } from "react";
import {
  FORM_FIELD_CHIP_VALUE_CLASS,
  FORM_FIELD_CHIP_VALUE_SELECTED_CLASS,
  FORM_FIELD_LABEL_CLASS,
  FORM_FIELD_LEGEND_CLASS,
  FORM_FIELD_OPTION_LABEL_CLASS,
} from "@/lib/form-field-styles";

const CHIP_SELECTED =
  `border-brand-teal/35 bg-mint/55 shadow-sm ring-1 ring-brand-teal/15 ${FORM_FIELD_CHIP_VALUE_SELECTED_CLASS}`;
const CHIP_UNSELECTED =
  `border-black/5 bg-surface hover:border-brand-teal/25 hover:bg-mint/40 ${FORM_FIELD_CHIP_VALUE_CLASS}`;

type ChipMultiSelectProps = {
  label: string;
  options: readonly { value: string; label: string }[] | readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
  disabled?: boolean;
  className?: string;
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
}: ChipMultiSelectProps) {
  const items = normalizeOptions(options);
  return (
    <div className={className}>
      <span className={FORM_FIELD_LABEL_CLASS}>{label}</span>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((opt) => {
          const isOn = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(opt.value)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors ${
                isOn ? CHIP_SELECTED : CHIP_UNSELECTED
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
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
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              aria-pressed={isOn}
              onClick={() => onChange(opt.value)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors ${
                isOn ? CHIP_SELECTED : CHIP_UNSELECTED
              }`}
            >
              {opt.icon ? (
                <span className="text-brand-teal/90" aria-hidden>
                  {opt.icon}
                </span>
              ) : null}
              {opt.label}
            </button>
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
