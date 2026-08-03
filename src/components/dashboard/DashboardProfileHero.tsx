"use client";

import dynamic from "next/dynamic";
import { ProfileVerificationBadges } from "@/components/trust/ProfileVerificationBadges";
import { ProfileRatingSummary } from "@/components/reviews/ProfileRatingSummary";
import { heroTrustBadgesFromProfileRow } from "@/lib/public-profile";
import { Button } from "@/components/ui/Button";
import { formatActiveMode, resolveActiveMode, type ProfileActiveMode } from "@/lib/profile-mode";
import type { ProfileRow } from "@/lib/profile-utils";
import { absolutePublicProfileUrl } from "@/lib/site-url";
import { useLanguage } from "@/context/LanguageContext";
import {
  DASHBOARD_CARD_CLASS,
  DASHBOARD_COLORS,
  DASHBOARD_PROGRESS_FILL_CLASS,
  DASHBOARD_PROGRESS_TRACK_CLASS,
  DASHBOARD_SCORE_TEXT_CLASS,
  dashboardProgressFillClass,
} from "@/lib/dashboard-theme";
import type { ProfileCompleteness } from "@/lib/profile-completeness";
import { isPetFriendFindCareListingEligible } from "@/lib/profile-required-fields";
import { Copy } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const ReviewsListModal = dynamic(
  () =>
    import("@/components/reviews/ReviewsListModal").then((mod) => ({
      default: mod.ReviewsListModal,
    })),
  { ssr: false },
);

type DashboardProfileHeroProps = {
  profile: ProfileRow;
  displayName: string;
  email?: string | null;
  publicProfileHref: string;
  activeMode: ProfileActiveMode;
  completeness: ProfileCompleteness;
  reviewsAvg?: number;
  reviewsCount?: number;
};

function profileIsVisibleInSearch(
  profile: ProfileRow,
  activeMode: ProfileActiveMode,
  marketplaceReady: boolean,
): boolean {
  if (activeMode === "pet_friend") {
    return isPetFriendFindCareListingEligible({
      display_name: profile.display_name,
      location: profile.location,
      public_location: profile.public_location,
      city: profile.city,
      country: profile.country,
      google_place_id: profile.google_place_id,
      latitude: profile.latitude,
      longitude: profile.longitude,
      is_public: profile.is_public,
      role: profile.role,
      details: profile.details,
    });
  }
  return marketplaceReady;
}

