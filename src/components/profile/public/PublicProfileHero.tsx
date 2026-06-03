import { AppImage } from "@/components/ui/AppImage";
import { ProfileRatingSummary } from "@/components/reviews/ProfileRatingSummary";
import { placeholderProfileImage } from "@/lib/images";
import { PublicProfileChips } from "@/components/public/PublicProfileChips";
import { ProfileVerificationBadges } from "@/components/trust/ProfileVerificationBadges";
import { VerifiedBadge } from "@/components/trust/VerifiedBadge";
import { formatProfileRoleBadge } from "@/lib/profile-mode";
import type { PublicProfileView } from "@/lib/public-profile";
import { profileInitials } from "@/lib/profile-utils";

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
  const initials = profileInitials(profile.display_name, null);
  const chips = [
    formatProfileRoleBadge(profile.role),
    ...(profile.nearbyLocation ? [profile.nearbyLocation] : []),
    ...(profile.languages.length ? [profile.languages.slice(0, 2).join(", ")] : []),
  ].filter(Boolean);
  const avatarSrc = profile.avatar_url?.trim()
    ? profile.avatar_url
    : placeholderProfileImage(profile.id);

  return (
    <section className="card-elevated overflow-hidden rounded-2xl">
      <div className="bg-gradient-to-br from-mint/40 via-surface to-lavender/20 p-4 sm:p-5">
        <div className="flex gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl ring-2 ring-white/80 shadow-sm sm:h-[4.5rem] sm:w-[4.5rem]">
            <AppImage
              src={avatarSrc}
              alt={profile.display_name}
              seed={profile.id}
              fallbackCaption={profile.display_name}
              fallbackEmoji={initials}
              sizes="72px"
              className="object-cover"
            />
          </div>

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
          <p className="mt-4 max-w-prose text-sm leading-relaxed text-foreground/90">{profile.bio}</p>
        ) : null}
      </div>
    </section>
  );
}
