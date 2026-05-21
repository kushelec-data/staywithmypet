"use client";

import { useLanguage } from "@/context/LanguageContext";
import type { Locale } from "@/i18n/translations";

const options: { id: Locale; label: string }[] = [
  { id: "en", label: "EN" },
  { id: "et", label: "ET" },
];

type LanguageSwitcherProps = {
  className?: string;
};

export function LanguageSwitcher({ className = "" }: LanguageSwitcherProps) {
  const { locale, setLocale } = useLanguage();

  return (
    <div
      role="group"
      aria-label="Language"
      className={`inline-flex shrink-0 rounded-full bg-mint/45 p-0.5 shadow-sm ring-1 ring-border ${className}`}
    >
      {options.map((opt) => {
        const selected = locale === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setLocale(opt.id)}
            aria-pressed={selected}
            className={`min-w-[2.25rem] rounded-full px-2.5 py-1 text-xs font-semibold transition-all duration-200 sm:min-w-[2.5rem] sm:px-3 sm:py-1.5 ${
              selected
                ? "bg-brand-teal text-white shadow-sm shadow-brand-teal/20"
                : "text-muted hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
