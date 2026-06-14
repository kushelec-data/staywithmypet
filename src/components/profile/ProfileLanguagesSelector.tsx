"use client";

import { SelectableChip } from "@/components/ui/SelectableChip";
import { OtherOptionTextInput } from "@/components/profile/form/ProfileFormFields";
import { useLanguage } from "@/context/LanguageContext";
import { FORM_FIELD_LABEL_CLASS } from "@/lib/form-field-styles";
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
};

export function ProfileLanguagesSelector({
  languages,
  languagesOther,
  onLanguagesChange,
  onLanguagesOtherChange,
  disabled,
  label,
  otherPlaceholder,
  otherInputId = "profile_languages_other",
  className = "sm:col-span-2",
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
    <div className={className}>
      <span className={FORM_FIELD_LABEL_CLASS}>{fieldLabel}</span>
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
    </div>
  );
}
