"use client";

import { DateChips } from "@/components/ui/DateChips";
import { useLanguage } from "@/context/LanguageContext";
import { normalizeAvailabilityDates } from "@/lib/pet-availability";
import { buildPetAvailabilityCardPreview } from "@/lib/pet-availability-card";
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
  const hasScheduleTarget = visibility === "full" ? Boolean(petId || petFriendId) : available.length > 0;
  const preview = useMemo(
    () => buildPetAvailabilityCardPreview(available, 3, locale),
    [available, locale],
  );

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
      </div>
    </section>
  );
}
