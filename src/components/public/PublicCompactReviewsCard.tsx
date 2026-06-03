"use client";

import { AccountEmptyState } from "@/components/account/AccountEmptyState";
import { ReviewCard } from "@/components/reviews/ReviewCard";
import { useLanguage } from "@/context/LanguageContext";
import { REVIEWS_SECTION_ID } from "@/components/reviews/ProfileRatingSummary";
import { Button } from "@/components/ui/Button";
import { PUBLIC_CARD, PUBLIC_SECTION_TITLE } from "@/lib/public-layout";
import type { ReviewDisplay } from "@/lib/reviews";
import { useState } from "react";

type PublicCompactReviewsCardProps = {
  reviews: ReviewDisplay[];
  loading?: boolean;
  ratingAvg: number;
  ratingCount: number;
  emptyMessage?: string;
  noteLabel?: string;
};

export function PublicCompactReviewsCard({
  reviews,
  loading = false,
  ratingAvg,
  ratingCount,
  emptyMessage = "No reviews yet.",
  noteLabel = "note",
}: PublicCompactReviewsCardProps) {
  const { t } = useLanguage();
  const r = t.reviews;
  const [showAll, setShowAll] = useState(false);
  const latest = reviews[0];
  const plural = ratingCount === 1 ? noteLabel : `${noteLabel}s`;

  return (
    <section id={REVIEWS_SECTION_ID} className={`${PUBLIC_CARD} scroll-mt-24`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={PUBLIC_SECTION_TITLE}>
          Reviews{ratingCount > 0 ? ` (${ratingCount})` : ""}
        </h2>
        {ratingCount > 0 ? (
          <p className="text-sm font-semibold text-brand-teal">
            ★ {ratingAvg.toFixed(1)}
          </p>
        ) : null}
      </div>

      {loading ? (
        <p className="mt-3 text-sm text-muted">Loading reviews…</p>
      ) : ratingCount === 0 ? (
        <AccountEmptyState
          className="!px-0 !py-6"
          icon="⭐"
          title={r.emptyTitle}
          description={emptyMessage || r.emptyDescription}
          actions={[{ href: "/bookings", label: r.emptyCtaBookings }]}
        />
      ) : (
        <>
          <p className="mt-1 text-xs text-muted">
            ★ {ratingAvg.toFixed(1)} · {ratingCount} {plural}
          </p>

          {latest && !showAll ? (
            <div className="mt-3">
              <ReviewCard review={latest} compact />
            </div>
          ) : null}

          {showAll ? (
            <ul className="mt-3 space-y-2.5">
              {reviews.map((review) => (
                <li key={review.id}>
                  <ReviewCard review={review} compact />
                </li>
              ))}
            </ul>
          ) : null}

          {reviews.length > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-3 text-brand-teal"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? "Show less" : "View all reviews"}
            </Button>
          ) : null}
        </>
      )}
    </section>
  );
}
