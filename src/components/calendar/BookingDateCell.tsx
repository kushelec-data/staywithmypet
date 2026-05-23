"use client";

import { AppImage } from "@/components/ui/AppImage";
import type { DayBookingSlice } from "@/lib/booking-calendar";

const MAX_AVATARS = 2;

type BookingDateCellProps = {
  day: number;
  slices: DayBookingSlice[];
  showAvatars: boolean;
  /** Booked day without slice details (public view). */
  booked?: boolean;
  tint?: string | null;
  className?: string;
  compact?: boolean;
  /** Booked indicator dot on light pastel cells. */
  bookedDotPastel?: boolean;
};

export function BookingDateCell({
  day,
  slices,
  showAvatars,
  booked = false,
  tint,
  className = "",
  compact = false,
  bookedDotPastel = false,
}: BookingDateCellProps) {
  const hasBookings = slices.length > 0 || booked;
  const visible = showAvatars ? slices.slice(0, MAX_AVATARS) : [];
  const overflow = showAvatars ? Math.max(0, slices.length - MAX_AVATARS) : 0;

  return (
    <div
      className={`relative flex h-full w-full flex-col items-center justify-center gap-0.5 ${className}`}
      style={tint ? { backgroundColor: tint } : undefined}
    >
      <span
        className={`font-semibold leading-none ${compact ? "text-[0.65rem]" : "text-sm"}`}
      >
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
                <span
                  className={`flex h-full w-full items-center justify-center text-[0.5rem] font-bold ${slice.booking.color.text} ${slice.booking.color.bg}`}
                >
                  {slice.displayName.charAt(0).toUpperCase() || "?"}
                </span>
              )}
            </span>
          ))}
          {overflow > 0 ? (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground/80 px-0.5 text-[0.5rem] font-bold text-white ring-1 ring-white">
              +{overflow}
            </span>
          ) : null}
        </div>
      ) : hasBookings && !showAvatars ? (
        <span
          className={`h-1.5 w-1.5 rounded-full ${bookedDotPastel ? "bg-slate-500/70" : "bg-white/80"}`}
          aria-hidden
        />
      ) : null}
    </div>
  );
}
