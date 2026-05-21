"use client";

import { ReviewCard } from "@/components/reviews/ReviewCard";
import { BookingReviewAction } from "@/components/reviews/BookingReviewAction";
import { useLanguage } from "@/context/LanguageContext";
import type { Booking, BookingDetail } from "@/lib/bookings";
import { reviewTypeHeading, type ReviewDisplay } from "@/lib/reviews";

type BookingReviewsSectionProps = {
  booking: Booking | BookingDetail;
  userId: string;
  reviews: ReviewDisplay[];
  loading: boolean;
  onReviewsChange: () => void;
};

export function BookingReviewsSection({
  booking,
  userId,
  reviews,
  loading,
  onReviewsChange,
}: BookingReviewsSectionProps) {
  const { t } = useLanguage();
  const r = t.reviews;
  const typeLabels = { parentFriend: r.typeParentFriend, friendPet: r.typeFriendPet };

  if (booking.displayStatus !== "completed") return null;

  const myReview = reviews.find((rev) => rev.reviewerId === userId) ?? null;
  const otherReviews = reviews.filter((rev) => rev.reviewerId !== userId);

  return (
    <section className="mt-6 border-t border-black/5 pt-6">
      <h3 className="font-heading text-lg font-semibold text-foreground">
        {otherReviews.length > 0 || myReview
          ? r.bookingReviewsTitle
          : r.bookingReviewsTitleSingle}
      </h3>

      {loading ? (
        <p className="mt-3 text-sm text-muted">{r.loading}</p>
      ) : (
        <div className="mt-4 space-y-4">
          {myReview ? (
            <div>
              <p className="mb-2 text-sm font-medium text-muted">{r.yourReview}</p>
              <ReviewCard
                review={myReview}
                heading={reviewTypeHeading(myReview.reviewType, typeLabels)}
              />
            </div>
          ) : (
            <BookingReviewAction
              booking={booking}
              userId={userId}
              onSubmitted={onReviewsChange}
            />
          )}

          {otherReviews.map((rev) => (
            <ReviewCard
              key={rev.id}
              review={rev}
              heading={reviewTypeHeading(rev.reviewType, typeLabels)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
