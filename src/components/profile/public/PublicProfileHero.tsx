"use client";

import { AppImage } from "@/components/ui/AppImage";
import { ProfileRatingSummary } from "@/components/reviews/ProfileRatingSummary";
import { ExpandableBioText } from "@/components/profile/public/ExpandableBioText";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { resolveAvatarPosition } from "@/lib/photo-position";
import { useLanguage } from "@/context/LanguageContext";
import { PublicProfileChips } from "@/components/public/PublicProfileChips";
import { ProfileVerificationBadges } from "@/components/trust/ProfileVerificationBadges";
import { VerifiedBadge } from "@/components/trust/VerifiedBadge";
import { formatProfileLanguagesForDisplay } from "@/lib/profile-languages";
import { formatProfileRoleBadge } from "@/lib/profile-mode";
import type { PublicProfileView } from "@/lib/public-profile";

type PublicProfileHeroProps = {
  profile: PublicProfileView;
  reviewsAvg?: number;
  reviewsCount?: number;
};

export function PublicProfileHero({
  profile,
  reviewsAvg = profile.rating_avg,
  reviewsCount = profile.rating_count,
}: PublicProfileHeroProps) {
  const { t, locale } = useLanguage();
  const languageLabels = formatProfileLanguagesForDisplay(
    profile.languages,
    profile.details?.languages_other,
    locale,
  );
  const chips = [
    formatProfileRoleBadge(profile.role, t.roles),
    ...(profile.nearbyLocation ? [profile.nearbyLocation] : []),
    ...(languageLabels.length
      ? [languageLabels.slice(0, 2).filter(Boolean).join(", ")]
      : []),
  ].filter(Boolean);

  return (
    <section className="card-elevated overflow-hidden rounded-2xl">
      <div className="bg-gradient-to-br from-mint/40 via-surface to-lavender/20 p-4 sm:p-5">
        <div className="flex gap-4">
          <ProfileAvatar
            userId={profile.id}
            displayName={profile.display_name}
            avatarUrl={profile.avatar_url}
            avatarPosition={resolveAvatarPosition(profile.avatar_url, profile.details)}
            size="md"
            shape="rounded-xl"
            sizes="72px"
            imageClassName="object-cover ring-2 ring-white/80 shadow-sm"
            className="ring-2 ring-white/80 shadow-sm"
          />

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {profile.is_verified ? <VerifiedBadge /> : null}
              <ProfileVerificationBadges trustBadges={profile.trust_badges} />
            </div>

            <h1 className="font-heading mt-1.5 text-xl font-semibold text-foreground sm:text-2xl">
              {profile.display_name}
            </h1>

            <div className="mt-1">
              <ProfileRatingSummary
                ratingAvg={reviewsAvg}
                reviewCount={reviewsCount}
                scrollToSection
                className="!text-sm"
              />
            </div>

            <div className="mt-2">
              <PublicProfileChips chips={chips} />
            </div>
          </div>
        </div>

        {profile.bio ? (
          <ExpandableBioText bio={profile.bio} className="mt-4 max-w-prose" />
        ) : null}
      </div>
    </section>
  );
}
