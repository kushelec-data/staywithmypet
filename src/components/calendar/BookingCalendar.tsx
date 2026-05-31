"use client";

import { BookingDateCell } from "@/components/calendar/BookingDateCell";
import { CalendarInlineLegend } from "@/components/calendar/CalendarInlineLegend";
import { BookingPopover } from "@/components/calendar/BookingPopover";
import { useLanguage } from "@/context/LanguageContext";
import { useCalendarBookings } from "@/hooks/useCalendarBookings";
import {
  mondayIndex,
  monthCursorToDate,
  resolveInitialMonthCursor,
  shiftMonthCursor,
  type CalendarBooking,
  type CalendarViewRole,
  type MonthCursor,
} from "@/lib/booking-calendar";
import { filterPastDates, resolveCalendarDay, todayISODate } from "@/lib/calendar-date-state";
import {
  eachISODateInRangeInclusive,
  localISODate,
  mergeUniqueSortedDates,
  normalizeAvailabilityDates,
} from "@/lib/pet-availability";
import { useEffect, useMemo, useRef, useState } from "react";

export type BookingCalendarMode =
  | "availability-select"
  | "availability-readonly"
  | "request-select";

export type BookingCalendarVisibility = "full" | "public";

export type BookingCalendarProps = {
  mode: BookingCalendarMode;
  visibility?: BookingCalendarVisibility;
  viewRole?: CalendarViewRole;
  availableDates?: string[];
  selectedDates?: string[];
  onChange?: (dates: string[]) => void;
  disabled?: boolean;
  petId?: string | null;
  petFriendId?: string | null;
  /** Initial month when no dates present */
  initialMonth?: Date;
  /** Controlled visible month (optional; pairs with onMonthCursorChange). */
  monthCursor?: MonthCursor;
  onMonthCursorChange?: (cursor: MonthCursor) => void;
  showLegend?: boolean;
  showViewOnlyHint?: boolean;
  className?: string;
  maxWidthClass?: string;
  /** Smaller grid for sidebar mini calendars. */
  compact?: boolean;
  /** @deprecated Ignored — one soft palette site-wide. */
  variant?: "default" | "pastel";
  /** @deprecated Ignored — same as default palette. */
  highContrast?: boolean;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function BookingCalendar({
  mode,
  visibility = "full",
  viewRole = "involved",
  availableDates = [],
  selectedDates = [],
  onChange,
  disabled,
  petId,
  petFriendId,
  initialMonth,
  monthCursor: monthCursorProp,
  onMonthCursorChange,
  showLegend = true,
  showViewOnlyHint = true,
  className = "",
  maxWidthClass = "max-w-lg",
  compact = false,
  variant: _variant = "default",
  highContrast: _highContrast = false,
}: BookingCalendarProps) {
  const { t } = useLanguage();
  const available = useMemo(() => normalizeAvailabilityDates(availableDates), [availableDates]);
  const availableSet = useMemo(() => new Set(available), [available]);
  const sortedSelected = useMemo(() => normalizeAvailabilityDates(selectedDates), [selectedDates]);
  const selectedSet = useMemo(() => new Set(sortedSelected), [sortedSelected]);

  const [internalMonthCursor, setInternalMonthCursor] = useState<MonthCursor>(() =>
    resolveInitialMonthCursor(available, sortedSelected, initialMonth),
  );
  const isMonthControlled =
    monthCursorProp !== undefined && onMonthCursorChange !== undefined;
  const monthCursor = isMonthControlled ? monthCursorProp : internalMonthCursor;

  function goToMonth(delta: number) {
    const next = shiftMonthCursor(monthCursor, delta);
    if (onMonthCursorChange) onMonthCursorChange(next);
    if (!isMonthControlled) setInternalMonthCursor(next);
  }
  const [activeBooking, setActiveBooking] = useState<CalendarBooking | null>(null);
  const [popoverVariant, setPopoverVariant] = useState<"popover" | "sheet">("popover");
  const activeCellRef = useRef<HTMLButtonElement | null>(null);
  const lastSelectedRef = useRef<string | null>(null);

  const year = monthCursor.year;
  const month = monthCursor.month;
  const title = monthCursorToDate(monthCursor).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });
  const navigationDisabled =
    mode === "availability-readonly" ? false : Boolean(disabled);
  const today = todayISODate();

  const { dayMap, blockingBookedDateSet, loading } = useCalendarBookings({
    petId,
    petFriendId,
    visibility,
    viewRole,
    year,
    month,
    enabled: Boolean(petId || petFriendId),
  });

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    function update() {
      setPopoverVariant(mq.matches ? "sheet" : "popover");
    }
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const first = new Date(year, month, 1);
  const lead = mondayIndex(first);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < lead; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);

  function isoFor(day: number): string {
    return localISODate(new Date(year, month, day));
  }

  function toggle(iso: string, shiftKey = false) {
    if (disabled || !onChange) return;
    if (blockingBookedDateSet.has(iso)) return;
    if (iso < today) return;
    if (mode === "request-select" && !availableSet.has(iso)) return;

    if (
      shiftKey &&
      lastSelectedRef.current &&
      lastSelectedRef.current !== iso &&
      mode === "availability-select"
    ) {
      const range = filterPastDates(
        eachISODateInRangeInclusive(lastSelectedRef.current, iso),
        today,
      );
      onChange(mergeUniqueSortedDates(sortedSelected, range));
      lastSelectedRef.current = iso;
      return;
    }

    const next = new Set(selectedSet);
    if (next.has(iso)) next.delete(iso);
    else next.add(iso);
    onChange([...next].sort());
    lastSelectedRef.current = iso;
  }

  function openBookingDetail(booking: CalendarBooking) {
    if (visibility === "public" || viewRole === "public") return;
    setActiveBooking(booking);
  }

  if (mode === "request-select" && !available.length) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-cream/40 px-3 py-4 text-sm text-muted">
        {t.bookingCalendar.noAvailableDates}
      </p>
    );
  }

  const navBtnClass = compact
    ? "rounded-lg border border-black/8 bg-surface px-2 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-mint/35 disabled:opacity-50"
    : "rounded-xl border border-black/10 bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-mint/40 disabled:opacity-50";

  const gridShellClass = compact
    ? "overflow-x-auto rounded-xl border border-black/[0.06] bg-cream/40 p-2 sm:p-2.5"
    : "overflow-x-auto rounded-2xl border border-black/[0.06] bg-gradient-to-b from-cream/50 via-mint/15 to-surface p-3 sm:p-5";

  return (
    <div className={`${compact ? "space-y-2.5" : "space-y-4"} ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={navigationDisabled}
          onClick={() => goToMonth(-1)}
          className={navBtnClass}
          aria-label={t.bookingCalendar.prevMonth}
        >
          ←
        </button>
        <p
          className={`min-w-0 flex-1 text-center font-heading font-semibold text-foreground ${
            compact ? "text-xs" : "text-sm sm:text-base"
          }`}
        >
          {title}
          {loading ? (
            <span className="ml-1.5 text-[0.65rem] font-normal text-muted">
              {t.bookingCalendar.loading}
            </span>
          ) : null}
        </p>
        <button
          type="button"
          disabled={navigationDisabled}
          onClick={() => goToMonth(1)}
          className={navBtnClass}
          aria-label={t.bookingCalendar.nextMonth}
        >
          →
        </button>
      </div>

      <div className={gridShellClass}>
        <div
          className={
            compact
              ? "min-w-0 w-full"
              : `mx-auto w-full min-w-[min(100%,240px)] ${maxWidthClass} px-0.5 sm:px-0`
          }
        >
          <div
            className={`grid grid-cols-7 gap-0.5 text-center font-semibold uppercase tracking-wide text-muted ${
              compact ? "text-[0.6rem]" : "text-[0.65rem] sm:text-xs"
            }`}
          >
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div
            className={`mt-1 grid grid-cols-7 ${compact ? "gap-0.5" : "gap-0.5 sm:gap-1"}`}
          >
            {cells.map((day, idx) => {
              if (day === null) {
                return <div key={`e-${idx}`} className="aspect-square" />;
              }
              const iso = isoFor(day);
              const slices = dayMap.get(iso) ?? [];
              const isAvailable = availableSet.has(iso);
              const isSelected = selectedSet.has(iso);
              const blockingBooked = blockingBookedDateSet.has(iso);
              const primaryBooking = slices[0]?.booking;
              const resolved = resolveCalendarDay(
                {
                  iso,
                  today,
                  slices,
                  mode,
                  isSelected,
                  isAvailable,
                  blockingBooked,
                },
                {
                  pastUnavailable: t.bookingCalendar.pastUnavailable,
                  pastCompleted: t.bookingCalendar.pastCompleted,
                  booked: t.bookingCalendar.booked,
                  alreadyBooked: t.bookingCalendar.alreadyBooked,
                  notAvailable: t.bookingCalendar.notAvailable,
                  available: t.bookingCalendar.legendAvailable,
                  selected: t.bookingCalendar.legendSelected,
                  iso,
                },
                {
                  visibility,
                  disabled,
                  primaryTint: primaryBooking?.color.tint ?? null,
                  primaryColor: primaryBooking?.color,
                },
              );

              const cellRound = compact ? "rounded-lg" : "rounded-lg sm:rounded-xl";
              const cellInner = (
                <BookingDateCell
                  day={day}
                  slices={slices}
                  booked={blockingBooked || slices.length > 0}
                  showAvatars={resolved.showAvatars && viewRole !== "public"}
                  tint={resolved.tint}
                  compact={compact}
                />
              );

              if (mode === "availability-readonly") {
                return (
                  <div
                    key={iso}
                    title={resolved.title}
                    aria-label={resolved.ariaLabel}
                    className={`relative flex aspect-square items-center justify-center transition-colors ${cellRound} ${resolved.cellClassName}`}
                  >
                    {cellInner}
                  </div>
                );
              }

              return (
                <button
                  key={iso}
                  ref={activeBooking?.id === primaryBooking?.id ? activeCellRef : undefined}
                  type="button"
                  disabled={!resolved.canSelect && !resolved.canOpenBooking}
                  title={resolved.title}
                  aria-label={resolved.ariaLabel}
                  onClick={(e) => {
                    if (resolved.canOpenBooking && primaryBooking) {
                      openBookingDetail(primaryBooking);
                      return;
                    }
                    if (resolved.canSelect) toggle(iso, e.shiftKey);
                  }}
                  onMouseEnter={() => {
                    if (
                      popoverVariant === "popover" &&
                      resolved.canOpenBooking &&
                      primaryBooking
                    ) {
                      setActiveBooking(primaryBooking);
                    }
                  }}
                  className={`relative flex aspect-square items-center justify-center transition-colors ${cellRound} ${resolved.cellClassName}`}
                >
                  {cellInner}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {activeBooking ? (
        <BookingPopover
          booking={activeBooking}
          viewRole={viewRole}
          open={Boolean(activeBooking)}
          onClose={() => setActiveBooking(null)}
          variant={popoverVariant}
          anchorRef={activeCellRef}
        />
      ) : null}

      {showLegend ? <CalendarInlineLegend mode={mode} compact={compact} /> : null}

      {mode === "availability-readonly" ? (
        compact || !showViewOnlyHint ? null : (
          <p className="text-xs text-muted">{t.bookingCalendar.viewOnlyHint}</p>
        )
      ) : mode === "availability-select" ? (
        <p className="text-xs text-muted">{t.bookingCalendar.tapToAdd}</p>
      ) : mode === "request-select" ? (
        <p className="text-xs text-muted">{t.bookingCalendar.selectFromAvailable}</p>
      ) : null}
    </div>
  );
}
