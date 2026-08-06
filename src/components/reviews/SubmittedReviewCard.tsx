"use client";

import { ReviewStars } from "@/components/reviews/ReviewStars";
import { useLanguage } from "@/context/LanguageContext";
import type { ReviewDisplay } from "@/lib/reviews";

type SubmittedReviewCardProps = {
  review: ReviewDisplay;
  compact?: boolean;
};

/** Inline submitted review (list rows, dashboard, etc.). */
export function SubmittedReviewCard({ review, compact }: SubmittedReviewCardProps) {
  const { t } = useLanguage();
  const r = t.reviews;

  if (compact) {
    return (
      <div
        className="w-full rounded-xl border border-brand-teal/15 bg-mint/20 px-3 py-2.5 text-left"
        aria-label={`${r.reviewSubmitted}. ${r.reviewedOn.replace("{date}", review.createdAtLabel)}`}
      >
        <p className="text-xs font-semibold text-foreground">{r.reviewSubmitted}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <ReviewStars rating={review.rating} size="md" />
        </div>
        <p className="mt-1.5 text-xs text-muted">
          {r.reviewedOn.replace("{date}", review.createdAtLabel)}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <p className="mb-2 text-sm font-medium text-muted">{r.yourReview}</p>
      <div className="rounded-xl border border-brand-teal/15 bg-mint/20 p-4">
        <p className="text-sm font-semibold text-foreground">{r.reviewSubmitted}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <ReviewStars rating={review.rating} size="md" />
          <span className="text-xs text-muted">
            {r.reviewedOn.replace("{date}", review.createdAtLabel)}
          </span>
        </div>
        {review.text ? (
          <p className="mt-3 text-sm leading-relaxed text-foreground/90">{review.text}</p>
        ) : null}
      </div>
    </div>
  );
}
