"use client";

import { FORM_FIELD_LABEL_CLASS } from "@/lib/form-field-styles";
import { EU_PHONE_COUNTRIES } from "@/lib/phone-eu";
import type { ReactNode } from "react";

type PhoneCountryFieldsProps = {
  idPrefix: string;
  dialCode: string;
  nationalNumber: string;
  onDialCodeChange: (code: string) => void;
  onNationalChange: (value: string) => void;
  disabled?: boolean;
  label: string;
  hint?: ReactNode;
};

export function PhoneCountryFields({
  idPrefix,
  dialCode,
  nationalNumber,
  onDialCodeChange,
  onNationalChange,
  disabled = false,
  label,
  hint,
}: PhoneCountryFieldsProps) {
  const selectId = `${idPrefix}-country`;
  const inputId = `${idPrefix}-national`;

  return (
    <div>
      <span className={FORM_FIELD_LABEL_CLASS}>{label}</span>
      <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <select
          id={selectId}
          value={dialCode}
          disabled={disabled}
          onChange={(e) => onDialCodeChange(e.target.value)}
          className="input-field shrink-0 sm:max-w-[13.5rem]"
          aria-label="Country calling code"
        >
          {EU_PHONE_COUNTRIES.map((c) => (
            <option key={c.iso} value={c.dialCode}>
              {c.name} ({c.dialCode})
            </option>
          ))}
        </select>
        <input
          id={inputId}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          disabled={disabled}
          value={nationalNumber}
          onChange={(e) => onNationalChange(e.target.value)}
          className="input-field min-w-0 flex-1"
          placeholder="51234567"
        />
      </div>
      {hint ? <div className="mt-1 text-xs text-muted">{hint}</div> : null}
    </div>
  );
}
