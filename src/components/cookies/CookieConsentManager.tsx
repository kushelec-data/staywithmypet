"use client";

import { CookieConsentBanner } from "@/components/cookies/CookieConsentBanner";
import { CookiePreferencesDialog } from "@/components/cookies/CookiePreferencesDialog";
import { CookieConsentProvider } from "@/context/CookieConsentContext";

/** Cookie UI island — provider scopes banner/dialog only, not the app shell. */
export function CookieConsentManager() {
  return (
    <CookieConsentProvider>
      <CookieConsentBanner />
      <CookiePreferencesDialog />
    </CookieConsentProvider>
  );
}
