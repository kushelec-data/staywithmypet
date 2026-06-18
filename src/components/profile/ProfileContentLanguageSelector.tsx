"use client";

import { SelectableChip } from "@/components/ui/SelectableChip";
import { useLanguage } from "@/context/LanguageContext";
import { FORM_FIELD_LABEL_CLASS } from "@/lib/form-field-styles";
import {
  PROFILE_CONTENT_LANGUAGE_OPTIONS,
  profileContentLanguageLabel,
  type ProfileContentLanguage,
} from "@/lib/profile-content-language";

type ProfileContentLanguageSelectorProps = {
  value: ProfileContentLanguage | "";
  onChange: (value: ProfileContentLanguage | "") => void;
  disabled?: boolean;
  label?: string;
  hint?: string;
  className?: string;
};

export function ProfileContentLanguageSelector({
  value,
  onChange,
  disabled,
  label,
  hint,
  className = "sm:col-span-2",
}: ProfileContentLanguageSelectorProps) {
  const { locale, t } = useLanguage();
  const copy = t.profileContentLanguage;
  const fieldLabel = label ?? copy.fieldLabel;
  const fieldHint = hint ?? copy.fieldHint;

  return (
    <div className={className}>
      <span className={FORM_FIELD_LABEL_CLASS}>{fieldLabel}</span>
      {fieldHint ? <p className="mt-1 text-xs text-muted">{fieldHint}</p> : null}
      <div className="mt-2 flex flex-wrap gap-2">
        {PROFILE_CONTENT_LANGUAGE_OPTIONS.map((code) => (
          <SelectableChip
            key={code}
            selected={value === code}
            disabled={disabled}
            onClick={() => onChange(value === code ? "" : code)}
          >
            {profileContentLanguageLabel(code, locale)}
          </SelectableChip>
        ))}
      </div>
    </div>
  );
}
