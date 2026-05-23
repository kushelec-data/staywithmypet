"use client";

import { PetAvailabilityModal } from "@/components/pets/PetAvailabilityModal";
import { PetPublicAvailabilityCalendar } from "@/components/pets/PetPublicAvailabilityCalendar";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import { resolveInitialMonthCursor, type MonthCursor } from "@/lib/booking-calendar";
import { normalizeAvailabilityDates } from "@/lib/pet-availability";
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
};

function shiftMonthCursor(cursor: MonthCursor, offset: number): MonthCursor {
  const next = new Date(cursor.year, cursor.month + offset, 1);
  return { year: next.getFullYear(), month: next.getMonth() };
}

export function PublicCompactAvailabilityCard({
  petId,
  petFriendId,
  availableDates,
  availabilityNotes,
  visibility = "public",
  selectedDates,
  onSelectedDatesChange,
}: PublicCompactAvailabilityCardProps) {
  const { t } = useLanguage();
  const [fullCalendarOpen, setFullCalendarOpen] = useState(false);
  const available = useMemo(() => normalizeAvailabilityDates(availableDates), [availableDates]);
  const hasScheduleTarget = Boolean(petId || petFriendId);
  const [monthCursor, setMonthCursor] = useState<MonthCursor>(() =>
    resolveInitialMonthCursor(available, [], undefined),
  );

  const handleMonthCursorChange = useCallback((next: MonthCursor) => {
    setMonthCursor(shiftMonthCursor(next, 0));
  }, []);

  return (
    <section className={PUBLIC_CARD}>
      <h2 className={PUBLIC_SECTION_TITLE}>{t.searchFilters.availability}</h2>

      <div className="mt-3">
        {hasScheduleTarget || available.length > 0 ? (
          <PetPublicAvailabilityCalendar
            petId={petId}
            petFriendId={petFriendId}
            availableDates={available}
            availabilityNotes={availabilityNotes}
            visibility={visibility}
            compact
            variant="pastel"
            monthCursor={monthCursor}
            onMonthCursorChange={handleMonthCursorChange}
            selectedDates={selectedDates}
            onSelectedDatesChange={onSelectedDatesChange}
          />
        ) : (
          <p className="rounded-xl border border-dashed border-black/10 bg-cream/40 px-3 py-3 text-sm text-muted">
            {t.findCare.noUpcomingDates}
          </p>
        )}
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-4 w-full justify-center border-2 border-brand-teal/30 font-semibold text-brand-teal"
        onClick={() => setFullCalendarOpen(true)}
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
        monthCursor={monthCursor}
        onMonthCursorChange={handleMonthCursorChange}
      />
    </section>
  );
}
