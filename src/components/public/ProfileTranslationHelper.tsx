"use client";

import { useLanguage } from "@/context/LanguageContext";
import {
  profileContentLanguageInSentence,
  shouldShowProfileTranslationHelper,
  type ProfileContentLanguage,
} from "@/lib/profile-content-language";

type ProfileTranslationHelperProps = {
  profileLanguage: ProfileContentLanguage | null | undefined;
  className?: string;
};

export function ProfileTranslationHelper({
  profileLanguage,
  className = "",
}: ProfileTranslationHelperProps) {
  const { locale, t } = useLanguage();

  if (!shouldShowProfileTranslationHelper(profileLanguage, locale)) {
    return null;
  }

  const languageName = profileContentLanguageInSentence(profileLanguage!, locale);
  const message = t.profileTranslationHelper.message.replace("{language}", languageName);

  return (
    <div
      className={`rounded-xl border border-brand-teal/15 bg-cream/90 px-3.5 py-2.5 text-xs leading-relaxed text-muted sm:text-sm ${className}`}
      role="note"
    >
      <span aria-hidden className="mr-1.5">
        🌐
      </span>
      {message}
    </div>
  );
}
