"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { ACCOUNT_EMPTY_STATE_TITLE } from "@/lib/account-ui";
import type { BookingTab } from "@/lib/bookings";

type BookingsEmptyStateProps = {
  tab: BookingTab;
};

export function BookingsEmptyState({ tab }: BookingsEmptyStateProps) {
  const { t } = useLanguage();
  const b = t.bookings;

  const message =
    tab === "upcoming"
      ? b.emptyUpcoming
      : tab === "active"
        ? b.emptyActive
        : tab === "completed"
          ? b.emptyCompleted
          : b.emptyCancelled;

  return (
    <div className="flex flex-col items-center px-4 py-12 text-center sm:py-16">
      <div
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-mint/50 text-3xl ring-1 ring-brand-teal/15"
        aria-hidden
      >
        📅
      </div>
      <h3 className={ACCOUNT_EMPTY_STATE_TITLE}>{b.emptyTitle}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{message}</p>
      <div className="mt-8 flex w-full max-w-sm flex-col gap-2.5 sm:max-w-none sm:flex-row sm:justify-center">
        <Link
          href="/requests"
          className="btn-interactive inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-brand-teal px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-teal/20 hover:bg-brand-teal-hover sm:w-auto"
        >
          {b.viewRequests}
        </Link>
      </div>
    </div>
  );
}
