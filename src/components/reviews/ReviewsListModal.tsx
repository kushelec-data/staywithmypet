"use client";

import { ReviewCard } from "@/components/reviews/ReviewCard";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import {
  fetchReviewsForProfile,
  reviewTypeHeading,
  summarizeReviews,
  type ReviewDisplay,
} from "@/lib/reviews";
import { createClient } from "@/lib/supabase";
import { useEffect, useMemo, useRef, useState } from "react";

type ReviewsListModalProps = {
  open: boolean;
  profileId: string;
  displayName: string;
  onClose: () => void;
};

export function ReviewsListModal({ open, profileId, displayName, onClose }: ReviewsListModalProps) {
  const { t } = useLanguage();
  const r = t.reviews;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const supabase = useMemo(() => createClient(), []);
  const [reviews, setReviews] = useState<ReviewDisplay[]>([]);
  const [loading, setLoading] = useState(false);

  const typeLabels = useMemo(
    () => ({ parentFriend: r.typeParentFriend, friendPet: r.typeFriendPet }),
    [r.typeFriendPet, r.typeParentFriend],
  );

  const { ratingAvg, ratingCount } = summarizeReviews(reviews);
  const showTypeHeadings = new Set(reviews.map((rev) => rev.reviewType)).size > 1;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open || !profileId) return;

    let cancelled = false;
    setLoading(true);

    void fetchReviewsForProfile(supabase, profileId)
      .then((rows) => {
        if (!cancelled) setReviews(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, profileId, supabase]);

  return (
    <dialog
      ref={dialogRef}
      className="w-[min(100%,32rem)] max-w-lg rounded-3xl border border-black/10 bg-surface p-0 shadow-xl backdrop:bg-black/40"
      onClose={onClose}
    >
      <div className="flex max-h-[min(85vh,640px)] flex-col">
        <header className="shrink-0 border-b border-black/5 px-5 py-4 sm:px-6">
          <h2 className="font-heading text-lg font-bold text-foreground">{r.listModalTitle}</h2>
          <p className="mt-1 text-sm text-muted">{displayName}</p>
          {ratingCount > 0 ? (
            <p className="mt-2 text-sm font-medium text-brand-teal">
              ★ {ratingAvg.toFixed(1)} · {ratingCount}{" "}
              {ratingCount === 1 ? r.reviewSingular : r.reviewPlural}
            </p>
          ) : null}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {loading ? (
            <p className="text-sm text-muted">{r.loading}</p>
          ) : reviews.length === 0 ? (
            <p className="text-sm text-muted">{r.emptyProfile}</p>
          ) : (
            <ul className="space-y-4">
              {reviews.map((review) => (
                <li key={review.id}>
                  <ReviewCard
                    review={review}
                    heading={
                      showTypeHeadings
                        ? reviewTypeHeading(review.reviewType, typeLabels)
                        : undefined
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="shrink-0 border-t border-black/5 px-5 py-4 sm:px-6">
          <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={onClose}>
            {r.close}
          </Button>
        </footer>
      </div>
    </dialog>
  );
}
