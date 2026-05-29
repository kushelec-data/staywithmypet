"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import { BookingCompleteAction } from "@/components/bookings/BookingCompleteAction";
import { BookingReviewAction } from "@/components/reviews/BookingReviewAction";
import { SubmittedReviewCard } from "@/components/reviews/SubmittedReviewCard";
import {
  bookingDetailsHref,
  bookingStatusBadgeClasses,
  bookingStatusLabel,
  messagesHrefForBooking,
  type Booking,
  type BookingTab,
} from "@/lib/bookings";
import type { ReviewDisplay } from "@/lib/reviews";
import { ACCOUNT_CARD_CLASS } from "@/lib/account-ui";

type BookingListItemProps = {
  booking: Booking;
  tab: BookingTab;
  acting: boolean;
  userId: string;
  myReview: ReviewDisplay | null;
  onReviewSubmitted: () => void;
  onCompleted?: () => void;
  onCancel?: (id: string) => void;
};

function CalendarIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-brand-teal/80" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 3v4M16 3v4M3 10h18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function PetIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-brand-teal/80" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM16 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM5.5 14.5c1.2-2 3.3-3 6.5-3s5.3 1 6.5 3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 18c1.5-1 3.5-1.5 8-1.5s6.5.5 8 1.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-muted" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M5 19c1.5-2.5 4-4 7-4s5.5 1.5 7 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CareIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-brand-teal/80" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v4M8 7h8M6 11h12v10H6V11Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MetaRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function BookingListItem({
  booking,
  tab,
  acting,
  userId,
  myReview,
  onReviewSubmitted,
  onCompleted,
  onCancel,
}: BookingListItemProps) {
  const { t } = useLanguage();
  const b = t.bookings;
  const showCancel = tab === "upcoming" || tab === "active";

  return (
    <li>
      <article className={`${ACCOUNT_CARD_CLASS} overflow-hidden transition-shadow hover:shadow-[0_2px_8px_rgba(46,107,63,0.08)]`}>
        <div className="flex flex-col gap-4 p-5 sm:gap-5 sm:p-6">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-heading text-lg font-bold leading-snug text-foreground">
                {b.careForPet.replace("{name}", booking.petName)}
              </h3>
              <p className="mt-1 text-xs text-muted">
                {b.bookedOn} {booking.createdAtLabel}
              </p>
            </div>
            <span className={bookingStatusBadgeClasses(booking.displayStatus)}>
              {bookingStatusLabel(booking.displayStatus)}
            </span>
          </header>

          <div className="grid gap-3 border-t border-[#E5E2D8] pt-4 sm:grid-cols-2 sm:gap-x-6">
            <MetaRow icon={<PetIcon />} label={b.petLabel} value={booking.petName} />
            <MetaRow icon={<UserIcon />} label={b.withLabel} value={booking.otherPartyName} />
            <MetaRow icon={<CalendarIcon />} label={b.datesLabel} value={booking.dateLabel} />
            {booking.careType ? (
              <MetaRow icon={<CareIcon />} label={b.careTypeLabel} value={booking.careType} />
            ) : null}
            {tab === "completed" && booking.completedAtLabel ? (
              <MetaRow icon={<CalendarIcon />} label={b.completedOn} value={booking.completedAtLabel} />
            ) : null}
            {tab === "cancelled" && booking.cancelledAtLabel ? (
              <MetaRow icon={<CalendarIcon />} label={b.cancelledOn} value={booking.cancelledAtLabel} />
            ) : null}
          </div>

          {tab === "cancelled" && booking.cancelledReason ? (
            <p className="rounded-xl bg-cream/60 px-3.5 py-3 text-sm text-foreground/85 ring-1 ring-black/[0.04]">
              <span className="font-semibold text-muted">{b.cancelledReasonLabel}: </span>
              {booking.cancelledReason}
            </p>
          ) : null}

          <div className="flex flex-col gap-2 border-t border-[#E5E2D8] pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <Link href={bookingDetailsHref(booking.id)} className="w-full sm:w-auto">
              <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto">
                {b.viewDetails}
              </Button>
            </Link>
            <Link href={messagesHrefForBooking(booking.requestId)} className="w-full sm:w-auto">
              <Button type="button" variant="soft" size="sm" className="w-full sm:w-auto">
                {b.openChat}
              </Button>
            </Link>
            {tab === "active" && onCompleted ? (
              <BookingCompleteAction
                booking={booking}
                disabled={acting}
                onCompleted={onCompleted}
              />
            ) : null}
            {tab === "completed" ? (
              myReview ? (
                <div className="w-full sm:max-w-md">
                  <SubmittedReviewCard review={myReview} compact />
                </div>
              ) : (
                <BookingReviewAction
                  booking={booking}
                  userId={userId}
                  onSubmitted={onReviewSubmitted}
                />
              )
            ) : null}
            {showCancel && onCancel ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={acting}
                className="w-full text-brand-pink sm:w-auto"
                onClick={() => onCancel(booking.id)}
              >
                {b.cancelBooking}
              </Button>
            ) : null}
          </div>
        </div>
      </article>
    </li>
  );
}
