"use client";

import { useLanguage } from "@/context/LanguageContext";
import {
  formatPetDobInput,
  validatePetDateOfBirthDisplay,
  type PetDobValidationReason,
} from "@/lib/pet-date-of-birth";

import { RequiredFieldLabel } from "@/components/forms/RequiredFieldLabel";

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
  required?: boolean;
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
  required,
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
      <RequiredFieldLabel htmlFor={id} required={required}>
        {label}
      </RequiredFieldLabel>
      <input
        id={id}
        type="text"
        inputMode="text"
        autoComplete="bday"
        value={display}
        placeholder={placeholder ?? copy.dobPlaceholder}
        disabled={disabled}
        className="input-field mt-1"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : `${id}-hint`}
        onChange={(e) => {
          const next = formatPetDobInput(e.target.value);
          onDisplayChange(next);
          applyValidation(next, false);
        }}
        onBlur={() => applyValidation(display, true)}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-500" role="alert">
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
          {copy.dobHint}
        </p>
      )}
    </div>
  );
}
