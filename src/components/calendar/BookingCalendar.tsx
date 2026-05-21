"use client";

import { BookingDateCell } from "@/components/calendar/BookingDateCell";
import { BookingPopover } from "@/components/calendar/BookingPopover";
import { useLanguage } from "@/context/LanguageContext";
import { useCalendarBookings } from "@/hooks/useCalendarBookings";
import {
  addMonths,
  mondayIndex,
  startOfMonth,
  type CalendarBooking,
  type CalendarViewRole,
} from "@/lib/booking-calendar";
import { formatDate } from "@/lib/date-format";
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
  showLegend?: boolean;
  showSelectedChips?: boolean;
  className?: string;
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
  showLegend = true,
  showSelectedChips,
  className = "",
}: BookingCalendarProps) {
  const { t, locale } = useLanguage();
  const available = useMemo(() => normalizeAvailabilityDates(availableDates), [availableDates]);
  const availableSet = useMemo(() => new Set(available), [available]);
  const sortedSelected = useMemo(() => normalizeAvailabilityDates(selectedDates), [selectedDates]);
  const selectedSet = useMemo(() => new Set(sortedSelected), [sortedSelected]);

  const initialCursor = useMemo(() => {
    const first = available[0] ?? sortedSelected[0];
    if (first) {
      const [y, m] = first.split("-").map(Number);
      if (y && m) return startOfMonth(new Date(y, m - 1, 1));
    }
    return startOfMonth(initialMonth ?? new Date());
  }, [available, sortedSelected, initialMonth]);

  const [cursor, setCursor] = useState(initialCursor);
  const [activeBooking, setActiveBooking] = useState<CalendarBooking | null>(null);
  const [popoverVariant, setPopoverVariant] = useState<"popover" | "sheet">("popover");
  const activeCellRef = useRef<HTMLButtonElement | null>(null);
  const lastSelectedRef = useRef<string | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const title = cursor.toLocaleString(undefined, { month: "long", year: "numeric" });
  const today = localISODate(new Date());

  const { dayMap, bookedDateSet, loading } = useCalendarBookings({
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
    if (bookedDateSet.has(iso)) return;
    if (mode === "request-select" && !availableSet.has(iso)) return;

    if (
      shiftKey &&
      lastSelectedRef.current &&
      lastSelectedRef.current !== iso &&
      mode === "availability-select"
    ) {
      const range = eachISODateInRangeInclusive(lastSelectedRef.current, iso);
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

  function removeChip(iso: string) {
    if (disabled || !onChange) return;
    onChange(sortedSelected.filter((d) => d !== iso));
  }

  function clearAll() {
    if (disabled || !onChange) return;
    onChange([]);
  }

  function openBookingDetail(booking: CalendarBooking) {
    if (visibility === "public" || viewRole === "public") return;
    setActiveBooking(booking);
  }

  const chipsVisible =
    showSelectedChips ??
    (mode === "availability-select" || mode === "request-select");

  if (mode === "request-select" && !available.length) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-cream/40 px-3 py-4 text-sm text-muted">
        {t.bookingCalendar.noAvailableDates}
      </p>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setCursor(addMonths(cursor, -1))}
          className="rounded-xl border border-black/10 bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-mint/40 disabled:opacity-50"
          aria-label={t.bookingCalendar.prevMonth}
        >
          ←
        </button>
        <p className="min-w-0 flex-1 text-center font-heading text-sm font-semibold text-foreground sm:text-base">
          {title}
          {loading ? (
            <span className="ml-2 text-xs font-normal text-muted">{t.bookingCalendar.loading}</span>
          ) : null}
        </p>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setCursor(addMonths(cursor, 1))}
          className="rounded-xl border border-black/10 bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-mint/40 disabled:opacity-50"
          aria-label={t.bookingCalendar.nextMonth}
        >
          →
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-brand-teal/20 bg-gradient-to-b from-mint/30 to-surface p-3 sm:p-4">
        <div className="mx-auto min-w-[260px] max-w-md">
          <div className="grid grid-cols-7 gap-0.5 text-center text-[0.65rem] font-semibold uppercase tracking-wide text-muted sm:text-xs">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (day === null) {
                return <div key={`e-${idx}`} className="aspect-square" />;
              }
              const iso = isoFor(day);
              const slices = dayMap.get(iso) ?? [];
              const isBooked = bookedDateSet.has(iso);
              const isAvailable = availableSet.has(iso);
              const isSelected = selectedSet.has(iso);
              const isToday = today === iso;
              const canSelect =
                mode !== "availability-readonly" &&
                !disabled &&
                !isBooked &&
                (mode === "availability-select" ||
                  (mode === "request-select" && isAvailable));
              const primaryBooking = slices[0]?.booking;
              const tint =
                isBooked && primaryBooking && visibility === "full"
                  ? primaryBooking.color.tint
                  : isBooked && visibility === "public"
                    ? "rgba(0,0,0,0.08)"
                    : null;

              const titleParts: string[] = [];
              if (isBooked && mode === "request-select") titleParts.push(t.bookingCalendar.alreadyBooked);
              else if (isBooked && visibility === "public") titleParts.push(t.bookingCalendar.booked);
              else if (!isAvailable && mode === "request-select")
                titleParts.push(t.bookingCalendar.notAvailable);
              else titleParts.push(iso);

              const cellInner = (
                <BookingDateCell
                  day={day}
                  slices={slices}
                  booked={isBooked}
                  showAvatars={visibility === "full" && viewRole !== "public"}
                  tint={isBooked ? tint : null}
                />
              );

              const showAsAvailable =
                mode === "availability-readonly" || mode === "request-select"
                  ? isAvailable
                  : isSelected;

              const stateClasses = isSelected && mode !== "availability-readonly"
                ? "bg-brand-teal text-white shadow-md shadow-brand-teal/25 ring-2 ring-brand-teal ring-offset-1"
                : isSelected && mode === "availability-readonly"
                  ? "bg-brand-teal/15 text-brand-teal ring-1 ring-brand-teal/25"
                  : isBooked
                    ? visibility === "public"
                      ? "bg-black/[0.08] text-muted ring-1 ring-black/10"
                      : `${primaryBooking?.color.bg ?? "bg-black/[0.06]"} ${primaryBooking?.color.text ?? "text-foreground"} ring-1 ${primaryBooking?.color.ring ?? "ring-black/10"}`
                    : showAsAvailable
                      ? isToday
                        ? "bg-emerald-50 text-brand-teal ring-1 ring-brand-teal/30 hover:bg-emerald-100/80"
                        : "bg-emerald-50/80 text-foreground ring-1 ring-emerald-200/60 hover:bg-emerald-100/70"
                      : mode === "availability-select"
                        ? isToday
                          ? "bg-brand-pink/15 text-brand-pink ring-1 ring-brand-pink/30 hover:bg-mint/50"
                          : "bg-surface/90 text-foreground hover:bg-mint/50 hover:ring-1 hover:ring-brand-teal/20"
                        : "bg-black/[0.03] text-muted/40";

              if (mode === "availability-readonly") {
                return (
                  <div
                    key={iso}
                    title={titleParts.join(" · ")}
                    className={`relative flex aspect-square items-center justify-center rounded-xl transition-all ${stateClasses}`}
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
                  disabled={!canSelect && !(isBooked && visibility === "full")}
                  title={titleParts.join(" · ")}
                  onClick={(e) => {
                    if (isBooked && primaryBooking && visibility === "full") {
                      openBookingDetail(primaryBooking);
                      return;
                    }
                    if (canSelect) toggle(iso, e.shiftKey);
                  }}
                  onMouseEnter={() => {
                    if (
                      popoverVariant === "popover" &&
                      isBooked &&
                      primaryBooking &&
                      visibility === "full"
                    ) {
                      setActiveBooking(primaryBooking);
                    }
                  }}
                  className={`relative flex aspect-square items-center justify-center rounded-xl transition-all ${
                    canSelect ? "cursor-pointer" : isBooked ? "cursor-pointer" : "cursor-not-allowed"
                  } ${stateClasses} disabled:opacity-60`}
                >
                  {cellInner}
                  {isBooked && mode === "request-select" ? (
                    <span className="sr-only">{t.bookingCalendar.alreadyBooked}</span>
                  ) : null}
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

      {showLegend ? (
        <ul className="flex flex-wrap gap-3 text-xs text-muted">
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-100 ring-1 ring-emerald-200/70" />
            {t.bookingCalendar.legendAvailable}
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-black/[0.08] ring-1 ring-black/10" />
            {visibility === "public" ? t.bookingCalendar.booked : t.bookingCalendar.legendBooked}
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-black/[0.03] ring-1 ring-black/5" />
            {t.bookingCalendar.legendUnavailable}
          </li>
          {mode !== "availability-readonly" ? (
            <li className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-brand-teal ring-2 ring-brand-teal/40" />
              {t.bookingCalendar.legendSelected}
            </li>
          ) : null}
        </ul>
      ) : null}

      {chipsVisible && sortedSelected.length > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            {t.bookingCalendar.selectedDates}
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {sortedSelected.map((iso) => (
              <li key={iso}>
                <span className="inline-flex items-center gap-1 rounded-full border border-brand-teal/25 bg-mint/40 px-2.5 py-1 text-xs font-medium text-brand-teal">
                  {formatDate(iso, locale)}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => removeChip(iso)}
                    className="ml-0.5 rounded-full px-1 text-brand-pink hover:bg-brand-pink/15 disabled:opacity-50"
                    aria-label={`Remove ${iso}`}
                  >
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : mode === "availability-select" ? (
        <p className="text-xs text-muted">{t.bookingCalendar.tapToAdd}</p>
      ) : mode === "request-select" ? (
        <p className="text-xs text-muted">{t.bookingCalendar.selectFromAvailable}</p>
      ) : null}

      {chipsVisible && mode !== "availability-readonly" ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled || sortedSelected.length === 0}
            onClick={clearAll}
            className="rounded-xl border border-black/10 px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-black/5 disabled:opacity-40"
          >
            {t.bookingCalendar.clearDates}
          </button>
        </div>
      ) : null}
    </div>
  );
}
