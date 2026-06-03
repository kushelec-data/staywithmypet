"use client";

import { BookingReviewAction } from "@/components/reviews/BookingReviewAction";
import { useLanguage } from "@/context/LanguageContext";
import type { Booking } from "@/lib/bookings";
import {
  REVIEW_TYPE_FRIEND_PET,
  REVIEW_TYPE_PARENT_FRIEND,
  reviewTypeForBookingParticipant,
} from "@/lib/reviews";

type BookingParticipantReviewButtonsProps = {
  booking: Booking;
  userId: string;
  onSubmitted: () => void;
};

/** Role-specific review CTAs after a completed booking. */
export function BookingParticipantReviewButtons({
  booking,
  userId,
  onSubmitted,
}: BookingParticipantReviewButtonsProps) {
  const { t } = useLanguage();
  const r = t.reviews;
  const reviewType = reviewTypeForBookingParticipant(booking, userId);
  if (!reviewType) return null;

  if (reviewType === REVIEW_TYPE_PARENT_FRIEND) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted">
          {r.reviewParentRoleHint.replace("{name}", booking.petName)}
        </p>
        <BookingReviewAction booking={booking} userId={userId} onSubmitted={onSubmitted} />
      </div>
    );
  }

  const parentName = booking.otherPartyName;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        {r.reviewFriendParentHint.replace("{name}", parentName)}
      </p>
      <div className="space-y-2 rounded-2xl border border-black/5 bg-surface/60 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {r.typeFriendPet}
        </p>
        <p className="text-sm text-muted">
          {r.reviewFriendPetHint.replace("{name}", booking.petName)}
        </p>
        <BookingReviewAction
          booking={booking}
          userId={userId}
          onSubmitted={onSubmitted}
          buttonLabel={r.reviewFriendPetButton}
        />
      </div>
      <div className="rounded-2xl border border-dashed border-black/10 bg-cream/30 px-3 py-2.5 text-sm text-muted">
        <p className="font-medium text-foreground">{r.typeParentFriend}</p>
        <p className="mt-1 text-xs">
          {r.reviewFriendParentHint.replace("{name}", parentName)}
        </p>
      </div>
    </div>
  );
}
