"use client";

import {
  COOKIE_CONSENT_CHANGE_EVENT,
  readCookieConsent,
} from "@/lib/cookie-consent";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Analytics = dynamic(
  () => import("@vercel/analytics/next").then((mod) => ({ default: mod.Analytics })),
  { ssr: false },
);

/** Body-level analytics gate — reads consent in useEffect only; never wraps the app. */
export function ConsentAwareAnalytics() {
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  useEffect(() => {
    const sync = () => {
      const consent = readCookieConsent();
      setAnalyticsEnabled(consent?.analytics === true);
    };

    sync();
    window.addEventListener(COOKIE_CONSENT_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(COOKIE_CONSENT_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!analyticsEnabled) return null;

  return <Analytics />;
}
