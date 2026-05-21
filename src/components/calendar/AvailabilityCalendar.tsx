"use client";

import { BookingCalendar } from "@/components/calendar/BookingCalendar";
import type { CalendarViewRole } from "@/lib/booking-calendar";

export type AvailabilityCalendarProps = {
  selectedDates: string[];
  onChange: (dates: string[]) => void;
  disabled?: boolean;
  petId?: string | null;
  petFriendId?: string | null;
  viewRole?: CalendarViewRole;
  readOnly?: boolean;
};

export function AvailabilityCalendar({
  selectedDates,
  onChange,
  disabled,
  petId,
  petFriendId,
  viewRole = "pet-parent",
  readOnly,
}: AvailabilityCalendarProps) {
  return (
    <BookingCalendar
      mode={readOnly ? "availability-readonly" : "availability-select"}
      visibility="full"
      viewRole={viewRole}
      availableDates={readOnly ? selectedDates : []}
      selectedDates={selectedDates}
      onChange={readOnly ? undefined : onChange}
      disabled={disabled}
      petId={petId}
      petFriendId={petFriendId}
    />
  );
}
