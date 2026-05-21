"use client";

import { ProfileRatingSummary } from "@/components/reviews/ProfileRatingSummary";
import { ReviewsListModal } from "@/components/reviews/ReviewsListModal";
import { Button } from "@/components/ui/Button";
import { formatActiveMode, resolveActiveMode } from "@/lib/profile-mode";
import { profileInitials, type ProfileRow } from "@/lib/profile-utils";
import { absolutePublicProfileUrl } from "@/lib/site-url";
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
  email,
  publicProfileHref,
  isPublic,
  reviewsAvg = 0,
  reviewsCount = 0,
}: DashboardProfileHeroProps) {
  const initials = profileInitials(displayName, email);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roleLabel = formatActiveMode(resolveActiveMode(profile.role, profile.active_mode));
  const locationLabel = profile.location?.trim() || "Add location in profile";

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
      window.prompt("Copy your public profile link:", url);
    }
  }, [profile.id]);

  return (
    <section className="swmp-warm-card overflow-hidden rounded-3xl">
      <div className="flex flex-col gap-4 bg-gradient-to-br from-swmp-warm-surface via-swmp-warm-card to-mint/25 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-center gap-4">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-2 ring-white/80 sm:h-[4.5rem] sm:w-[4.5rem]"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-lavender/60 text-xl font-semibold text-brand-teal sm:h-[4.5rem] sm:w-[4.5rem]">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-brand-teal">
              {roleLabel}
            </p>
            <h2 className="break-words text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {displayName}
            </h2>
            <p className="mt-0.5 truncate text-sm text-muted">{locationLabel}</p>
            <ProfileRatingSummary
              ratingAvg={reviewsAvg}
              reviewCount={reviewsCount}
              onOpenModal={() => setReviewsOpen(true)}
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          <Button href="/profile/edit" size="sm">
            Edit profile
          </Button>
          {isPublic ? (
            <div className="inline-flex items-center gap-1">
              <Button href={publicProfileHref} variant="outline" size="sm">
                Public profile
              </Button>
              <button
                type="button"
                onClick={() => void copyPublicLink()}
                title={copied ? "Link copied" : "Copy public profile link"}
                aria-label={copied ? "Link copied" : "Copy public profile link"}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-swmp-warm-border bg-white/80 text-muted transition-colors hover:border-brand-teal/40 hover:text-brand-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          ) : (
            <Button href="/profile/edit" variant="outline" size="sm">
              Go public
            </Button>
          )}
        </div>
      </div>

      {copied ? (
        <p className="border-t border-swmp-warm-border/60 px-4 pb-3 pt-2 text-xs font-medium text-brand-teal sm:px-5" role="status">
          Link copied to clipboard
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
