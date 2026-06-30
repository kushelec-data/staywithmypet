"use client";

import { Button } from "@/components/ui/Button";
import { useCookieConsent } from "@/context/CookieConsentContext";
import { useLanguage } from "@/context/LanguageContext";

export function CookieConsentBanner() {
  const { t } = useLanguage();
  const c = t.cookieConsent;
  const { showBanner, acceptAll, rejectNonEssential, openPreferences } = useCookieConsent();

  if (!showBanner) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex justify-center px-4 pb-4 sm:px-6 sm:pb-6"
      role="region"
      aria-label={c.title}
    >
      <div className="pointer-events-auto w-full max-w-xl rounded-2xl border border-border bg-card p-4 shadow-[0_8px_32px_rgba(38,92,52,0.12)] sm:rounded-3xl sm:p-5">
        <h2 className="font-heading text-base font-semibold text-foreground sm:text-lg">{c.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{c.body}</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button type="button" size="sm" className="w-full sm:w-auto" onClick={acceptAll}>
            {c.acceptAll}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            onClick={rejectNonEssential}
          >
            {c.rejectNonEssential}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full sm:w-auto"
            onClick={openPreferences}
          >
            {c.managePreferences}
          </Button>
        </div>
      </div>
    </div>
  );
}
