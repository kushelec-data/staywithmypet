"use client";

import { BookingReviewAction } from "@/components/reviews/BookingReviewAction";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { notifyDashboardRefresh } from "@/lib/dashboard-refresh";
import { formatBookingDatesForRow } from "@/lib/date-format";
import type { Booking } from "@/lib/bookings";
import { DASHBOARD_CALLOUT_CLASS } from "@/lib/dashboard-theme";
import { fetchMyReviewForBooking } from "@/lib/reviews";
import { createClient } from "@/lib/supabase";
import { useProfile } from "@/context/ProfileContext";
import { useEffect, useMemo, useState } from "react";

type DashboardReviewPromptBannerProps = {
  booking: Booking;
  onReviewDone: () => void;
};

export function DashboardReviewPromptBanner({
  booking,
  onReviewDone,
}: DashboardReviewPromptBannerProps) {
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const { refreshProfile } = useProfile();
  const supabase = useMemo(() => createClient(), []);
  const [checkingReview, setCheckingReview] = useState(true);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const copy = t.dashboardHome;
  const dateLabel = formatBookingDatesForRow(
    {
      requested_dates: booking.requestedDates,
      date_from: booking.startDate,
      date_to: booking.endDate,
    },
    { locale },
  );

  useEffect(() => {
    if (!user?.id) {
      setCheckingReview(false);
      setAlreadyReviewed(false);
      return;
    }

    let cancelled = false;
    setCheckingReview(true);
    void fetchMyReviewForBooking(supabase, user.id, booking.id)
      .then((review) => {
        if (!cancelled) setAlreadyReviewed(Boolean(review));
      })
      .catch(() => {
        if (!cancelled) setAlreadyReviewed(false);
      })
      .finally(() => {
        if (!cancelled) setCheckingReview(false);
      });

    return () => {
      cancelled = true;
    };
  }, [supabase, user?.id, booking.id]);

  if (!user || checkingReview || alreadyReviewed) return null;

  function handleSubmitted() {
    setAlreadyReviewed(true);
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
          {booking.petName} · {dateLabel}
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
