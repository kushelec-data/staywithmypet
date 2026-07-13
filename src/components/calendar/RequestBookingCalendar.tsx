"use client";

import { BookingCalendar } from "@/components/calendar/BookingCalendar";

export type RequestBookingCalendarProps = {
  availableDates: string[];
  selectedDates: string[];
  onChange: (dates: string[]) => void;
  disabled?: boolean;
  petId: string;
};

export function RequestBookingCalendar({
  availableDates,
  selectedDates,
  onChange,
  disabled,
  petId,
}: RequestBookingCalendarProps) {
  return (
    <BookingCalendar
      mode="request-select"
      visibility="public"
      viewRole="public"
      availableDates={availableDates}
      selectedDates={selectedDates}
      onChange={onChange}
      disabled={disabled}
      petId={petId}
    />
  );
}
