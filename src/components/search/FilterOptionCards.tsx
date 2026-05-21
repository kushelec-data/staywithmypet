"use client";

import { CheckIcon } from "@/components/search/filter-icons";
import type { ReactNode } from "react";

export type FilterOptionCardItem = {
  value: string;
  label: string;
  description?: string;
  icon: ReactNode;
};

type FilterOptionCardsProps = {
  options: readonly FilterOptionCardItem[];
  value: string;
  onChange: (value: string) => void;
  allowEmpty?: boolean;
  ariaLabelledBy?: string;
};

export function FilterOptionCards({
  options,
  value,
  onChange,
  allowEmpty = true,
  ariaLabelledBy,
}: FilterOptionCardsProps) {
  return (
    <div role="radiogroup" aria-labelledby={ariaLabelledBy} className="grid gap-2">
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value || "__any__"}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => {
              if (allowEmpty && selected) onChange("");
              else onChange(opt.value);
            }}
            className={`flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal ${
              selected
                ? "border-brand-teal bg-mint/50 shadow-sm ring-1 ring-brand-teal/20 dark:bg-mint/20"
                : "border-border bg-surface hover:border-brand-teal/30 hover:bg-mint/25"
            }`}
          >
            <span
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                selected ? "bg-brand-teal text-white" : "bg-mint/50 text-brand-teal"
              }`}
              aria-hidden
            >
              {opt.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{opt.label}</span>
                {selected ? (
                  <CheckIcon className="h-3.5 w-3.5 shrink-0 text-brand-teal" />
                ) : null}
              </span>
              {opt.description ? (
                <span className="mt-0.5 block text-xs text-muted">{opt.description}</span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
