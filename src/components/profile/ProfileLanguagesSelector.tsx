"use client";

import { SelectableChip } from "@/components/ui/SelectableChip";
import { OtherOptionTextInput } from "@/components/profile/form/ProfileFormFields";
import { useLanguage } from "@/context/LanguageContext";
import { RequiredFieldLabel, FormFieldError } from "@/components/forms/RequiredFieldLabel";
import { isOtherOptionValue } from "@/lib/other-option";
import {
  profileLanguageOptions,
  toggleProfileLanguage,
} from "@/lib/profile-languages";
import { translateProfileLabel } from "@/lib/profile-translations";

type ProfileLanguagesSelectorProps = {
  languages: string[];
  languagesOther: string;
  onLanguagesChange: (languages: string[]) => void;
  onLanguagesOtherChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
  otherPlaceholder?: string;
  otherInputId?: string;
  className?: string;
  required?: boolean;
  error?: string | null;
  fieldId?: string;
};

export function ProfileLanguagesSelector({
  languages,
  languagesOther,
  onLanguagesChange,
  onLanguagesOtherChange,
  disabled,
  label,
  otherPlaceholder,
  otherInputId = "profile-languages-other",
  className = "sm:col-span-2",
  required = false,
  error,
  fieldId = "profile-languages",
}: ProfileLanguagesSelectorProps) {
  const { locale, t } = useLanguage();
  const setup = t.account.profileSetup;
  const fieldLabel = label ?? setup.languages;
  const placeholder = otherPlaceholder ?? setup.languageOtherPlaceholder;

  function handleToggle(lang: string) {
    const next = toggleProfileLanguage(languages, languagesOther, lang);
    onLanguagesChange(next.languages);
    onLanguagesOtherChange(next.languagesOther);
  }

  const showOtherInput = languages.some(isOtherOptionValue);

  return (
    <div id={fieldId} className={className}>
      <RequiredFieldLabel as="span" required={required}>
        {fieldLabel}
      </RequiredFieldLabel>
      <div className="mt-2 flex flex-wrap gap-2">
        {profileLanguageOptions.map((lang) => (
          <SelectableChip
            key={lang}
            selected={languages.includes(lang)}
            disabled={disabled}
            onClick={() => handleToggle(lang)}
          >
            {translateProfileLabel(lang, locale)}
          </SelectableChip>
        ))}
      </div>
      {showOtherInput ? (
        <OtherOptionTextInput
          id={otherInputId}
          label={translateProfileLabel("Other", locale)}
          placeholder={placeholder}
          value={languagesOther}
          onChange={onLanguagesOtherChange}
          disabled={disabled}
        />
      ) : null}
      <FormFieldError message={error} />
    </div>
  );
}
