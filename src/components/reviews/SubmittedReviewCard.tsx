"use client";

import { ReviewCard } from "@/components/reviews/ReviewCard";
import { useLanguage } from "@/context/LanguageContext";
import { reviewTypeHeading, type ReviewDisplay } from "@/lib/reviews";

type SubmittedReviewCardProps = {
  review: ReviewDisplay;
  compact?: boolean;
};

/** Inline submitted review (list rows, etc.). */
export function SubmittedReviewCard({ review, compact }: SubmittedReviewCardProps) {
  const { t } = useLanguage();
  const r = t.reviews;
  const heading = reviewTypeHeading(review.reviewType, {
    parentFriend: r.typeParentFriend,
    friendPet: r.typeFriendPet,
  });

  return (
    <div className={compact ? "w-full" : undefined}>
      {!compact ? <p className="mb-2 text-sm font-medium text-muted">{r.yourReview}</p> : null}
      <ReviewCard review={review} heading={compact ? undefined : heading} />
    </div>
  );
}
