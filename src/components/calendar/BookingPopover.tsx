"use client";

import { BookingTermsNotice } from "@/components/legal/BookingTermsNotice";
import { AppImage } from "@/components/ui/AppImage";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import {
  formatBookingDateRange,
  type CalendarBooking,
  type CalendarViewRole,
} from "@/lib/booking-calendar";
import { bookingDetailsHref, bookingStatusBadgeClasses, resolveBookingDisplayStatus } from "@/lib/bookings";
import { useEffect, useRef } from "react";

type BookingPopoverProps = {
  booking: CalendarBooking;
  viewRole: CalendarViewRole;
  open: boolean;
  onClose: () => void;
  /** Desktop anchored popover; mobile uses bottom sheet. */
  variant: "popover" | "sheet";
  anchorRef?: React.RefObject<HTMLElement | null>;
};

export function BookingPopover({
  booking,
  viewRole,
  open,
  onClose,
  variant,
  anchorRef,
}: BookingPopoverProps) {
  const { t, locale } = useLanguage();
  const panelRef = useRef<HTMLDivElement>(null);
  const displayStatus = resolveBookingDisplayStatus({
    status: booking.status,
    start_date: booking.startDate,
    end_date: booking.endDate,
    requested_dates: booking.requestedDates,
  });

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || variant !== "popover") return;
    function onPointer(e: PointerEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef?.current?.contains(target)) return;
      onClose();
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open, variant, onClose, anchorRef]);

  if (!open || viewRole === "public") return null;

  const dateLabel = formatBookingDateRange(
    booking.startDate,
    booking.endDate,
    locale,
    booking.requestedDates,
  );
  const statusLabel =
    displayStatus === "upcoming"
      ? t.bookingCalendar.statusUpcoming
      : displayStatus === "active"
        ? t.bookingCalendar.statusActive
        : displayStatus === "completed"
          ? t.bookingCalendar.statusCompleted
          : t.bookingCalendar.statusCancelled;

  const content = (
    <div ref={panelRef} className="space-y-3 p-4">
      <div className="flex items-start gap-3">
        <BookingAvatar booking={booking} viewRole={viewRole} />
        <div className="min-w-0 flex-1">
          <p className="font-heading text-sm font-semibold text-foreground">
            {viewRole === "pet-friend" ? booking.petName : booking.friendName}
          </p>
          {viewRole === "involved" ? (
            <p className="mt-0.5 text-xs text-muted">
              {t.bookingCalendar.petLabel}: {booking.petName} · {t.bookingCalendar.parentLabel}:{" "}
              {booking.parentName}
            </p>
          ) : viewRole === "pet-parent" ? (
            <p className="mt-0.5 text-xs text-muted">{booking.friendName}</p>
          ) : (
            <p className="mt-0.5 text-xs text-muted">
              {t.bookingCalendar.parentLabel}: {booking.parentName}
            </p>
          )}
          <span className={`mt-2 ${bookingStatusBadgeClasses(displayStatus)}`}>{statusLabel}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-2 py-0.5 text-sm text-muted hover:bg-black/5"
          aria-label={t.bookingCalendar.close}
        >
          ✕
        </button>
      </div>

      <dl className="grid gap-1.5 text-xs">
        <div>
          <dt className="font-semibold uppercase tracking-wide text-muted">{t.bookingCalendar.dates}</dt>
          <dd className="break-words text-foreground">{dateLabel}</dd>
        </div>
        {booking.careType ? (
          <div>
            <dt className="font-semibold uppercase tracking-wide text-muted">
              {t.bookingCalendar.careType}
            </dt>
            <dd className="text-foreground">{booking.careType}</dd>
          </div>
        ) : null}
      </dl>

      <BookingTermsNotice />

      <Button href={bookingDetailsHref(booking.id)} size="sm" className="w-full">
        {t.bookingCalendar.viewBooking}
      </Button>
    </div>
  );

  if (variant === "sheet") {
    return (
      <>
        <button
          type="button"
          className="fixed inset-0 z-40 bg-foreground/30"
          aria-label={t.bookingCalendar.close}
          onClick={onClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-3xl border border-black/10 bg-surface shadow-2xl"
        >
          {content}
        </div>
      </>
    );
  }

  return (
    <div
      role="dialog"
      className="absolute left-1/2 top-full z-30 mt-1 w-[min(16rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-black/10 bg-surface shadow-xl"
    >
      {content}
    </div>
  );
}

function BookingAvatar({
  booking,
  viewRole,
}: {
  booking: CalendarBooking;
  viewRole: CalendarViewRole;
}) {
  const photo =
    viewRole === "pet-friend"
      ? booking.petPhotoUrl
      : viewRole === "pet-parent"
        ? booking.friendPhotoUrl
        : booking.friendPhotoUrl;
  const name =
    viewRole === "pet-friend"
      ? booking.petName
      : viewRole === "pet-parent"
        ? booking.friendName
        : booking.friendName;

  return (
    <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-2 ring-brand-teal/20">
      {photo ? (
        <AppImage src={photo} alt={name} seed={booking.id} sizes="48px" className="object-cover" />
      ) : (
        <span
          className={`flex h-full w-full items-center justify-center text-lg font-bold ${booking.color.bg} ${booking.color.text}`}
        >
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
}
