"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ACCOUNT_EMPTY_STATE_TITLE } from "@/lib/account-ui";

export type AccountEmptyStateAction = {
  href: string;
  label: string;
  variant?: "primary" | "outline";
};

type AccountEmptyStateProps = {
  icon: string;
  title: string;
  description: ReactNode;
  actions?: AccountEmptyStateAction[];
  className?: string;
};

export function AccountEmptyState({
  icon,
  title,
  description,
  actions = [],
  className = "",
}: AccountEmptyStateProps) {
  return (
    <div
      className={`flex w-full min-w-0 max-w-full flex-col items-center px-4 py-12 text-center sm:py-16 ${className}`}
    >
      <div
        className="mb-5 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-mint/50 text-3xl ring-1 ring-brand-teal/15"
        aria-hidden
      >
        {icon}
      </div>
      <h3 className={ACCOUNT_EMPTY_STATE_TITLE}>{title}</h3>
      <div className="mt-2 max-w-md text-sm leading-relaxed text-muted">{description}</div>
      {actions.length > 0 ? (
        <div className="mt-8 flex w-full max-w-sm flex-col gap-2.5 sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-center">
          {actions.map((action) => (
            <Link
              key={`${action.href}-${action.label}`}
              href={action.href}
              className={
                action.variant === "outline"
                  ? "btn-interactive inline-flex min-h-[44px] w-full min-w-0 items-center justify-center rounded-full border border-brand-teal/30 bg-surface px-6 py-2.5 text-sm font-semibold text-brand-teal transition hover:bg-mint/40 sm:w-auto"
                  : "btn-interactive inline-flex min-h-[44px] w-full min-w-0 items-center justify-center rounded-full bg-brand-teal px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-teal/20 hover:bg-brand-teal-hover sm:w-auto"
              }
            >
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
