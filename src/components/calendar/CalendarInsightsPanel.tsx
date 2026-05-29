"use client";

import Link from "next/link";
import { AccountCard } from "@/components/account/AccountCard";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import {
  bookedDaysCountInMonth,
  nextAvailableDate,
  upcomingBookingsForInsights,
} from "@/lib/calendar-insights";
import type { CalendarBooking, MonthCursor } from "@/lib/booking-calendar";
import { formatDate } from "@/lib/date-format";
import { formatDateRange } from "@/lib/date-format";

type CalendarInsightsPanelProps = {
  availabilityDates: string[];
  bookings: CalendarBooking[];
  blockingBookedDateSet: Set<string>;
  monthCursor: MonthCursor;
  loading?: boolean;
  editHref: string;
  editLabel: string;
  className?: string;
};

export function CalendarInsightsPanel({
  availabilityDates,
  bookings,
  blockingBookedDateSet,
  monthCursor,
  loading = false,
  editHref,
  editLabel,
  className = "",
}: CalendarInsightsPanelProps) {
  const { t, locale } = useLanguage();
  const copy = t.dashboardCalendar;
  const bc = t.bookingCalendar;

  const nextAvailable = nextAvailableDate(availabilityDates, blockingBookedDateSet);
  const upcoming = upcomingBookingsForInsights(bookings);
  const bookedCount = bookedDaysCountInMonth(bookings, monthCursor.year, monthCursor.month);

  return (
    <AccountCard className={`flex flex-col p-5 sm:p-6 ${className}`}>
      <h2 className="font-heading text-base font-semibold text-foreground">{copy.insightsTitle}</h2>

      <dl className="mt-4 space-y-4">
        <div>
          <dt className="form-field-label">{copy.nextAvailable}</dt>
          <dd className="mt-1 text-sm font-medium text-foreground">
            {loading ? copy.loadingSummary : nextAvailable ? formatDate(nextAvailable, locale) : copy.noNextAvailable}
          </dd>
        </div>

        <div>
          <dt className="form-field-label">{copy.bookedDaysCount}</dt>
          <dd className="mt-1 text-sm font-medium text-foreground">
            {loading ? "…" : bookedCount}
          </dd>
        </div>
      </dl>

      <div className="mt-5 border-t border-[#E5E2D8] pt-4">
        <h3 className="form-field-label">{copy.upcomingBookings}</h3>
        {loading ? (
          <p className="mt-2 text-sm text-muted">{copy.loadingSummary}</p>
        ) : upcoming.length === 0 ? (
          <p className="mt-2 text-sm text-muted">{copy.noUpcomingBookings}</p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {upcoming.map((booking) => (
              <li
                key={booking.id}
                className="rounded-xl border border-[#E5E2D8] bg-[#F8F6F1] px-3 py-2.5"
              >
                <p className="text-sm font-medium text-foreground">
                  {formatDateRange(booking.startDate, booking.endDate, locale)}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {booking.petName}
                  {booking.careType ? ` · ${booking.careType}` : ""}
                </p>
                <Link
                  href={`/dashboard/bookings/${booking.id}`}
                  className="mt-1.5 inline-block text-xs font-semibold text-[#2E6B3F] hover:opacity-80"
                >
                  {bc.viewBooking} →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Button href={editHref} variant="outline" size="sm" className="mt-5 w-full">
        {editLabel}
      </Button>
    </AccountCard>
  );
}
