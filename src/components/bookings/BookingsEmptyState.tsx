"use client";

import { AccountEmptyState } from "@/components/account/AccountEmptyState";
import { useLanguage } from "@/context/LanguageContext";
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
    <AccountEmptyState
      icon="📅"
      title={b.emptyTitle}
      description={message}
      actions={[{ href: "/requests", label: b.viewRequests }]}
    />
  );
}
