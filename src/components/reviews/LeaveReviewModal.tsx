"use client";

import { Button } from "@/components/ui/Button";
import { StarRatingPicker } from "@/components/reviews/StarRatingPicker";
import { useLanguage } from "@/context/LanguageContext";
import {
  isPetExperienceReviewType,
  REVIEW_TEXT_MAX,
  REVIEW_TEXT_MIN,
  tagsForReviewType,
  type ReviewType,
} from "@/lib/reviews";
import { useEffect, useRef, useState } from "react";

export type LeaveReviewSubmitValues = {
  rating: number;
  text: string | null;
  tags: string[];
};

type LeaveReviewModalProps = {
  open: boolean;
  reviewType: ReviewType;
  targetLabel: string;
  submitting: boolean;
  error: string | null;
  submitDisabled?: boolean;
  onClose: () => void;
  onSubmit: (values: LeaveReviewSubmitValues) => void;
};

export function LeaveReviewModal({
  open,
  reviewType,
  targetLabel,
  submitting,
  error,
  submitDisabled = false,
  onClose,
  onSubmit,
}: LeaveReviewModalProps) {
  const { t } = useLanguage();
  const r = t.reviews;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);

  const reviewingPet = isPetExperienceReviewType(reviewType);
  const title = reviewingPet ? r.modalTitlePet : r.modalTitleFriend;
  const tagOptions = tagsForReviewType(reviewType);
  const tagsLabel = reviewingPet ? r.petTagsLabel : r.friendTagsLabel;
  const tagsHint = reviewingPet ? r.petTagsHint : r.friendTagsHint;
  const textPlaceholder = reviewingPet ? r.textPlaceholderPet : r.textPlaceholderFriend;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) {
      setRating(0);
      setText("");
      setSelectedTags([]);
      setLocalError(null);
    }
  }, [open]);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setLocalError(r.ratingRequired);
      return;
    }
    const trimmed = text.trim();
    if (trimmed.length < REVIEW_TEXT_MIN) {
      setLocalError(r.textRequired);
      return;
    }
    if (trimmed.length > REVIEW_TEXT_MAX) {
      setLocalError(r.textTooLong.replace("{max}", String(REVIEW_TEXT_MAX)));
      return;
    }
    setLocalError(null);
    onSubmit({
      rating,
      text: trimmed,
      tags: selectedTags,
    });
  }

  return (
    <dialog
      ref={dialogRef}
      className="w-[min(100%,28rem)] max-w-lg rounded-3xl border border-black/10 bg-surface p-0 shadow-xl backdrop:bg-black/40"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="border-b border-black/5 px-5 py-4 sm:px-6">
          <h2 className="font-heading text-lg font-bold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted">{r.modalSubtitle.replace("{name}", targetLabel)}</p>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          <StarRatingPicker
            label={r.ratingLabel}
            value={rating}
            onChange={setRating}
            disabled={submitting}
          />

          <div>
            <p className="text-sm font-semibold text-foreground">{tagsLabel}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{tagsHint}</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {tagOptions.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <li key={tag}>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => toggleTag(tag)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                        active
                          ? "border-brand-teal bg-brand-teal/10 text-brand-teal"
                          : "border-black/10 bg-cream/50 text-foreground/80 hover:border-brand-teal/30"
                      }`}
                    >
                      {tag}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <label htmlFor="review-text" className="text-sm font-semibold text-foreground">
              {r.textLabel}
            </label>
            <textarea
              id="review-text"
              name="text"
              rows={3}
              minLength={REVIEW_TEXT_MIN}
              maxLength={REVIEW_TEXT_MAX}
              required
              disabled={submitting}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={textPlaceholder}
              className="mt-2 w-full resize-none rounded-xl border border-black/10 bg-cream/30 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
            />
            <p className="mt-1 text-right text-xs text-muted">
              {text.length}/{REVIEW_TEXT_MAX}
            </p>
          </div>

          {(localError || error) ? (
            <p className="rounded-xl bg-brand-pink-muted/50 px-3 py-2 text-sm text-brand-pink" role="alert">
              {localError ?? error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-black/5 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button type="button" variant="ghost" size="sm" disabled={submitting} onClick={onClose}>
            {r.cancel}
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={submitting || submitDisabled}
          >
            {submitting ? r.submitting : r.submit}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
