"use client";

import { PetAvailabilityModal } from "@/components/pets/PetAvailabilityModal";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import { formatDate, formatDateRange } from "@/lib/date-format";
import { normalizeAvailabilityDates } from "@/lib/pet-availability";
import { PUBLIC_CARD, PUBLIC_SECTION_TITLE } from "@/lib/public-layout";
import { useMemo, useState } from "react";

type PublicCompactAvailabilityCardProps = {
  petId?: string;
  petFriendId?: string;
  availableDates: string[];
  availabilityNotes?: string | null;
  visibility?: "full" | "public";
};

export function PublicCompactAvailabilityCard({
  petId,
  petFriendId,
  availableDates,
  availabilityNotes,
}: PublicCompactAvailabilityCardProps) {
  const { t, locale } = useLanguage();
  const [fullCalendarOpen, setFullCalendarOpen] = useState(false);
  const available = useMemo(() => normalizeAvailabilityDates(availableDates), [availableDates]);

  const chips = useMemo(() => {
    const out: string[] = [];
    if (available.length) {
      out.push(t.bookingCalendar.legendAvailable);
      if (available.length === 1) {
        out.push(formatDate(available[0]!, locale));
      } else {
        out.push(formatDateRange(available[0]!, available[available.length - 1]!, locale));
      }
    }
    if (availabilityNotes?.trim()) out.push(availabilityNotes.trim());
    return out;
  }, [available, availabilityNotes, locale, t.bookingCalendar.legendAvailable]);

  return (
    <section className={PUBLIC_CARD}>
      <h2 className={PUBLIC_SECTION_TITLE}>{t.searchFilters.availability}</h2>

      {chips.length ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <li
              key={chip}
              className="rounded-full border-2 border-brand-teal/35 bg-mint/55 px-3 py-1 text-xs font-bold text-foreground"
            >
              {chip}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-xl border-2 border-dashed border-foreground/20 bg-surface px-3 py-3 text-sm font-medium text-foreground">
          {t.findCare.noUpcomingDates}
        </p>
      )}

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
        highContrast
      />
    </section>
  );
}
