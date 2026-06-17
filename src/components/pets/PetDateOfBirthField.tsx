"use client";

import { useLanguage } from "@/context/LanguageContext";
import {
  validatePetDateOfBirthDisplay,
  type PetDobValidationReason,
} from "@/lib/pet-date-of-birth";

type PetDateOfBirthFieldProps = {
  id: string;
  label: string;
  display: string;
  onDisplayChange: (value: string) => void;
  onIsoChange: (iso: string) => void;
  error?: string | null;
  onError?: (message: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
};

function dobErrorMessage(
  reason: PetDobValidationReason,
  copy: {
    dobInvalidFormat: string;
    dobInvalidDate: string;
    dobFuture: string;
  },
): string {
  switch (reason) {
    case "invalid_format":
      return copy.dobInvalidFormat;
    case "invalid_date":
      return copy.dobInvalidDate;
    case "future":
      return copy.dobFuture;
  }
}

export function PetDateOfBirthField({
  id,
  label,
  display,
  onDisplayChange,
  onIsoChange,
  error,
  onError,
  disabled,
  placeholder,
}: PetDateOfBirthFieldProps) {
  const { t } = useLanguage();
  const copy = t.account.petsPage;

  function applyValidation(nextDisplay: string, showError: boolean) {
    const result = validatePetDateOfBirthDisplay(nextDisplay);
    if (result.ok) {
      onError?.(null);
      onIsoChange(result.iso);
      return;
    }
    if (showError) {
      onError?.(dobErrorMessage(result.reason, copy));
    }
  }

  return (
    <div>
      <label htmlFor={id} className="form-field-label">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="bday"
        value={display}
        placeholder={placeholder ?? copy.dobPlaceholder}
        disabled={disabled}
        className="input-field mt-1"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => {
          const next = e.target.value;
          onDisplayChange(next);
          applyValidation(next, false);
        }}
        onBlur={() => applyValidation(display, true)}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-500" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
