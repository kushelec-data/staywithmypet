"use client";

import { useLanguage } from "@/context/LanguageContext";

type BrowserTranslationNoticeProps = {
  className?: string;
};

/** Static hint to use the browser's built-in translate feature — no APIs or profile fields. */
export function BrowserTranslationNotice({ className = "" }: BrowserTranslationNoticeProps) {
  const { t } = useLanguage();

  return (
    <p
      className={`rounded-xl border border-brand-teal/15 bg-cream/90 px-3.5 py-2 text-xs leading-relaxed text-muted sm:text-sm ${className}`}
      role="note"
    >
      {t.browserTranslationNotice.message}
    </p>
  );
}
