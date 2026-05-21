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
};

export function PetPublicAvailabilityCalendar({
  petId,
  petFriendId,
  availableDates,
  availabilityNotes,
  visibility = "public",
  viewRole,
}: PetPublicAvailabilityCalendarProps) {
  const available = useMemo(() => normalizeAvailabilityDates(availableDates), [availableDates]);

  if (!available.length && visibility === "public" && !petId && !petFriendId) {
    return (
      <p className="rounded-xl border border-dashed border-black/10 bg-cream/40 px-3 py-4 text-sm text-muted">
        {availabilityNotes?.trim() ||
          "No available dates are listed yet. Send a care request to ask about scheduling."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {availabilityNotes?.trim() ? (
        <p className="text-sm text-muted">{availabilityNotes.trim()}</p>
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
      />
    </div>
  );
}
