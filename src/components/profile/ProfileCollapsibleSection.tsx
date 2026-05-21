"use client";

import { useId, useState, type ReactNode } from "react";

type ProfileCollapsibleSectionProps = {
  id: string;
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function ProfileCollapsibleSection({
  id,
  title,
  description,
  defaultOpen = false,
  children,
}: ProfileCollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-2xl border border-black/5 bg-surface/80 overflow-hidden"
    >
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left sm:px-5 sm:py-5"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="min-w-0">
          <span className="font-heading text-base font-semibold text-foreground">{title}</span>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        </span>
        <span
          className={`mt-0.5 shrink-0 text-lg text-muted transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          ▾
        </span>
      </button>
      {open ? (
        <div id={panelId} className="border-t border-black/5 px-4 pb-5 pt-1 sm:px-5 sm:pb-6">
          <div className="grid gap-5 sm:grid-cols-2">{children}</div>
        </div>
      ) : null}
    </section>
  );
}
