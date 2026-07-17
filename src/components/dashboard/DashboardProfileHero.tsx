"use client";

import { ProfileVerificationBadges } from "@/components/trust/ProfileVerificationBadges";
import { ProfileRatingSummary } from "@/components/reviews/ProfileRatingSummary";
import { heroTrustBadgesFromProfileRow } from "@/lib/public-profile";
import { ReviewsListModal } from "@/components/reviews/ReviewsListModal";
import { Button } from "@/components/ui/Button";
import { formatActiveMode, resolveActiveMode } from "@/lib/profile-mode";
import type { ProfileRow } from "@/lib/profile-utils";
import { absolutePublicProfileUrl } from "@/lib/site-url";
import { useLanguage } from "@/context/LanguageContext";
import {
  DASHBOARD_CARD_CLASS,
  DASHBOARD_COLORS,
  DASHBOARD_SCORE_TEXT_CLASS,
} from "@/lib/dashboard-theme";
import { Copy } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type DashboardProfileHeroProps = {
  profile: ProfileRow;
  displayName: string;
  email?: string | null;
  publicProfileHref: string;
  isPublic: boolean;
  reviewsAvg?: number;
  reviewsCount?: number;
};

export function DashboardProfileHero({
  profile,
  displayName,
  publicProfileHref,
  isPublic,
  reviewsAvg = 0,
  reviewsCount = 0,
}: DashboardProfileHeroProps) {
  const { t } = useLanguage();
  const dh = t.dashboardHome;
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roleLabel = formatActiveMode(resolveActiveMode(profile.role, profile.active_mode), t.roles);
  const locationLabel = profile.location?.trim() || dh.addLocationInProfile;
  const heroTrustBadges = heroTrustBadgesFromProfileRow(profile);

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
    <section className={`${DASHBOARD_CARD_CLASS} overflow-hidden`}>
      <div
        className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:p-5"
        style={{
          background: `linear-gradient(to bottom right, ${DASHBOARD_COLORS.cardBg}, ${DASHBOARD_COLORS.cardBg}, ${DASHBOARD_COLORS.light})`,
        }}
      >
        <div className="min-w-0 flex-1">
          <ProfileVerificationBadges trustBadges={heroTrustBadges} className="mb-1.5" />
          <p
            className={`${DASHBOARD_SCORE_TEXT_CLASS} text-[0.65rem] font-semibold uppercase tracking-wider`}
          >
            {roleLabel}
          </p>
          <h2 className="break-words text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {displayName}
          </h2>
          <p className="mt-0.5 truncate text-sm text-muted">{locationLabel}</p>
          <ProfileRatingSummary
            ratingAvg={reviewsAvg}
            reviewCount={reviewsCount}
            onOpenModal={() => setReviewsOpen(true)}
          />
        </div>

        <div className="flex w-full min-w-0 shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-start sm:justify-end">
          <Button href="/profile/edit" size="sm">
            {dh.editProfile}
          </Button>
          {isPublic ? (
            <div className="inline-flex items-center gap-1">
              <Button href={publicProfileHref} variant="outline" size="sm">
                {dh.publicProfile}
              </Button>
              <button
                type="button"
                onClick={() => void copyPublicLink()}
                title={copied ? dh.linkCopied : dh.copyPublicLink}
                aria-label={copied ? dh.linkCopied : dh.copyPublicLink}
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E5E2D8] bg-[#F8F6F1] text-muted transition-colors hover:border-[#2E6B3F] hover:text-[#2E6B3F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E6B3F]`}
              >
                <Copy className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          ) : (
            <Button href="/profile/edit" variant="outline" size="sm">
              {dh.goPublic}
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

      <ReviewsListModal
        open={reviewsOpen}
        profileId={profile.id}
        displayName={displayName}
        onClose={() => setReviewsOpen(false)}
      />
    </section>
  );
}
