"use client";

import { BookingCalendar } from "@/components/calendar/BookingCalendar";
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
  /** Stronger borders and legend contrast for public profile surfaces. */
  highContrast?: boolean;
};

export function PetPublicAvailabilityCalendar({
  petId,
  petFriendId,
  availableDates,
  availabilityNotes,
  visibility = "public",
  viewRole,
  highContrast = false,
}: PetPublicAvailabilityCalendarProps) {
  const available = useMemo(() => normalizeAvailabilityDates(availableDates), [availableDates]);

  if (!available.length && visibility === "public" && !petId && !petFriendId) {
    return (
      <p
        className={
          highContrast
            ? "rounded-xl border-2 border-foreground/15 bg-surface px-4 py-4 text-sm font-medium text-foreground"
            : "rounded-xl border border-dashed border-black/10 bg-cream/40 px-3 py-4 text-sm text-muted"
        }
      >
        {availabilityNotes?.trim() ||
          "No available dates are listed yet. Send a care request to ask about scheduling."}
      </p>
    );
  }

  return (
    <div
      className={
        highContrast
          ? "space-y-3 rounded-2xl border-2 border-foreground/12 bg-surface p-3 sm:p-4"
          : "space-y-3"
      }
    >
      {availabilityNotes?.trim() ? (
        <p className={highContrast ? "text-sm font-medium text-foreground" : "text-sm text-muted"}>
          {availabilityNotes.trim()}
        </p>
      ) : null}
      <BookingCalendar
        mode="availability-readonly"
        visibility={visibility}
        viewRole={
          viewRole ??
          (visibility === "full" ? (petId ? "pet-parent" : "pet-friend") : "public")
        }
        availableDates={available}
        petId={petId}
        petFriendId={petFriendId}
        showLegend
        showSelectedChips={false}
        highContrast={highContrast}
      />
    </div>
  );
}
