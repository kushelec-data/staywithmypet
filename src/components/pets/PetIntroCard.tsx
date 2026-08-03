"use client";

import { PositionedPhoto } from "@/components/media/PositionedPhoto";
import { AppImage } from "@/components/ui/AppImage";
import { useLanguage } from "@/context/LanguageContext";
import { AvailabilityDateChips } from "@/components/ui/AvailabilityDateChips";
import Link from "next/link";
import { petIntroMainPhotoUrl, type PetIntroDisplay } from "@/lib/pet-intro";
import { speciesEmoji } from "@/lib/pet-data";
import { publicPetHref } from "@/lib/public-pet";
import {
  DASHBOARD_CARD_INNER_CLASS,
  DASHBOARD_COLORS,
  DASHBOARD_LINK_CLASS,
} from "@/lib/dashboard-theme";

type PetIntroCardProps = {
  pet: PetIntroDisplay;
  editHref?: string;
  publicProfileHref?: string;
  detailsHref?: string;
  detailsLabel?: string;
  variant?: "dashboard" | "public" | "list";
};

const MAIN_DASHBOARD_PX = 68;
const MAIN_DEFAULT_PX = 80;
const THUMB_PX = 36;

function availabilityManageLabel(pet: PetIntroDisplay): string | null {
  if (pet.availabilityDates.length === 0) return null;
  return pet.isActive ? "Availability active" : "Availability configured";
}

export function PetIntroCard({
  pet,
  editHref,
  publicProfileHref,
  detailsHref,
  detailsLabel = "View pet details",
  variant = "dashboard",
}: PetIntroCardProps) {
  const { t } = useLanguage();
  const dh = t.dashboardHome;
  const ppp = t.petPublicProfile;
  const isDashboard = variant === "dashboard";
  const isList = variant === "list";
  const isPublic = variant === "public";
  const compactOverview = isDashboard || isPublic;
  const showManageLinks = isDashboard || isList;
  const publicHref = publicProfileHref ?? publicPetHref(pet.id);
  const editLink = editHref ?? (showManageLinks ? `/pets/${pet.id}/edit` : undefined);
  const lines = compactOverview ? pet.compactLines.slice(0, 2) : pet.compactLines;

  return (
    <article
      className={`flex gap-2.5 rounded-xl p-2.5 sm:items-center ${
        isDashboard ? DASHBOARD_CARD_INNER_CLASS : "border border-black/5 bg-surface/90"
      }`}
    >
      <PetCompactPhotos pet={pet} dashboard={isDashboard} />

      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">{pet.name}</h3>
          {!pet.isActive ? (
            <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-[0.6rem] font-medium text-muted">
              Hidden
            </span>
          ) : variant === "list" && pet.isActive ? (
            <span className="rounded-full bg-mint/50 px-1.5 py-0.5 text-[0.6rem] font-medium text-brand-teal">
              Listed
            </span>
          ) : null}
        </div>

        {lines.length ? (
          <div className="space-y-0.5">
            {lines.map((line) => (
              <p key={line} className="line-clamp-1 text-xs leading-snug text-muted">
                {line}
              </p>
            ))}
          </div>
        ) : pet.availabilityDates.length === 0 ? (
          <p className="text-xs text-muted">Care details not added yet.</p>
        ) : null}

        {isPublic && pet.availabilityDates.length > 0 ? (
          <AvailabilityDateChips
            dates={pet.availabilityDates}
            label="Available"
            className="pt-0.5"
            tone={isDashboard ? "dashboard" : "default"}
          />
        ) : null}

        {!isPublic && availabilityManageLabel(pet) ? (
          <p className="pt-0.5 text-xs font-medium text-[#2E6B3F]">{availabilityManageLabel(pet)}</p>
        ) : null}

        {showManageLinks ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-0.5">
            <Link
              href={publicHref}
              className={isDashboard ? `${DASHBOARD_LINK_CLASS} text-xs` : "text-xs font-semibold text-brand-teal hover:text-brand-pink"}
            >
              {ppp.viewPublicProfile} →
            </Link>
            {editLink ? (
              <Link
                href={editLink}
                className={isDashboard ? `${DASHBOARD_LINK_CLASS} text-xs` : "text-xs font-semibold text-brand-teal hover:text-brand-pink"}
              >
                {dh.editPet} →
              </Link>
            ) : null}
          </div>
        ) : isPublic && detailsHref ? (
          <Link
            href={detailsHref}
            className="inline-block text-xs font-semibold text-brand-teal hover:text-brand-pink"
          >
            {detailsLabel === "View pet details" ? ppp.viewPublicProfile : detailsLabel} →
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function PetCompactPhotos({ pet, dashboard }: { pet: PetIntroDisplay; dashboard?: boolean }) {
  const mainPx = dashboard ? MAIN_DASHBOARD_PX : MAIN_DEFAULT_PX;
  const mainUrl = petIntroMainPhotoUrl(pet);
  const extraUrls = pet.photoUrls.filter((url) => url && url !== mainUrl).slice(0, 2);

  return (
    <div className="flex shrink-0 items-center gap-1">
      <div
        className={`relative overflow-hidden rounded-lg ring-1 ${
          dashboard ? "ring-[#E5E2D8]" : "bg-mint/25 ring-black/5"
        }`}
        style={{
          width: mainPx,
          height: mainPx,
          ...(dashboard ? { backgroundColor: DASHBOARD_COLORS.light } : {}),
        }}
      >
        <PositionedPhoto
          src={mainUrl}
          alt={pet.name}
          seed={pet.id}
          position={pet.primaryPhotoPosition}
          fallbackEmoji={speciesEmoji(pet.species)}
          fallbackCaption={pet.name}
          sizes={`${mainPx}px`}
          className="h-full w-full"
        />
      </div>
      {extraUrls.length > 0 && !dashboard ? (
        <ul className="hidden gap-1 sm:flex sm:flex-col" aria-hidden>
          {extraUrls.map((url, i) => (
            <li
              key={`${url}-${i}`}
              className="relative overflow-hidden rounded-md bg-mint/20 ring-1 ring-black/5"
              style={{ width: THUMB_PX, height: THUMB_PX }}
            >
              <PositionedPhoto
                src={url}
                alt=""
                seed={`${pet.id}-extra-${i}`}
                position={pet.photoPositions[url]}
                fallbackEmoji={speciesEmoji(pet.species)}
                sizes={`${THUMB_PX}px`}
                className="h-full w-full"
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
