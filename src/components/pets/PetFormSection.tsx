"use client";

import { SelectableChip } from "@/components/ui/SelectableChip";
import { FORM_FIELD_LABEL_CLASS } from "@/lib/form-field-styles";
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
  options: readonly string[] | readonly { value: string; label: string }[];
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

function normalizeChipOptions(
  options: readonly string[] | readonly { value: string; label: string }[],
): { value: string; label: string }[] {
  if (typeof options[0] === "string") {
    return (options as readonly string[]).map((value) => ({ value, label: value }));
  }
  return [...(options as readonly { value: string; label: string }[])];
}

export function PetFormChipGroup({
  label,
  options,
  selected,
  onToggle,
  disabled,
  otherField,
}: ChipGroupProps) {
  const items = normalizeChipOptions(options);
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
        {items.map((option) => {
          const isOn = selected.includes(option.value);
          return (
            <SelectableChip
              key={option.value}
              selected={isOn}
              disabled={disabled}
              onClick={() => handleToggle(option.value)}
            >
              {option.label}
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
