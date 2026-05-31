"use client";

import { BookingCalendar } from "@/components/calendar/BookingCalendar";
import { useLanguage } from "@/context/LanguageContext";
import { formatDate } from "@/lib/date-format";
import { normalizeAvailabilityDates } from "@/lib/pet-availability";
import { useEffect, useId, useRef, useState } from "react";

type AvailabilityDatePickerProps = {
  selectedDates: string[];
  onChange: (dates: string[]) => void;
  disabled?: boolean;
  /** For pet-specific calendars (booked dates disabled, public visibility) */
  petId?: string | null;
  petFriendId?: string | null;
};

export function AvailabilityDatePicker({
  selectedDates,
  onChange,
  disabled,
  petId,
  petFriendId,
}: AvailabilityDatePickerProps) {
  const { t, locale } = useLanguage();
  const f = t.searchFilters;
  const sorted = normalizeAvailabilityDates(selectedDates);
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    function update() {
      setSheet(mq.matches);
    }
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const triggerLabel = sorted.length
    ? `${f.chooseDates} (${sorted.length})`
    : f.anyDates;

  const calendar = (
    <BookingCalendar
      mode="availability-select"
      visibility={petId || petFriendId ? "public" : "full"}
      viewRole="public"
      selectedDates={sorted}
      onChange={onChange}
      disabled={disabled}
      petId={petId}
      petFriendId={petFriendId}
      showLegend
      className="rounded-2xl"
    />
  );

  const panel = (
    <div className="space-y-3 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-heading text-base font-semibold text-foreground">{f.availability}</h3>
          <p className="mt-0.5 text-xs text-muted">{f.availabilityPickerHint}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full px-2 py-1 text-sm text-muted hover:bg-mint/50"
          aria-label={t.bookingCalendar.close}
        >
          ✕
        </button>
      </div>
      {calendar}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          disabled={disabled || !sorted.length}
          onClick={() => onChange([])}
          className="rounded-xl px-3 py-2 text-sm font-medium text-muted hover:bg-black/5 disabled:opacity-40"
        >
          {t.bookingCalendar.clearDates}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-xl bg-brand-teal px-4 py-2 text-sm font-semibold text-white hover:bg-brand-teal-hover"
        >
          {f.done}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-2">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-left text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-brand-teal/30 hover:bg-mint/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal disabled:opacity-50"
      >
        <span>{triggerLabel}</span>
        <span className="text-xs font-medium text-brand-teal" aria-hidden>
          {sorted.length ? `${sorted.length}` : ""}
        </span>
      </button>

      {sorted.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {sorted.map((iso) => (
            <li key={iso}>
              <span className="inline-flex items-center gap-1 rounded-full border border-brand-teal/25 bg-mint/40 px-2.5 py-1 text-xs font-medium text-brand-teal dark:bg-mint/20">
                {formatDate(iso, locale)}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(sorted.filter((d) => d !== iso))}
                  className="rounded-full px-1 text-brand-pink hover:bg-brand-pink/15 disabled:opacity-50"
                  aria-label={`${f.removeFilter} ${formatDate(iso, locale)}`}
                >
                  ×
                </button>
              </span>
            </li>
          ))}
          <li>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange([])}
              className="text-xs font-medium text-muted underline-offset-2 hover:text-brand-teal hover:underline"
            >
              {f.clearDates}
            </button>
          </li>
        </ul>
      ) : null}

      {open && sheet ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-foreground/30"
            aria-label={t.bookingCalendar.close}
            onClick={() => setOpen(false)}
          />
          <div
            id={panelId}
            role="dialog"
            aria-modal="true"
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl border border-border bg-cream shadow-2xl dark:bg-surface"
          >
            {panel}
          </div>
        </>
      ) : null}

      {open && !sheet ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30"
            aria-label={t.bookingCalendar.close}
            onClick={() => setOpen(false)}
          />
          <div
            id={panelId}
            role="dialog"
            className="relative z-40 rounded-2xl border border-border bg-cream shadow-xl dark:bg-surface"
          >
            {panel}
          </div>
        </>
      ) : null}
    </div>
  );
}
