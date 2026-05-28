"use client";

import { useState } from "react";
import Link from "next/link";
import { AppImage } from "@/components/ui/AppImage";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { PetAvailabilityModal } from "@/components/pets/PetAvailabilityModal";
import { DateChips } from "@/components/ui/DateChips";
import { useLanguage } from "@/context/LanguageContext";
import { buildPetAvailabilityCardPreview } from "@/lib/pet-availability-card";
import { placeholderPetImage, placeholderProfileImage } from "@/lib/images";
import type { Pet } from "@/lib/pets";
import type { SearchAvailabilityItem } from "@/lib/search-availability";
import type { SearchProfile } from "@/lib/search-profiles";

function LocationIcon() {
  return (
    <svg className="h-3 w-3 shrink-0 text-muted" viewBox="0 0 24 24" fill="none" aria-hidden>
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
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 3v4M16 3v4M3 10h18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function cardShellClass(selected: boolean): string {
  return `flex w-full min-w-0 gap-2.5 rounded-xl border p-2.5 text-left transition-colors ${
    selected
      ? "border-brand-teal bg-mint/30 shadow-sm"
      : "border-black/[0.06] bg-surface hover:border-brand-teal/30"
  }`;
}

type SearchMapPetCardProps = {
  pet: Pet;
  selected?: boolean;
  onSelect?: () => void;
  onOpenAvailability?: (item: SearchAvailabilityItem) => void;
};

export function SearchMapPetCard({
  pet,
  selected = false,
  onSelect,
  onOpenAvailability,
}: SearchMapPetCardProps) {
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
  const metaParts = [pet.breed, pet.weightDisplayShort ?? pet.sizeLabel, pet.age].filter(
    (part) => part && part !== "—",
  );
  const metaLine = metaParts.join(" · ");
  const imageSrc = pet.image?.trim() ? pet.image : placeholderPetImage(pet.id);

  return (
    <>
      <article
        id={`map-card-pet-${pet.id}`}
        className={cardShellClass(selected)}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect?.();
          }
        }}
        role={onSelect ? "button" : undefined}
        tabIndex={onSelect ? 0 : undefined}
        aria-pressed={onSelect ? selected : undefined}
      >
        <Link
          href={detailHref}
          className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg bg-mint/20"
          onClick={(e) => e.stopPropagation()}
        >
          <AppImage
            src={imageSrc}
            alt={pet.name}
            seed={pet.id}
            fallbackEmoji={pet.emoji}
            fallbackCaption={pet.name}
            sizes="72px"
            className="h-full w-full object-cover"
          />
          <FavoriteButton
            target={{ type: "pet", id: pet.id }}
            className="absolute left-1 top-1 z-10"
            compact
          />
        </Link>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="min-w-0">
            <h3 className="truncate font-heading text-sm font-bold text-foreground">{pet.name}</h3>
            {metaLine ? <p className="truncate text-xs text-muted">{metaLine}</p> : null}
            {pet.location && pet.location !== "—" ? (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                <LocationIcon />
                <span className="truncate">{pet.location}</span>
              </p>
            ) : null}
          </div>

          <DateChips
            compact
            labels={availability.previewLabels}
            isos={availability.previewIsos}
            moreCount={availability.moreCount}
            emptyLabel="No upcoming dates"
          />

          <div className="mt-auto flex flex-wrap gap-1">
            <Link
              href={detailHref}
              className="inline-flex flex-1 items-center justify-center rounded-lg bg-brand-teal px-2 py-1.5 text-[0.7rem] font-semibold text-white hover:bg-brand-teal/90"
              onClick={(e) => e.stopPropagation()}
            >
              View pet
            </Link>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openCalendar();
              }}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-brand-teal/25 bg-mint/35 px-2 py-1.5 text-[0.7rem] font-semibold text-brand-teal hover:bg-mint/55"
            >
              <CalendarIcon />
              Calendar
            </button>
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

type SearchMapFriendCardProps = {
  profile: SearchProfile;
  selected?: boolean;
  onSelect?: () => void;
  onOpenAvailability?: (item: SearchAvailabilityItem) => void;
};

export function SearchMapFriendCard({
  profile,
  selected = false,
  onSelect,
  onOpenAvailability,
}: SearchMapFriendCardProps) {
  const { locale } = useLanguage();
  const profileHref = `/users/${profile.id}`;
  const availability = buildPetAvailabilityCardPreview(profile.availabilityDates, 3, locale);

  const avatarSrc = profile.avatarUrl?.trim()
    ? profile.avatarUrl
    : placeholderProfileImage(profile.id);
  const careBadges = profile.preferenceChips.slice(0, 3);

  return (
    <>
      <article
        id={`map-card-profile-${profile.id}`}
        className={cardShellClass(selected)}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect?.();
          }
        }}
        role={onSelect ? "button" : undefined}
        tabIndex={onSelect ? 0 : undefined}
        aria-pressed={onSelect ? selected : undefined}
      >
        <Link
          href={profileHref}
          className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-mint/20"
          onClick={(e) => e.stopPropagation()}
        >
          <AppImage
            src={avatarSrc}
            alt={profile.displayName}
            seed={profile.id}
            fallbackCaption={profile.displayName}
            fallbackEmoji="🐾"
            sizes="56px"
            className="h-full w-full object-cover"
          />
          <FavoriteButton
            target={{ type: "friend", id: profile.id }}
            className="absolute -left-0.5 -top-0.5 z-10"
            compact
          />
        </Link>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="min-w-0">
            <h3 className="truncate font-heading text-sm font-bold text-foreground">
              {profile.displayName}
            </h3>
            {profile.location ? (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                <LocationIcon />
                <span className="truncate">{profile.location}</span>
              </p>
            ) : null}
            {profile.ratingCount > 0 ? (
              <p className="mt-0.5 text-xs font-medium text-brand-teal">
                ★ {profile.ratingAvg.toFixed(1)} · {profile.ratingCount} review
                {profile.ratingCount === 1 ? "" : "s"}
              </p>
            ) : null}
            {profile.bio ? (
              <p className="mt-1 line-clamp-2 text-xs leading-snug text-foreground/85">{profile.bio}</p>
            ) : null}
          </div>

          {careBadges.length > 0 ? (
            <ul className="flex flex-wrap gap-1">
              {careBadges.map((chip) => (
                <li
                  key={chip}
                  className="rounded-full border border-brand-teal/20 bg-mint/40 px-2 py-0.5 text-[0.65rem] font-semibold text-brand-teal"
                >
                  {chip}
                </li>
              ))}
            </ul>
          ) : null}

          <DateChips
            compact
            labels={availability.previewLabels}
            isos={availability.previewIsos}
            moreCount={availability.moreCount}
            emptyLabel="No upcoming dates"
          />

          <div className="mt-auto flex flex-wrap gap-1">
            <Link
              href={profileHref}
              className="inline-flex flex-1 items-center justify-center rounded-lg bg-brand-teal px-2 py-1.5 text-[0.7rem] font-semibold text-white hover:bg-brand-teal/90"
              onClick={(e) => e.stopPropagation()}
            >
              View profile
            </Link>
          </div>
        </div>
      </article>
    </>
  );
}
