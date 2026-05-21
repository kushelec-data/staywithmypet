"use client";

import { BookingCalendar } from "@/components/calendar/BookingCalendar";
import { Button } from "@/components/ui/Button";
import { useEffect, useRef } from "react";

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
}: PetAvailabilityModalProps) {
  const heading = title ?? `${name}'s calendar`;
  const description = subtitle ?? "Dates when care is available.";
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="w-[min(100%,28rem)] max-h-[90vh] overflow-y-auto rounded-3xl border border-border bg-cream p-0 text-foreground shadow-xl backdrop:bg-foreground/40 dark:bg-surface"
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
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-6">
          {dates.length > 0 ? (
            <BookingCalendar
              mode="availability-readonly"
              visibility="public"
              viewRole="public"
              availableDates={dates}
              selectedDates={dates}
              petId={petId}
              petFriendId={petFriendId}
              showLegend
              showSelectedChips={false}
              className="rounded-2xl"
            />
          ) : (
            <p className="rounded-2xl bg-mint/30 px-4 py-6 text-center text-sm text-muted">
              No upcoming dates listed yet.
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="button" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </dialog>
  );
}
