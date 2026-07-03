"use client";

import { Button } from "@/components/ui/Button";
import { useCookieConsent } from "@/context/CookieConsentContext";
import { useLanguage } from "@/context/LanguageContext";
import { useEffect, useRef } from "react";

function PreferenceToggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="rounded-2xl border border-border bg-surface/60 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1 pr-1">
          <p className="text-sm font-semibold text-foreground [overflow-wrap:anywhere]">{label}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted [overflow-wrap:anywhere]">{description}</p>
        </div>
        {disabled ? (
          <span className="shrink-0 rounded-full bg-mint/50 px-2.5 py-1 text-xs font-semibold text-brand-teal">
            {t.cookieConsent.alwaysOn}
          </span>
        ) : (
          <label className="flex shrink-0 cursor-pointer items-center pl-1">
            <span className="sr-only">{label}</span>
            <input
              type="checkbox"
              role="switch"
              checked={checked}
              onChange={(e) => onChange?.(e.target.checked)}
              className="h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full border border-border bg-muted/30 transition checked:border-brand-teal checked:bg-brand-teal focus:ring-2 focus:ring-brand-teal/30"
              style={{
                backgroundImage: checked
                  ? "radial-gradient(circle at 1.15rem 50%, white 0.45rem, transparent 0.5rem)"
                  : "radial-gradient(circle at 0.35rem 50%, white 0.45rem, transparent 0.5rem)",
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}

export function CookiePreferencesDialog() {
  const { t } = useLanguage();
  const c = t.cookieConsent;
  const {
    preferencesOpen,
    preferenceDraft,
    closePreferences,
    setPreferenceDraft,
    savePreferences,
  } = useCookieConsent();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (preferencesOpen && !dialog.open) dialog.showModal();
    if (!preferencesOpen && dialog.open) dialog.close();
  }, [preferencesOpen]);

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-[100] m-auto w-[min(100%,28rem)] max-w-[calc(100vw-24px)] overflow-hidden rounded-3xl border border-black/10 bg-surface p-0 shadow-xl backdrop:bg-black/40"
      onClose={closePreferences}
    >
      <div className="max-h-[calc(100dvh-24px)] overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
        <h2 className="font-heading text-lg font-bold text-foreground">{c.preferencesTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{c.body}</p>

        <div className="mt-5 space-y-3">
          <PreferenceToggle
            label={c.necessaryTitle}
            description={c.necessaryDescription}
            checked
            disabled
          />
          <PreferenceToggle
            label={c.analyticsTitle}
            description={c.analyticsDescription}
            checked={preferenceDraft.analytics}
            onChange={(analytics) => setPreferenceDraft({ ...preferenceDraft, analytics })}
          />
          <PreferenceToggle
            label={c.marketingTitle}
            description={c.marketingDescription}
            checked={preferenceDraft.marketing}
            onChange={(marketing) => setPreferenceDraft({ ...preferenceDraft, marketing })}
          />
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={closePreferences}>
            {t.common.cancel}
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={savePreferences}>
            {c.savePreferences}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
