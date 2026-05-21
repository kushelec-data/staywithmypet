"use client";

import { useLanguage } from "@/context/LanguageContext";

export type ActiveFilterChip = {
  id: string;
  label: string;
  onRemove: () => void;
};

type ActiveFilterChipsProps = {
  chips: ActiveFilterChip[];
  onClearAll?: () => void;
};

export function ActiveFilterChips({ chips, onClearAll }: ActiveFilterChipsProps) {
  const { t } = useLanguage();
  const f = t.searchFilters;

  if (!chips.length) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-surface/80 px-3 py-2"
      aria-label={f.activeFilters}
    >
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={chip.onRemove}
          className="inline-flex items-center gap-1 rounded-full border border-brand-teal/25 bg-mint/40 px-2.5 py-1 text-xs font-semibold text-brand-teal transition-colors hover:bg-mint/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-teal dark:bg-mint/20"
        >
          <span>{chip.label}</span>
          <span aria-hidden className="text-brand-pink">
            ×
          </span>
          <span className="sr-only">{f.removeFilter}</span>
        </button>
      ))}
      {onClearAll ? (
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs font-medium text-muted underline-offset-2 hover:text-brand-teal hover:underline"
        >
          {f.clearAll}
        </button>
      ) : null}
    </div>
  );
}
