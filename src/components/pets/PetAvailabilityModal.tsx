"use client";

import { BookingCalendar } from "@/components/calendar/BookingCalendar";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import type { MonthCursor } from "@/lib/booking-calendar";
import { normalizeAvailabilityDates } from "@/lib/pet-availability";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type SyntheticEvent,
} from "react";
import { createPortal } from "react-dom";

type PetAvailabilityModalProps = {
  open: boolean;
  /** Display name for calendar heading */
  name: string;
  petId?: string | null;
  petFriendId?: string | null;
  dates: string[];
  onClose: () => void;
  title?: string;
  subtitle?: string;
  variant?: "default" | "pastel";
  visibility?: "full" | "public";
  monthCursor?: MonthCursor;
  onMonthCursorChange?: (cursor: MonthCursor) => void;
};

export function PetAvailabilityModal({
  open,
  name,
  petId,
  petFriendId,
  dates,
  onClose,
  title,
  subtitle,
  variant = "default",
  visibility = "public",
  monthCursor,
  onMonthCursorChange,
}: PetAvailabilityModalProps) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  const heading =
    title ??
    t.bookingCalendar.availabilityCalendarTitle;
  const description =
    subtitle ?? "Dates when care is available.";

  const dialogRef = useRef<HTMLDialogElement>(null);
  const pathnameWhenOpenedRef = useRef<string | null>(null);
  const wasOpenRef = useRef(false);
  const bodyScrollLockedRef = useRef(false);
  const prevBodyOverflowRef = useRef<string>("");
  const available = useMemo(() => normalizeAvailabilityDates(dates), [dates]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      pathnameWhenOpenedRef.current = pathname;
    }
    if (!open) {
      pathnameWhenOpenedRef.current = null;
    }
    wasOpenRef.current = open;
  }, [open, pathname]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.show();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!mounted || !open) return;
    if (bodyScrollLockedRef.current) return;
    prevBodyOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    bodyScrollLockedRef.current = true;
    return () => {
      if (!bodyScrollLockedRef.current) return;
      document.body.style.overflow = prevBodyOverflowRef.current;
      bodyScrollLockedRef.current = false;
    };
  }, [mounted, open]);

  useEffect(() => {
    return () => {
      const dialog = dialogRef.current;
      if (dialog?.open) dialog.close();
      if (bodyScrollLockedRef.current) {
        document.body.style.overflow = prevBodyOverflowRef.current;
        bodyScrollLockedRef.current = false;
      }
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    if (
      pathnameWhenOpenedRef.current !== null &&
      pathname !== pathnameWhenOpenedRef.current
    ) {
      onClose();
    }
  }, [pathname, open, onClose]);

  function handleDialogCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    onClose();
  }

  if (!mounted || !open) return null;

  const modal = (
    <>
      <dialog
        ref={dialogRef}
        aria-modal="true"
        onClose={onClose}
        onCancel={handleDialogCancel}
        className="fixed inset-0 z-[100] m-0 flex h-[100dvh] w-full max-w-none items-center justify-center border-0 bg-transparent p-0 open:flex [&:not([open])]:hidden"
      >
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          className="fixed inset-0 cursor-default bg-foreground/40"
          onClick={onClose}
        />
        <div
          role="document"
          className="relative z-10 mx-auto w-[min(calc(100%-2rem),720px)] max-h-[90vh] overflow-y-auto rounded-3xl border border-border bg-cream p-0 text-foreground shadow-xl dark:bg-surface sm:w-[min(calc(100%-3rem),720px)]"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-heading text-lg font-semibold">{heading}</h2>
                <p className="mt-1 text-sm text-muted">{description}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full px-2 py-1 text-sm text-muted hover:bg-mint/50 hover:text-foreground"
                aria-label={t.bookingCalendar.close}
              >
                ✕
              </button>
            </div>

            <div className="mt-6">
              {available.length > 0 || petId || petFriendId ? (
                <BookingCalendar
                  mode="availability-readonly"
                  visibility={visibility}
                  viewRole="public"
                  availableDates={available}
                  selectedDates={[]}
                  petId={petId}
                  petFriendId={petFriendId}
                  showLegend
                  showSelectedChips={false}
                  variant={variant}
                  className="rounded-2xl"
                  monthCursor={monthCursor}
                  onMonthCursorChange={onMonthCursorChange}
                />
              ) : (
                <p className="rounded-2xl bg-mint/30 px-4 py-6 text-center text-sm text-muted">
                  {t.findCare.noUpcomingDates}
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <Button type="button" size="sm" onClick={onClose}>
                {t.bookingCalendar.close}
              </Button>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );

  return createPortal(modal, document.body);
}
