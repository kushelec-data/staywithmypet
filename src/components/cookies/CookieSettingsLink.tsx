"use client";

import { requestOpenCookiePreferences } from "@/lib/cookie-consent";
import { useLanguage } from "@/context/LanguageContext";

export function CookieSettingsLink() {
  const { t } = useLanguage();

  return (
    <button
      type="button"
      onClick={requestOpenCookiePreferences}
      className="legal-footer-link inline-flex rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted transition-colors sm:px-3.5 sm:text-sm"
    >
      {t.cookieConsent.settingsLink}
    </button>
  );
}
