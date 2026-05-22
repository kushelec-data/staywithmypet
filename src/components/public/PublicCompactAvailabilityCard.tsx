"use client";

import { PetPublicAvailabilityCalendar } from "@/components/pets/PetPublicAvailabilityCalendar";
import { useLanguage } from "@/context/LanguageContext";
import { formatDate, formatDateRange } from "@/lib/date-format";
import { normalizeAvailabilityDates } from "@/lib/pet-availability";
import { PUBLIC_CARD, PUBLIC_SECTION_TITLE } from "@/lib/public-layout";
import { useMemo } from "react";

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
  visibility = "public",
}: PublicCompactAvailabilityCardProps) {
  const { t, locale } = useLanguage();
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
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <li
              key={chip}
              className="rounded-full border border-brand-teal/20 bg-mint/40 px-2.5 py-0.5 text-xs font-semibold text-brand-teal"
            >
              {chip}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4">
        <PetPublicAvailabilityCalendar
          petId={petId}
          petFriendId={petFriendId}
          availableDates={available}
          availabilityNotes={availabilityNotes}
          visibility={visibility}
          viewRole={petFriendId && visibility === "full" ? "pet-friend" : undefined}
        />
      </div>
    </section>
  );
}
