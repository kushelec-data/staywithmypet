"use client";

import { useState } from "react";
import Link from "next/link";
import { AppImage } from "@/components/ui/AppImage";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { PetAvailabilityModal } from "@/components/pets/PetAvailabilityModal";
import { DateChips } from "@/components/ui/DateChips";
import { useLanguage } from "@/context/LanguageContext";
import { buildPetAvailabilityCardPreview } from "@/lib/pet-availability-card";
import { speciesDisplayLabel } from "@/lib/pet-data";
import { placeholderPetImage } from "@/lib/images";
import type { Pet } from "@/lib/pets";
import type { SearchAvailabilityItem } from "@/lib/search-availability";

function LocationIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0 text-muted" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 3v4M16 3v4M3 10h18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0 opacity-70" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14 5h5v5M10 14 19 5M15 9h-4a2 2 0 0 0-2 2v7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.75" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

export function PetCard({
  pet,
  compact = false,
  onOpenAvailability,
}: {
  pet: Pet;
  compact?: boolean;
  onOpenAvailability?: (item: SearchAvailabilityItem) => void;
}) {
  const { locale } = useLanguage();
  const detailHref = `/pet/${pet.id}`;
  const [calendarOpen, setCalendarOpen] = useState(false);
  const availability = buildPetAvailabilityCardPreview(pet.availabilityDates, 3, locale);

  function openCalendar() {
    const item: SearchAvailabilityItem = {
      kind: "pet",
      id: pet.id,
      name: pet.name,
      dates: availability.allDates,
    };
    if (onOpenAvailability) {
      onOpenAvailability(item);
      return;
    }
    setCalendarOpen(true);
  }
  const tagline = pet.cardTagline ?? "";
  const speciesLabel = speciesDisplayLabel(pet.species, null);
  const metaParts = [pet.breed, pet.weightDisplayShort ?? pet.sizeLabel, pet.age].filter(
    (part) => part && part !== "—",
  );
  const metaLine = metaParts.join(" · ");
  const imageSrc = pet.image?.trim() ? pet.image : placeholderPetImage(pet.id);

  return (
    <>
      <article
        className={`group flex h-full flex-col overflow-hidden border border-black/[0.06] bg-surface shadow-[0_2px_16px_rgba(0,0,0,0.06)] transition-shadow duration-300 hover:shadow-[0_8px_28px_rgba(0,0,0,0.08)] ${
          compact ? "rounded-xl" : "rounded-2xl"
        }`}
      >
        <Link href={detailHref} className="relative block shrink-0 overflow-hidden">
          <div
            className={`relative w-full bg-mint/20 ${
              compact ? "h-[240px] max-h-[240px]" : "aspect-[4/3]"
            }`}
          >
            <AppImage
              src={imageSrc}
              alt={pet.name}
              seed={pet.id}
              fallbackEmoji={pet.emoji}
              fallbackCaption={`${pet.name} · ${pet.breed}`}
              sizes={
                compact
                  ? "(max-width: 640px) 100vw, 320px"
                  : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
              }
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <FavoriteButton
              target={{ type: "pet", id: pet.id }}
              className={`absolute z-20 ${compact ? "left-2 top-2" : "left-3 top-3"}`}
              compact
            />
            <span
              className={`absolute z-10 rounded-full bg-surface font-semibold capitalize text-foreground shadow-md ring-1 ring-border ${
                compact
                  ? "right-2 top-2 px-2 py-0.5 text-[0.65rem]"
                  : "right-3 top-3 px-3 py-1.5 text-xs"
              }`}
            >
              {speciesLabel}
            </span>
          </div>
        </Link>

        <div className={`flex flex-1 flex-col ${compact ? "gap-2 p-3" : "gap-2.5 p-4"}`}>
          <div>
            <h3
              className={`font-heading font-bold leading-tight text-foreground ${
                compact ? "text-base" : "text-lg sm:text-xl"
              }`}
            >
              {pet.name}
            </h3>
            {metaLine ? (
              <p className={`text-muted ${compact ? "mt-0.5 text-xs" : "mt-1 text-sm"}`}>{metaLine}</p>
            ) : null}
            {tagline ? (
              <p
                className={`line-clamp-2 leading-snug text-foreground/85 ${
                  compact ? "mt-1 text-xs" : "mt-2 text-sm"
                }`}
              >
                {tagline}
              </p>
            ) : null}
            {pet.location && pet.location !== "—" ? (
              <p
                className={`flex items-center gap-1.5 text-muted ${
                  compact ? "mt-1 text-xs" : "mt-2 text-sm"
                }`}
              >
                <LocationIcon />
                <span>{pet.location}</span>
              </p>
            ) : null}
          </div>

          <div className={`mt-auto border-t border-black/5 ${compact ? "space-y-1.5 pt-2" : "space-y-2 pt-3"}`}>
            <DateChips
              compact={compact}
              title={compact || !availability.hasDates ? undefined : "Available"}
              labels={availability.previewLabels}
              isos={availability.previewIsos}
              moreCount={availability.moreCount}
              emptyLabel="No upcoming dates"
            />

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openCalendar();
              }}
              className={`flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand-teal/25 bg-mint/35 font-semibold text-brand-teal transition-colors hover:bg-mint/55 ${
                compact ? "px-2.5 py-2 text-xs" : "gap-2 rounded-xl px-3 py-2.5 text-sm"
              }`}
            >
              <CalendarIcon />
              <span>Check calendar</span>
              <ExternalIcon />
            </button>

            <Link
              href={detailHref}
              className={`flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-teal font-semibold text-white shadow-md shadow-brand-teal/20 transition-colors hover:bg-brand-teal/90 ${
                compact ? "px-3 py-2 text-xs" : "gap-2 rounded-xl px-4 py-3 text-sm"
              }`}
            >
              <EyeIcon />
              <span>View pet</span>
            </Link>
          </div>
        </div>
      </article>

      {!onOpenAvailability ? (
        <PetAvailabilityModal
          open={calendarOpen}
          name={pet.name}
          petId={pet.id}
          dates={availability.allDates}
          subtitle="Dates when this pet is available for care."
          onClose={() => setCalendarOpen(false)}
        />
      ) : null}
    </>
  );
}
