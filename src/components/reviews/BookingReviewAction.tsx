"use client";

import { LeaveReviewModal, type LeaveReviewSubmitValues } from "@/components/reviews/LeaveReviewModal";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import type { Booking } from "@/lib/bookings";
import {
  formatReviewError,
  reviewTypeForBookingParticipant,
  revieweeIdForType,
  submitReview,
} from "@/lib/reviews";
import { createClient } from "@/lib/supabase";
import { useMemo, useState } from "react";

type BookingReviewActionProps = {
  booking: Booking;
  userId: string;
  onSubmitted: () => void;
};

export function BookingReviewAction({ booking, userId, onSubmitted }: BookingReviewActionProps) {
  const { t } = useLanguage();
  const r = t.reviews;
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reviewType = reviewTypeForBookingParticipant(booking, userId);
  if (!reviewType) return null;
  const resolvedReviewType = reviewType;

  const targetLabel =
    resolvedReviewType === "pet_parent_reviews_pet_friend"
      ? booking.otherPartyName
      : booking.petName;

  async function handleSubmit(values: LeaveReviewSubmitValues) {
    setSubmitting(true);
    setError(null);
    try {
      await submitReview(supabase, userId, {
        bookingId: booking.id,
        requestId: booking.requestId,
        petId: booking.petId,
        revieweeId: revieweeIdForType(booking, resolvedReviewType),
        reviewType: resolvedReviewType,
        rating: values.rating,
        text: values.text,
        tags: values.tags,
      });
      setOpen(false);
      onSubmitted();
    } catch (err) {
      setError(formatReviewError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="primary"
        size="sm"
        className="w-full sm:w-auto"
        onClick={() => setOpen(true)}
      >
        {r.leaveReview}
      </Button>
      <LeaveReviewModal
        open={open}
        reviewType={resolvedReviewType}
        targetLabel={targetLabel}
        submitting={submitting}
        error={error}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
}
