"use client";

import { useState } from "react";
import Link from "next/link";
import { ExpandableBioText } from "@/components/profile/public/ExpandableBioText";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { PetAvailabilityModal } from "@/components/pets/PetAvailabilityModal";
import { DateChips } from "@/components/ui/DateChips";
import { useLanguage } from "@/context/LanguageContext";
import { buildPetAvailabilityCardPreview } from "@/lib/pet-availability-card";
import type { SearchProfile } from "@/lib/search-profiles";
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

export function OwnerCard({
  profile,
  compact = false,
  onOpenAvailability,
}: {
  profile: SearchProfile;
  compact?: boolean;
  onOpenAvailability?: (item: SearchAvailabilityItem) => void;
}) {
  const { locale, t } = useLanguage();
  const profileHref = `/users/${profile.id}`;
  const [calendarOpen, setCalendarOpen] = useState(false);
  const availability = buildPetAvailabilityCardPreview(profile.availabilityDates, 3, locale);

  function openCalendar() {
    const item: SearchAvailabilityItem = {
      kind: "profile",
      id: profile.id,
      name: profile.displayName,
      dates: availability.allDates,
    };
    if (onOpenAvailability) {
      onOpenAvailability(item);
      return;
    }
    setCalendarOpen(true);
  }
  const avatarSrc = profile.avatarUrl?.trim() ? profile.avatarUrl : null;

  return (
    <>
      <article
        className={`group flex h-full flex-col overflow-hidden border border-black/[0.06] bg-surface shadow-[0_2px_16px_rgba(0,0,0,0.06)] transition-shadow duration-300 hover:shadow-[0_8px_28px_rgba(0,0,0,0.08)] ${
          compact ? "rounded-xl" : "rounded-2xl"
        }`}
      >
        <Link href={profileHref} className="relative block shrink-0 overflow-hidden">
          <div
            className={`relative w-full bg-mint/20 ${
              compact ? "h-[240px] max-h-[240px]" : "aspect-[4/3]"
            }`}
          >
            <ProfileAvatar
              userId={profile.id}
              displayName={profile.displayName}
              avatarUrl={avatarSrc}
              size="xl"
              shape="rounded"
              sizes={compact ? "(max-width: 640px) 100vw, 320px" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"}
              className={`h-full w-full ${compact ? "max-h-[240px]" : "aspect-[4/3]"}`}
              imageClassName="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <FavoriteButton
              target={{ type: "friend", id: profile.id }}
              className={`absolute z-20 ${compact ? "left-2 top-2" : "left-3 top-3"}`}
              compact
            />
          </div>
        </Link>

        <div className={`flex flex-1 flex-col ${compact ? "gap-2 p-3" : "gap-2.5 p-4"}`}>
          <div>
            <h3
              className={`font-heading font-bold leading-tight text-foreground ${
                compact ? "text-base" : "text-lg sm:text-xl"
              }`}
            >
              {profile.displayName}
            </h3>
            {profile.location ? (
              <p
                className={`flex items-center gap-1.5 text-muted ${
                  compact ? "mt-1 text-xs" : "mt-1.5 text-sm"
                }`}
              >
                <LocationIcon />
                <span>{profile.location}</span>
              </p>
            ) : null}
            {profile.ratingCount > 0 ? (
              <p
                className={`font-medium text-brand-teal ${
                  compact ? "mt-1 text-xs" : "mt-1.5 text-sm"
                }`}
              >
                ★ {profile.ratingAvg.toFixed(1)} · {profile.ratingCount} review
                {profile.ratingCount === 1 ? "" : "s"}
              </p>
            ) : null}
            {profile.bio ? (
              <ExpandableBioText
                bio={profile.bio}
                collapsedLines={compact ? 2 : 3}
                textClassName={`leading-snug text-foreground/85 ${
                  compact ? "text-xs" : "text-sm"
                }`}
                className={compact ? "mt-1" : "mt-2"}
              />
            ) : null}
          </div>

          {profile.preferenceChips.length > 0 ? (
            <ul className={`flex flex-wrap ${compact ? "gap-1" : "gap-1.5"}`}>
              {profile.preferenceChips.map((chip) => (
                <li
                  key={chip}
                  className={`rounded-full border border-brand-teal/20 bg-mint/40 font-semibold text-brand-teal ${
                    compact ? "px-2 py-0.5 text-[0.65rem]" : "px-2.5 py-0.5 text-[0.7rem]"
                  }`}
                >
                  {chip}
                </li>
              ))}
            </ul>
          ) : null}

          <div className={`mt-auto border-t border-black/5 ${compact ? "space-y-1.5 pt-2" : "space-y-2 pt-3"}`}>
            <DateChips
              compact={compact}
              title={compact || !availability.hasDates ? undefined : "Available"}
              labels={availability.previewLabels}
              isos={availability.previewIsos}
              moreCount={availability.moreCount}
              emptyLabel="No upcoming dates"
            />

            <Link
              href={profileHref}
              className={`flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-teal font-semibold text-white shadow-md shadow-brand-teal/20 transition-colors hover:bg-brand-teal/90 ${
                compact ? "px-3 py-2 text-xs" : "gap-2 rounded-xl px-4 py-3 text-sm"
              }`}
            >
              <EyeIcon />
              <span>View profile</span>
            </Link>
          </div>
        </div>
      </article>

      {!onOpenAvailability ? (
        <PetAvailabilityModal
          open={calendarOpen}
          name={profile.displayName}
          petFriendId={profile.id}
          dates={availability.allDates}
          onClose={() => setCalendarOpen(false)}
        />
      ) : null}
    </>
  );
}
