"use client";

import { CookieConsentBanner } from "@/components/cookies/CookieConsentBanner";
import { CookiePreferencesDialog } from "@/components/cookies/CookiePreferencesDialog";

export function CookieConsentManager() {
  return (
    <>
      <CookieConsentBanner />
      <CookiePreferencesDialog />
    </>
  );
}
