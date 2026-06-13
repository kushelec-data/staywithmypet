"use client";

import { AppImage } from "@/components/ui/AppImage";
import type { DayBookingSlice } from "@/lib/booking-calendar";
import { CALENDAR_COLORS, type CalendarCellFill } from "@/lib/calendar-design-tokens";

const MAX_AVATARS = 2;

type BookingDateCellProps = {
  day: number;
  slices: DayBookingSlice[];
  showAvatars: boolean;
  /** Booked day without slice details (public view). */
  booked?: boolean;
  cellFill?: CalendarCellFill;
  className?: string;
  compact?: boolean;
  /** @deprecated Dots use the unified palette. */
  tint?: string | null;
  /** @deprecated Dots use the unified palette. */
  bookedDotPastel?: boolean;
};

export function BookingDateCell({
  day,
  slices,
  showAvatars,
  booked = false,
  cellFill = "default",
  className = "",
  compact = false,
}: BookingDateCellProps) {
  const hasBookings = slices.length > 0 || booked;
  const visible = showAvatars ? slices.slice(0, MAX_AVATARS) : [];
  const overflow = showAvatars ? Math.max(0, slices.length - MAX_AVATARS) : 0;
  const dotColor =
    cellFill === "pending" ? CALENDAR_COLORS.pending : CALENDAR_COLORS.booked;

  return (
    <div
      className={`relative flex h-full w-full flex-col items-center justify-center gap-0.5 ${className}`}
    >
      <span className={compact ? "text-[0.7rem] font-semibold leading-none text-[#333333]" : "text-sm font-semibold leading-none text-[#333333]"}>
        {day}
      </span>
      {hasBookings && showAvatars ? (
        <div className="flex items-center justify-center -space-x-1.5">
          {visible.map((slice) => (
            <span
              key={slice.booking.id}
              className="relative h-4 w-4 shrink-0 overflow-hidden rounded-full ring-1 ring-white"
              title={slice.displayName}
            >
              {slice.displayPhotoUrl ? (
                <AppImage
                  src={slice.displayPhotoUrl}
                  alt=""
                  seed={slice.booking.id}
                  sizes="16px"
                  className="object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-[#FCE2E2] text-[0.5rem] font-bold text-[#333333]">
                  {slice.displayName.charAt(0).toUpperCase() || "?"}
                </span>
              )}
            </span>
          ))}
          {overflow > 0 ? (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#333333]/80 px-0.5 text-[0.5rem] font-bold text-white ring-1 ring-white">
              +{overflow}
            </span>
          ) : null}
        </div>
      ) : hasBookings && !showAvatars ? (
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: dotColor }}
          aria-hidden
        />
      ) : null}
    </div>
  );
}
