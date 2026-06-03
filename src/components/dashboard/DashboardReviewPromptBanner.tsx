"use client";

import { BookingReviewAction } from "@/components/reviews/BookingReviewAction";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { notifyDashboardRefresh } from "@/lib/dashboard-refresh";
import type { Booking } from "@/lib/bookings";
import { DASHBOARD_CALLOUT_CLASS } from "@/lib/dashboard-theme";
import { useProfile } from "@/context/ProfileContext";

type DashboardReviewPromptBannerProps = {
  booking: Booking;
  onReviewDone: () => void;
};

export function DashboardReviewPromptBanner({
  booking,
  onReviewDone,
}: DashboardReviewPromptBannerProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { refreshProfile } = useProfile();
  const copy = t.dashboardHome;

  if (!user) return null;

  function handleSubmitted() {
    void refreshProfile({ background: true });
    notifyDashboardRefresh();
    onReviewDone();
  }

  return (
    <div
      className={`${DASHBOARD_CALLOUT_CLASS} flex min-w-0 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5`}
      role="region"
      aria-label={copy.reviewPromptTitle}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{copy.reviewPromptTitle}</p>
        <p className="mt-1 text-sm text-muted">{copy.reviewPromptBody}</p>
        <p className="mt-1 truncate text-xs text-muted">
          {booking.petName} · {booking.dateLabel}
        </p>
      </div>
      <div className="w-full shrink-0 sm:w-auto">
        <BookingReviewAction
          booking={booking}
          userId={user.id}
          onSubmitted={handleSubmitted}
        />
      </div>
    </div>
  );
}