export function DashboardProfileHero({
  profile,
  displayName,
  publicProfileHref,
  activeMode,
  completeness,
  reviewsAvg = 0,
  reviewsCount = 0,
}: DashboardProfileHeroProps) {
  const { t } = useLanguage();
  const dh = t.dashboardHome;
  const vis = dh.profileVisibility;
  const fieldLabels = t.profileRequiredFields.items;
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roleLabel = formatActiveMode(resolveActiveMode(profile.role, profile.active_mode), t.roles);
  const locationLabel = profile.location?.trim() || dh.addLocationInProfile;
  const heroTrustBadges = heroTrustBadgesFromProfileRow(profile);

  const isVisibleInSearch = useMemo(
    () => profileIsVisibleInSearch(profile, activeMode, completeness.marketplaceReady),
    [profile, activeMode, completeness.marketplaceReady],
  );

  const missingCount = completeness.missing.length;
  const visibleMissing = completeness.missing.slice(0, 3);
  const extraMissingCount = Math.max(0, missingCount - visibleMissing.length);
  const progressPercent = isVisibleInSearch ? 100 : completeness.percent;

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const copyPublicLink = useCallback(async () => {
    const url = absolutePublicProfileUrl(profile.id);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt(dh.copyLinkPrompt, url);
    }
  }, [profile.id, dh.copyLinkPrompt]);

  return (
    <section className={`${DASHBOARD_CARD_CLASS} relative overflow-hidden`}>
      <div
        className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:p-5"
        style={{
          background: `linear-gradient(to bottom right, ${DASHBOARD_COLORS.cardBg}, ${DASHBOARD_COLORS.cardBg}, ${DASHBOARD_COLORS.light})`,
        }}
      >
        <span
          className={`absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide sm:right-5 sm:top-5 ${
            isVisibleInSearch
              ? "border-[#2E6B3F]/25 bg-[#2E6B3F]/10 text-[#2E6B3F]"
              : "border-[#C45C5C]/25 bg-[#C45C5C]/10 text-[#9E3D3D]"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              isVisibleInSearch ? "bg-[#2E6B3F]" : "bg-[#C45C5C]"
            }`}
            aria-hidden
          />
          {isVisibleInSearch ? vis.public : vis.hidden}
        </span>

        <div className="min-w-0 flex-1 pr-16 sm:pr-24">
          <ProfileVerificationBadges trustBadges={heroTrustBadges} className="mb-1.5" />
          <p
            className={`${DASHBOARD_SCORE_TEXT_CLASS} text-[0.65rem] font-semibold uppercase tracking-wider`}
          >
            {roleLabel}
          </p>
          <h2 className="break-words text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {displayName}
          </h2>

          {isVisibleInSearch ? (
            <div className="mt-2 space-y-0.5">
              <p className="text-sm font-medium text-[#2E6B3F]">{vis.congratsTitle}</p>
              <p className="text-sm text-muted">{vis.congratsBody}</p>
            </div>
          ) : (
            <div className="mt-2 space-y-0.5">
              {missingCount > 0 ? (
                <p className="text-sm font-medium text-foreground">
                  {missingCount === 1
                    ? vis.stepsRemainingOne
                    : vis.stepsRemainingMany.replace("{count}", String(missingCount))}
                </p>
              ) : null}
              <p className="text-xs text-muted">{vis.encouragement}</p>
            </div>
          )}

          <div className="mt-3 max-w-md">
            <div
              className={`${DASHBOARD_PROGRESS_TRACK_CLASS} h-1 overflow-hidden`}
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={vis.percentComplete.replace("{percent}", String(progressPercent))}
            >
              <div
                className={`h-full ${DASHBOARD_PROGRESS_FILL_CLASS} ${dashboardProgressFillClass(progressPercent)}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className={`${DASHBOARD_SCORE_TEXT_CLASS} mt-1 text-[0.7rem] font-medium`}>
              {vis.percentComplete.replace("{percent}", String(progressPercent))}
            </p>
          </div>

          {!isVisibleInSearch && missingCount > 0 ? (
            <div className="mt-2.5 text-sm">
              <p className="text-xs font-medium text-muted">{vis.missingHeading}</p>
              <ul className="mt-1 space-y-0.5 text-foreground">
                {visibleMissing.map((field) => (
                  <li key={field.id} className="flex items-start gap-1.5 text-sm">
                    <span className="text-muted" aria-hidden>
                      •
                    </span>
                    <span>{fieldLabels[field.id]}</span>
                  </li>
                ))}
              </ul>
              {extraMissingCount > 0 ? (
                <p className="mt-1 text-xs text-muted">
                  {vis.moreMissing.replace("{count}", String(extraMissingCount))}
                </p>
              ) : null}
            </div>
          ) : null}

          <p className="mt-2 truncate text-sm text-muted">{locationLabel}</p>
          <ProfileRatingSummary
            ratingAvg={reviewsAvg}
            reviewCount={reviewsCount}
            onOpenModal={() => setReviewsOpen(true)}
          />
        </div>

        <div className="flex w-full min-w-0 shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-start sm:justify-end sm:pt-6">
          {isVisibleInSearch ? (
            <div className="inline-flex items-center gap-1">
              <Button href={publicProfileHref} size="sm">
                {vis.viewPublicProfile}
              </Button>
              <button
                type="button"
                onClick={() => void copyPublicLink()}
                title={copied ? dh.linkCopied : dh.copyPublicLink}
                aria-label={copied ? dh.linkCopied : dh.copyPublicLink}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E5E2D8] bg-[#F8F6F1] text-muted transition-colors hover:border-[#2E6B3F] hover:text-[#2E6B3F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E6B3F]"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          ) : (
            <Button href="/profile/edit" size="sm">
              {vis.completeProfile}
            </Button>
          )}
        </div>
      </div>

      {copied ? (
        <p
          className={`${DASHBOARD_SCORE_TEXT_CLASS} border-t border-[#E5E2D8] px-4 pb-3 pt-2 text-xs font-medium sm:px-5`}
          role="status"
        >
          {dh.linkCopiedClipboard}
        </p>
      ) : null}

      {reviewsOpen ? (
        <ReviewsListModal
          open={reviewsOpen}
          profileId={profile.id}
          displayName={displayName}
          onClose={() => setReviewsOpen(false)}
        />
      ) : null}
    </section>
  );
}
