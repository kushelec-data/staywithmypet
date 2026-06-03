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
import { refreshStoredTrustScore } from "@/lib/trust-score-refresh";
import { createClient } from "@/lib/supabase";
import { useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
type BookingReviewActionProps = {
  booking: Booking;
  userId: string;
  onSubmitted: () => void;
  /** Override default “Leave review” label. */
  buttonLabel?: string;
};

export function BookingReviewAction({
  booking,
  userId,
  onSubmitted,
  buttonLabel,
}: BookingReviewActionProps) {
  const { t } = useLanguage();
  const r = t.reviews;
  const { user } = useAuth();
  const { profile, refreshProfile } = useProfile();
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
      if (profile && user) {
        await refreshStoredTrustScore(supabase, userId, profile, {
          emailVerified: Boolean(user.email_confirmed_at),
        });
        void refreshProfile({ background: true });
      }
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
        {buttonLabel ?? r.leaveReview}
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
