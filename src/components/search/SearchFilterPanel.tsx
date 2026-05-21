"use client";

import { useLanguage } from "@/context/LanguageContext";
import { useState, type ReactNode } from "react";

type SearchFilterPanelProps = {
  title: string;
  children: ReactNode;
  onSubmit: () => void;
  onClearAll: () => void;
  applyLabel?: string;
};

export function SearchFilterPanel({
  title,
  children,
  onSubmit,
  onClearAll,
  applyLabel,
}: SearchFilterPanelProps) {
  const { t } = useLanguage();
  const f = t.searchFilters;
  const [mobileOpen, setMobileOpen] = useState(false);

  const filterForm = (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
        setMobileOpen(false);
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-teal">{title}</p>
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs font-medium text-muted underline-offset-2 hover:text-brand-teal hover:underline"
        >
          {f.clearAll}
        </button>
      </div>

      {children}

      <button
        type="submit"
        className="btn-interactive w-full rounded-2xl bg-brand-teal px-6 py-3 text-sm font-semibold text-white shadow-md shadow-brand-teal/20 hover:bg-brand-teal-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal"
      >
        {applyLabel ?? t.common.applyFilters}
      </button>
    </form>
  );

  return (
    <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
      <button
        type="button"
        className="mb-3 flex w-full items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground shadow-sm lg:hidden"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((open) => !open)}
      >
        <span>{mobileOpen ? f.hideFilters : f.showFilters}</span>
        <span className="text-brand-teal" aria-hidden>
          {mobileOpen ? "−" : "+"}
        </span>
      </button>

      <div
        className={`rounded-3xl border border-border bg-cream/80 p-4 shadow-[0_4px_24px_rgba(0,0,0,0.06)] backdrop-blur-sm dark:bg-surface/90 sm:p-5 ${
          mobileOpen ? "block" : "hidden lg:block"
        }`}
      >
        {filterForm}
      </div>
    </div>
  );
}

export function FilterSection({
  title,
  children,
  id,
}: {
  title: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <fieldset className="border-b border-border/60 pb-4 last:border-0 last:pb-0">
      <legend
        id={id}
        className="mb-2.5 block text-sm font-semibold text-foreground"
      >
        {title}
      </legend>
      {children}
    </fieldset>
  );
}
