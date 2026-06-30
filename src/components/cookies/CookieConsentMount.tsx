"use client";

import dynamic from "next/dynamic";

const CookieConsentManager = dynamic(
  () =>
    import("@/components/cookies/CookieConsentManager").then((mod) => ({
      default: mod.CookieConsentManager,
    })),
  { ssr: false },
);

export function CookieConsentMount() {
  return <CookieConsentManager />;
}
