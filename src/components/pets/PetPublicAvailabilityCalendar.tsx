"use client";

import { BookingCalendar } from "@/components/calendar/BookingCalendar";
import type { MonthCursor } from "@/lib/booking-calendar";
import { normalizeAvailabilityDates } from "@/lib/pet-availability";
import { useMemo } from "react";

type PetPublicAvailabilityCalendarProps = {
  petId?: string;
  petFriendId?: string;
  availableDates: string[];
  availabilityNotes?: string | null;
  /** Owner preview sees full booking details. */
  visibility?: "full" | "public";
  viewRole?: "pet-parent" | "pet-friend" | "public";
  /** Smaller grid for compact sidebar cards. */
  compact?: boolean;
  /** Soft mint/grey palette for public profile surfaces. */
  variant?: "default" | "pastel";
  monthCursor?: MonthCursor;
  onMonthCursorChange?: (cursor: MonthCursor) => void;
  /** When set, dates toggle select/unselect only (no modal, navigation, or toast). */
  selectedDates?: string[];
  onSelectedDatesChange?: (dates: string[]) => void;
};

export function PetPublicAvailabilityCalendar({
  petId,
  petFriendId,
  availableDates,
  availabilityNotes,
  visibility = "public",
  viewRole,
  compact = false,
  variant = "default",
  monthCursor,
  onMonthCursorChange,
  selectedDates = [],
  onSelectedDatesChange,
}: PetPublicAvailabilityCalendarProps) {
  const available = useMemo(() => normalizeAvailabilityDates(availableDates), [availableDates]);
  const selectable = Boolean(onSelectedDatesChange);

  if (!available.length && visibility === "public" && !petId && !petFriendId) {
    return (
      <p
        className={
          variant === "pastel"
            ? "rounded-xl border border-dashed border-black/10 bg-cream/40 px-3 py-3 text-sm text-muted"
            : "rounded-xl border border-dashed border-black/10 bg-cream/40 px-3 py-4 text-sm text-muted"
        }
      >
        {availabilityNotes?.trim() ||
          "No available dates are listed yet. Send a care request to ask about scheduling."}
      </p>
    );
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {availabilityNotes?.trim() ? (
        <p
          className={
            variant === "pastel"
              ? "text-xs leading-relaxed text-muted"
              : "text-sm text-muted"
          }
        >
          {availabilityNotes.trim()}
        </p>
      ) : null}
      <BookingCalendar
        mode={selectable ? "request-select" : "availability-readonly"}
        visibility={visibility}
        viewRole={
          viewRole ??
          (visibility === "full" ? (petId ? "pet-parent" : "pet-friend") : "public")
        }
        availableDates={available}
        selectedDates={selectable ? selectedDates : []}
        onChange={onSelectedDatesChange}
        petId={petId}
        petFriendId={petFriendId}
        showLegend
        showSelectedChips={selectable}
        compact={compact}
        variant={variant}
        monthCursor={monthCursor}
        onMonthCursorChange={onMonthCursorChange}
      />
    </div>
  );
}
