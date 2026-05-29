"use client";

import { BookingCalendar } from "@/components/calendar/BookingCalendar";
import type { CalendarViewRole, MonthCursor } from "@/lib/booking-calendar";

export type AvailabilityCalendarProps = {
  selectedDates: string[];
  onChange: (dates: string[]) => void;
  disabled?: boolean;
  petId?: string | null;
  petFriendId?: string | null;
  viewRole?: CalendarViewRole;
  readOnly?: boolean;
  showLegend?: boolean;
  showViewOnlyHint?: boolean;
  monthCursor?: MonthCursor;
  onMonthCursorChange?: (cursor: MonthCursor) => void;
  maxWidthClass?: string;
  className?: string;
};

export function AvailabilityCalendar({
  selectedDates,
  onChange,
  disabled,
  petId,
  petFriendId,
  viewRole = "pet-parent",
  readOnly,
  showLegend,
  showViewOnlyHint,
  monthCursor,
  onMonthCursorChange,
  maxWidthClass,
  className,
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
      showLegend={showLegend}
      showViewOnlyHint={showViewOnlyHint}
      monthCursor={monthCursor}
      onMonthCursorChange={onMonthCursorChange}
      maxWidthClass={maxWidthClass}
      className={className}
    />
  );
}
