"use client";

import { AccountEmptyState } from "@/components/account/AccountEmptyState";
import { ReviewCard } from "@/components/reviews/ReviewCard";
import { REVIEWS_SECTION_ID } from "@/components/reviews/ProfileRatingSummary";
import { useLanguage } from "@/context/LanguageContext";
import { reviewTypeHeading, summarizeReviews, type ReviewDisplay } from "@/lib/reviews";
import { useMemo } from "react";

type PublicProfileReviewsProps = {
  reviews: ReviewDisplay[];
  loading: boolean;
  /** Fallback when reviews have not loaded yet */
  ratingAvg?: number;
  ratingCount?: number;
  compact?: boolean;
};

export function PublicProfileReviews({
  reviews,
  loading,
  ratingAvg: fallbackAvg = 0,
  ratingCount: fallbackCount = 0,
  compact = false,
}: PublicProfileReviewsProps) {
  const { t } = useLanguage();
  const r = t.reviews;

  const typeLabels = useMemo(
    () => ({ parentFriend: r.typeParentFriend, friendPet: r.typeFriendPet }),
    [r.typeFriendPet, r.typeParentFriend],
  );

  const { ratingAvg: computedAvg, ratingCount: computedCount } = summarizeReviews(reviews);
  const ratingAvg = reviews.length > 0 ? computedAvg : fallbackAvg;
  const ratingCount = reviews.length > 0 ? computedCount : fallbackCount;
  const showTypeHeadings = new Set(reviews.map((rev) => rev.reviewType)).size > 1;

  const sectionClass = compact
    ? "card-elevated scroll-mt-24 rounded-2xl p-4 sm:p-5"
    : "card-elevated scroll-mt-28 rounded-3xl p-5 sm:p-6";

  return (
    <section id={REVIEWS_SECTION_ID} className={sectionClass}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-base font-semibold text-foreground">{r.sectionTitle}</h2>
        {ratingCount > 0 ? (
          <p className="text-sm font-medium text-brand-teal">
            ★ {ratingAvg.toFixed(1)} · {ratingCount}{" "}
            {ratingCount === 1 ? r.reviewSingular : r.reviewPlural}
          </p>
        ) : null}
      </div>

      {loading ? (
        <p className="mt-3 text-sm text-muted">{r.loading}</p>
      ) : reviews.length === 0 ? (
        <AccountEmptyState
          className="!py-8"
          icon="⭐"
          title={r.emptyTitle}
          description={r.emptyDescription}
          actions={[{ href: "/bookings", label: r.emptyCtaBookings }]}
        />
      ) : (
        <ul className={compact ? "mt-3 space-y-2.5" : "mt-4 space-y-3"}>
          {reviews.map((review) => (
            <li key={review.id}>
              <ReviewCard
                review={review}
                compact={compact}
                heading={
                  showTypeHeadings ? reviewTypeHeading(review.reviewType, typeLabels) : undefined
                }
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
