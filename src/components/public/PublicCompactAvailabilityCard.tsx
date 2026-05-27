"use client";

import { PetAvailabilityModal } from "@/components/pets/PetAvailabilityModal";
import type { ParentToFriendRequestTarget } from "@/components/requests/SendRequestButton";
import { Button } from "@/components/ui/Button";
import { DateChips } from "@/components/ui/DateChips";
import { useLanguage } from "@/context/LanguageContext";
import { resolveInitialMonthCursor, type MonthCursor } from "@/lib/booking-calendar";
import { formatAvailabilityDates } from "@/lib/date-format";
import { normalizeAvailabilityDates } from "@/lib/pet-availability";
import { buildPetAvailabilityCardPreview } from "@/lib/pet-availability-card";
import { PUBLIC_CARD, PUBLIC_SECTION_TITLE } from "@/lib/public-layout";
import { useCallback, useMemo, useState } from "react";

type PublicCompactAvailabilityCardProps = {
  petId?: string;
  petFriendId?: string;
  availableDates: string[];
  availabilityNotes?: string | null;
  visibility?: "full" | "public";
  /** Optional date pre-selection for request flow (member profile). */
  selectedDates?: string[];
  onSelectedDatesChange?: (dates: string[]) => void;
  /** Enables send-request from the full calendar (Pet Parent → Pet Friend). */
  careRequestTarget?: ParentToFriendRequestTarget | null;
};

export function PublicCompactAvailabilityCard({
  petId,
  petFriendId,
  availableDates,
  availabilityNotes,
  visibility = "public",
  selectedDates,
  onSelectedDatesChange,
  careRequestTarget = null,
}: PublicCompactAvailabilityCardProps) {
  const { t, locale } = useLanguage();
  const [fullCalendarOpen, setFullCalendarOpen] = useState(false);
  const available = useMemo(() => normalizeAvailabilityDates(availableDates), [availableDates]);
  const hasScheduleTarget = Boolean(petId || petFriendId);
  const preview = useMemo(
    () => buildPetAvailabilityCardPreview(available, 3, locale),
    [available, locale],
  );
  const selectable = Boolean(onSelectedDatesChange);
  const sortedSelected = useMemo(
    () => normalizeAvailabilityDates(selectedDates ?? []),
    [selectedDates],
  );
  const selectedPreview = useMemo(
    () =>
      formatAvailabilityDates(sortedSelected, {
        maxPreview: 3,
        locale,
      }),
    [sortedSelected, locale],
  );

  const [monthCursor, setMonthCursor] = useState<MonthCursor>(() =>
    resolveInitialMonthCursor(available, sortedSelected, undefined),
  );

  const handleMonthCursorChange = useCallback((next: MonthCursor) => {
    setMonthCursor(next);
  }, []);

  return (
    <section className={PUBLIC_CARD}>
      <h2 className={PUBLIC_SECTION_TITLE}>{t.searchFilters.availability}</h2>

      <div className="mt-3 space-y-3">
        {availabilityNotes?.trim() ? (
          <p className="text-xs leading-relaxed text-muted">{availabilityNotes.trim()}</p>
        ) : null}

        {hasScheduleTarget || available.length > 0 ? (
          <DateChips
            compact
            labels={preview.previewLabels}
            isos={preview.previewIsos}
            moreCount={preview.moreCount}
            emptyLabel={t.findCare.noUpcomingDates}
          />
        ) : (
          <p className="rounded-xl border border-dashed border-black/10 bg-cream/40 px-3 py-3 text-sm text-muted">
            {t.findCare.noUpcomingDates}
          </p>
        )}

        {selectable && sortedSelected.length > 0 ? (
          <div>
            <p className="text-xs font-semibold text-foreground/80">
              {t.bookingCalendar.legendSelected}
            </p>
            <ul className="mt-1.5 flex flex-wrap gap-1">
              {selectedPreview.previewLabels.map((label, i) => (
                <li
                  key={selectedPreview.previewIsos[i] ?? label}
                  className="rounded-full border border-brand-teal/30 bg-mint/40 px-2 py-0.5 text-[0.65rem] font-semibold text-brand-teal"
                >
                  {label}
                </li>
              ))}
              {selectedPreview.moreCount > 0 ? (
                <li className="rounded-full border border-brand-teal/30 bg-mint/40 px-2 py-0.5 text-[0.65rem] font-semibold text-brand-teal">
                  +{selectedPreview.moreCount}
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-4 w-full justify-center border-2 border-brand-teal/30 font-semibold text-brand-teal"
        onClick={() => setFullCalendarOpen(true)}
        disabled={!hasScheduleTarget && available.length === 0}
      >
        {t.bookingCalendar.viewFullCalendar}
      </Button>

      <PetAvailabilityModal
        open={fullCalendarOpen}
        name={t.searchFilters.availability}
        petId={petId}
        petFriendId={petFriendId}
        dates={available}
        onClose={() => setFullCalendarOpen(false)}
        title={t.bookingCalendar.availabilityCalendarTitle}
        variant="pastel"
        visibility={visibility}
        monthCursor={monthCursor}
        onMonthCursorChange={handleMonthCursorChange}
        selectedDates={selectable ? sortedSelected : undefined}
        onSelectedDatesChange={onSelectedDatesChange}
        careRequestTarget={careRequestTarget}
        initialSelectedDates={selectable ? sortedSelected : undefined}
      />
    </section>
  );
}
