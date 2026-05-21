"use client";

import { CheckIcon } from "@/components/search/filter-icons";
import { useLanguage } from "@/context/LanguageContext";
import { useMemo, useState, type ReactNode } from "react";

export type FilterChipOption = {
  value: string;
  label: string;
  icon?: ReactNode;
};

type FilterChipGroupProps = {
  options: readonly FilterChipOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  /** Max chips before "Show more" (default 6) */
  maxVisible?: number;
  ariaLabelledBy?: string;
  multi?: boolean;
};

export function FilterChipGroup({
  options,
  selected,
  onChange,
  maxVisible = 6,
  ariaLabelledBy,
  multi = true,
}: FilterChipGroupProps) {
  const { t } = useLanguage();
  const f = t.searchFilters;
  const [expanded, setExpanded] = useState(false);

  const visibleOptions = useMemo(() => {
    if (expanded || options.length <= maxVisible) return options;
    const selectedSet = new Set(selected);
    const selectedOpts = options.filter((o) => selectedSet.has(o.value));
    const rest = options.filter((o) => !selectedSet.has(o.value));
    const merged = [...selectedOpts, ...rest];
    return merged.slice(0, maxVisible);
  }, [expanded, maxVisible, options, selected]);

  const hiddenCount = options.length - visibleOptions.length;

  function toggle(value: string) {
    const checked = selected.includes(value);
    if (!multi) {
      onChange(checked ? [] : [value]);
      return;
    }
    if (checked) onChange(selected.filter((v) => v !== value));
    else onChange([...selected, value]);
  }

  return (
    <div>
      <div
        role="group"
        aria-labelledby={ariaLabelledBy}
        className="flex flex-wrap gap-2"
      >
        {visibleOptions.map((opt) => {
          const checked = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={checked}
              onClick={() => toggle(opt.value)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal ${
                checked
                  ? "border-brand-teal bg-brand-teal text-white shadow-sm"
                  : "border-border bg-surface text-foreground hover:border-brand-teal/40 hover:bg-mint/40 dark:border-border"
              }`}
            >
              {opt.icon ? (
                <span className={checked ? "text-white/90" : "text-brand-teal"} aria-hidden>
                  {opt.icon}
                </span>
              ) : null}
              <span>{opt.label}</span>
              {checked ? (
                <CheckIcon className="h-3.5 w-3.5 shrink-0 text-white" />
              ) : null}
            </button>
          );
        })}
      </div>
      {hiddenCount > 0 ? (
        <button
          type="button"
          className="mt-2 text-xs font-semibold text-brand-teal hover:underline"
          onClick={() => setExpanded(true)}
        >
          {f.showMore.replace("{count}", String(hiddenCount))}
        </button>
      ) : expanded && options.length > maxVisible ? (
        <button
          type="button"
          className="mt-2 text-xs font-semibold text-muted hover:underline"
          onClick={() => setExpanded(false)}
        >
          {f.showLess}
        </button>
      ) : null}
    </div>
  );
}
