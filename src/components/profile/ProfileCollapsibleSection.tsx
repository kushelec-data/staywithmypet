"use client";

import { useId, useState, type ReactNode } from "react";

type ProfileCollapsibleSectionProps = {
  id: string;
  title: string;
  description?: string;
  optionalLabel?: string;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
};

export function ProfileCollapsibleSection({
  id,
  title,
  description,
  optionalLabel,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  children,
}: ProfileCollapsibleSectionProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;
  const panelId = useId();

  function setOpen(next: boolean) {
    if (controlledOpen === undefined) {
      setUncontrolledOpen(next);
    }
    onOpenChange?.(next);
  }

  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-2xl border border-black/5 bg-surface/80 overflow-hidden"
    >
      <button
        type="button"
        className="profile-collapsible-toggle flex w-full cursor-pointer items-start justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-black/[0.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E6B3F] sm:px-5 sm:py-5 pointer-events-auto"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-heading text-base font-semibold text-foreground">{title}</span>
            {optionalLabel ? (
              <span className="rounded-full bg-black/[0.04] px-2 py-0.5 text-xs font-medium text-muted">
                {optionalLabel}
              </span>
            ) : null}
          </span>
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
          <div className="grid min-w-0 gap-5 sm:grid-cols-2">{children}</div>
        </div>
      ) : null}
    </section>
  );
}
