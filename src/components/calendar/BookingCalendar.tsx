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
import {
  CALENDAR_CELL,
  CALENDAR_NAV,
  CALENDAR_SHELL,
  CALENDAR_WEEKDAY,
} from "@/lib/calendar-design-tokens";
import { filterPastDates, resolveCalendarDay, todayISODate } from "@/lib/calendar-date-state";
import { formatCalendarWeekdayLabels, formatMonthYear } from "@/lib/date-format";
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
  const { t, locale } = useLanguage();
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

  function goToToday() {
    const now = new Date();
    const next: MonthCursor = { year: now.getFullYear(), month: now.getMonth() };
    if (onMonthCursorChange) onMonthCursorChange(next);
    if (!isMonthControlled) setInternalMonthCursor(next);
  }
  const [activeBooking, setActiveBooking] = useState<CalendarBooking | null>(null);
  const [popoverVariant, setPopoverVariant] = useState<"popover" | "sheet">("popover");
  const activeCellRef = useRef<HTMLButtonElement | null>(null);
  const lastSelectedRef = useRef<string | null>(null);

  const year = monthCursor.year;
  const month = monthCursor.month;
  const title = useMemo(
    () => formatMonthYear(monthCursorToDate(monthCursor), locale),
    [monthCursor, locale],
  );
  const weekdayLabels = useMemo(
    () => formatCalendarWeekdayLabels(locale, compact),
    [locale, compact],
  );
  const navigationDisabled =
    mode === "availability-readonly" ? false : Boolean(disabled);
  const today = todayISODate();

  const { dayMap, blockingBookedDateSet, pendingRequestDateSet, loading } = useCalendarBookings({
    petId,
    petFriendId,
    visibility,
    viewRole,
    year,
    month,
    enabled: Boolean(petId || petFriendId),
  });

  const [staleSelectionNotice, setStaleSelectionNotice] = useState(false);

  useEffect(() => {
    if (mode !== "request-select" || !onChange || loading) return;

    const blocked = new Set([...blockingBookedDateSet, ...pendingRequestDateSet]);
    const next = sortedSelected.filter((d) => !blocked.has(d));
    if (next.length < sortedSelected.length) {
      onChange(next);
      setStaleSelectionNotice(true);
    }
  }, [mode, onChange, loading, blockingBookedDateSet, pendingRequestDateSet, sortedSelected]);

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
    setStaleSelectionNotice(false);
    if (blockingBookedDateSet.has(iso)) return;
    if (pendingRequestDateSet.has(iso)) return;
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

  const navBtnClass = compact ? CALENDAR_NAV.buttonCompact : CALENDAR_NAV.button;
  const gridShellClass = compact ? CALENDAR_SHELL.outerCompact : CALENDAR_SHELL.outer;

  return (
    <div className={`${compact ? "space-y-2.5" : "space-y-4"} ${className}`}>
      <div className={CALENDAR_NAV.row}>
        <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
          <button
            type="button"
            disabled={navigationDisabled}
            onClick={() => goToMonth(-1)}
            className={navBtnClass}
            style={CALENDAR_NAV.borderStyle}
            aria-label={t.bookingCalendar.prevMonth}
          >
            ‹
          </button>
          <p className={compact ? CALENDAR_NAV.titleCompact : CALENDAR_NAV.title}>
            {title}
            {loading ? (
              <span className="ml-1.5 text-[0.65rem] font-normal text-[#5C5C5C]">
                {t.bookingCalendar.loading}
              </span>
            ) : null}
          </p>
          <button
            type="button"
            disabled={navigationDisabled}
            onClick={() => goToMonth(1)}
            className={navBtnClass}
            style={CALENDAR_NAV.borderStyle}
            aria-label={t.bookingCalendar.nextMonth}
          >
            ›
          </button>
        </div>
        <button
          type="button"
          disabled={navigationDisabled}
          onClick={goToToday}
          className={CALENDAR_NAV.todayButton}
          style={CALENDAR_NAV.borderStyle}
        >
          {t.bookingCalendar.todayButton}
        </button>
      </div>

      <div className={gridShellClass} style={CALENDAR_SHELL.borderStyle}>
        <div
          className={
            compact
              ? "min-w-0 w-full"
              : `${CALENDAR_SHELL.maxWidth} ${maxWidthClass} px-0.5 sm:px-0`
          }
        >
          <div className={compact ? CALENDAR_WEEKDAY.rowCompact : CALENDAR_WEEKDAY.row}>
            {weekdayLabels.map((label, index) => (
              <div key={`weekday-${index}`} className="min-w-0 py-1">
                {label}
              </div>
            ))}
          </div>
          <div
            className={`mt-1 grid grid-cols-7 ${compact ? CALENDAR_CELL.gapCompact : CALENDAR_CELL.gap}`}
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
              const blockingPending =
                pendingRequestDateSet.has(iso) && !blockingBooked;
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
                  blockingPending,
                },
                {
                  pastUnavailable: t.bookingCalendar.pastUnavailable,
                  pastCompleted: t.bookingCalendar.pastCompleted,
                  booked: t.bookingCalendar.booked,
                  alreadyBooked: t.bookingCalendar.alreadyBooked,
                  pendingRequest: t.bookingCalendar.pendingRequest,
                  notAvailable: t.bookingCalendar.notAvailable,
                  available: t.bookingCalendar.legendAvailable,
                  selected: t.bookingCalendar.legendSelected,
                  iso,
                },
                {
                  visibility,
                  disabled,
                  primaryColor: primaryBooking?.color,
                },
              );

              const cellInner = (
                <BookingDateCell
                  day={day}
                  slices={slices}
                  booked={blockingBooked || slices.length > 0}
                  showAvatars={resolved.showAvatars && viewRole !== "public"}
                  cellFill={resolved.cellFill}
                  compact={compact}
                />
              );

              if (mode === "availability-readonly") {
                return (
                  <div
                    key={iso}
                    title={resolved.title}
                    aria-label={resolved.ariaLabel}
                    className={resolved.cellClassName}
                    style={resolved.cellStyle}
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
                  className={resolved.cellClassName}
                  style={resolved.cellStyle}
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

      {showLegend ? <CalendarInlineLegend compact={compact} /> : null}

      {staleSelectionNotice && mode === "request-select" ? (
        <p className="text-xs font-medium text-amber-800" role="status">
          {t.bookingCalendar.staleSelectionRemoved}
        </p>
      ) : null}

      {mode === "availability-readonly" ? (
        !showViewOnlyHint ? null : (
          <p className="text-xs text-muted">{t.bookingCalendar.tapToSee}</p>
        )
      ) : mode === "availability-select" ? (
        <p className="text-xs text-muted">{t.bookingCalendar.tapToAdd}</p>
      ) : mode === "request-select" ? (
        <p className="text-xs text-muted">{t.bookingCalendar.selectFromAvailable}</p>
      ) : null}
    </div>
  );
}
