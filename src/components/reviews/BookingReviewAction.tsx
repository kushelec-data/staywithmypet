"use client";

import { LeaveReviewModal, type LeaveReviewSubmitValues } from "@/components/reviews/LeaveReviewModal";
import { SubmittedReviewCard } from "@/components/reviews/SubmittedReviewCard";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import type { Booking } from "@/lib/bookings";
import {
  fetchMyReviewDisplayForBooking,
  formatReviewError,
  isDuplicateReviewError,
  isReviewAuthoredByUser,
  reviewTypeForBookingParticipant,
  revieweeIdForType,
  submitReview,
  userNeedsToReviewBooking,
  type ReviewDisplay,
} from "@/lib/reviews";
import { refreshStoredTrustScore } from "@/lib/trust-score-refresh";
import { createClient } from "@/lib/supabase";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";

type BookingReviewActionProps = {
  booking: Booking;
  userId: string;
  onSubmitted: () => void;
  /** Optional prefetch from list/dashboard queries; always verified on mount. */
  existingReview?: ReviewDisplay | null;
  /** Override default “Leave review” label. */
  buttonLabel?: string;
};

export function BookingReviewAction({
  booking,
  userId,
  onSubmitted,
  existingReview: existingReviewProp,
  buttonLabel,
}: BookingReviewActionProps) {
  const { t } = useLanguage();
  const r = t.reviews;
  const { user } = useAuth();
  const { profile, refreshProfile } = useProfile();
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingReview, setLoadingReview] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [existingReview, setExistingReview] = useState<ReviewDisplay | null>(() =>
    isReviewAuthoredByUser(existingReviewProp, userId) ? existingReviewProp ?? null : null,
  );

  const ownExistingReview = isReviewAuthoredByUser(existingReview, userId)
    ? existingReview
    : null;

  const reviewType = reviewTypeForBookingParticipant(booking, userId);
  if (!reviewType) return null;
  const resolvedReviewType = reviewType;

  const loadExistingReview = useCallback(async () => {
    const row = await fetchMyReviewDisplayForBooking(supabase, userId, booking.id);
    const own = isReviewAuthoredByUser(row, userId) ? row : null;
    setExistingReview(own);
    return own;
  }, [supabase, userId, booking.id]);

  useEffect(() => {
    let cancelled = false;
    setLoadingReview(true);

    if (isReviewAuthoredByUser(existingReviewProp, userId)) {
      setExistingReview(existingReviewProp ?? null);
    }

    void fetchMyReviewDisplayForBooking(supabase, userId, booking.id)
      .then((row) => {
        if (!cancelled) {
          setExistingReview(isReviewAuthoredByUser(row, userId) ? row : null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingReview(false);
      });

    return () => {
      cancelled = true;
    };
  }, [existingReviewProp, supabase, userId, booking.id]);

  const targetLabel =
    resolvedReviewType === "pet_parent_reviews_pet_friend"
      ? booking.otherPartyName
      : booking.petName;

  async function handleOpen() {
    setError(null);
    const row = await loadExistingReview();
    if (row) return;
    setOpen(true);
  }

  async function handleSubmit(values: LeaveReviewSubmitValues) {
    setSubmitting(true);
    setError(null);
    try {
      const row = await loadExistingReview();
      if (row) return;

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
      await loadExistingReview();
      onSubmitted();
    } catch (err) {
      if (isDuplicateReviewError(err)) {
        const own = await loadExistingReview();
        if (own) {
          setOpen(false);
          setError(null);
        } else {
          setError(formatReviewError(err, { duplicateMessage: r.duplicateBookingReview }));
        }
      } else {
        setError(formatReviewError(err, { duplicateMessage: r.duplicateBookingReview }));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingReview) {
    return <p className="text-xs text-muted">{r.loadingReviewStatus}</p>;
  }

  if (ownExistingReview) {
    return <SubmittedReviewCard review={ownExistingReview} compact />;
  }

  if (!userNeedsToReviewBooking(booking, userId, ownExistingReview)) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant="primary"
        size="sm"
        className="w-full sm:w-auto"
        onClick={() => void handleOpen()}
      >
        {buttonLabel ?? r.leaveReview}
      </Button>
      <LeaveReviewModal
        open={open}
        reviewType={resolvedReviewType}
        targetLabel={targetLabel}
        submitting={submitting}
        error={error}
        submitDisabled={Boolean(error && error === r.duplicateBookingReview)}
        onClose={() => {
          setOpen(false);
          setError(null);
        }}
        onSubmit={handleSubmit}
      />
    </>
  );
}
