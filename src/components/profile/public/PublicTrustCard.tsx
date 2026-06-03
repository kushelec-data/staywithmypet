"use client";

import { VerifiedBadge } from "@/components/trust/VerifiedBadge";
import { REVIEWS_SECTION_ID } from "@/components/reviews/ProfileRatingSummary";
import { useLanguage } from "@/context/LanguageContext";
import { PUBLIC_CARD, PUBLIC_SECTION_TITLE } from "@/lib/public-layout";
import { formatMemberSince, type PublicProfileView, type PublicTrustBadgeId } from "@/lib/public-profile";
import { formatTrustScoreDisplay } from "@/lib/trust-score";

type PublicTrustCardProps = {
  profile: PublicProfileView;
  reviewsAvg?: number;
  reviewsCount?: number;
};

const BADGE_ORDER: PublicTrustBadgeId[] = [
  "email_verified",
  "phone_verified",
  "profile_complete",
  "reviewed",
  "completed_bookings",
  "emergency_contact",
];

export function PublicTrustCard({
  profile,
  reviewsAvg = profile.rating_avg,
  reviewsCount = profile.rating_count,
}: PublicTrustCardProps) {
  const { t } = useLanguage();
  const ts = t.trustSafety;
  const memberSince = formatMemberSince(profile.created_at);
  const hasReviews = reviewsCount > 0;

  const badgeLabel = (id: PublicTrustBadgeId): string => {
    switch (id) {
      case "email_verified":
        return ts.trustBadgeEmail;
      case "phone_verified":
        return ts.trustBadgePhone;
      case "profile_complete":
        return ts.trustBadgeProfile;
      case "reviewed":
        return ts.trustBadgeReviewed;
      case "completed_bookings":
        return ts.trustBadgeBookings;
      case "emergency_contact":
        return ts.trustBadgeEmergency;
      default:
        return id;
    }
  };

  function scrollToReviews() {
    document.getElementById(REVIEWS_SECTION_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const badges = BADGE_ORDER.filter((id) => profile.trust_badges.includes(id));

  const trustScoreDisplay = formatTrustScoreDisplay(profile.trust_score_percent);

  return (
    <section className={`${PUBLIC_CARD} min-w-0 max-w-full`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={PUBLIC_SECTION_TITLE}>{ts.formSectionTitle}</h2>
        {profile.is_verified ? <VerifiedBadge /> : null}
      </div>

      <div className="mt-3 min-w-0 max-w-full rounded-xl bg-mint/20 px-3 py-2.5">
        <p className="text-xs font-medium text-muted">{ts.trustScoreTitle}</p>
        <p className="font-heading text-2xl font-semibold text-brand-teal">{trustScoreDisplay}</p>
        <div className="mt-2 flex min-w-0 flex-wrap gap-2 text-[0.7rem] font-semibold">
          <span className="rounded-full bg-surface px-2 py-0.5 text-muted">
            {ts.trustStatsBookings.replace("{n}", String(profile.completed_bookings_count))}
          </span>
          <button
            type="button"
            onClick={hasReviews ? scrollToReviews : undefined}
            className={`rounded-full px-2 py-0.5 ${
              hasReviews
                ? "bg-surface text-muted underline decoration-brand-teal/30 underline-offset-2"
                : "bg-black/5 text-muted"
            }`}
          >
            {ts.trustStatsReviews.replace("{n}", String(reviewsCount))}
          </button>
        </div>
      </div>

      <ul className="mt-3 flex flex-wrap gap-1.5">
        {badges.map((id) => (
          <li
            key={id}
            className="rounded-full bg-mint/35 px-2.5 py-0.5 text-[0.7rem] font-semibold text-brand-teal"
          >
            {badgeLabel(id)}
          </li>
        ))}
      </ul>

      {memberSince ? (
        <p className="mt-3 text-xs text-muted">
          <span className="font-medium text-foreground">Member since</span> {memberSince}
        </p>
      ) : null}
    </section>
  );
}
