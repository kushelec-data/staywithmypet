"use client";

import { useCookieConsent } from "@/context/CookieConsentContext";
import { Analytics } from "@vercel/analytics/next";

/** Loads Vercel Analytics only after the user opts in to analytics cookies. */
export function ConsentAwareAnalytics() {
  const { consent } = useCookieConsent();

  if (!consent?.analytics) return null;

  return <Analytics />;
}
