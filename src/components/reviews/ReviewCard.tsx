"use client";

import { ReviewStars } from "@/components/reviews/ReviewStars";
import type { ReviewDisplay } from "@/lib/reviews";

type ReviewCardProps = {
  review: ReviewDisplay;
  /** e.g. "Pet Parent review of Pet Friend" */
  heading?: string;
  className?: string;
  compact?: boolean;
};

export function ReviewCard({ review, heading, className = "", compact = false }: ReviewCardProps) {
  return (
    <article
      className={`rounded-xl border border-black/[0.06] bg-cream/40 ring-1 ring-black/[0.03] ${
        compact ? "p-3" : "rounded-2xl p-4"
      } ${className}`}
    >
      {heading ? (
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal">{heading}</p>
      ) : null}
      <div className={`flex flex-wrap items-center gap-2 ${heading ? "mt-2" : ""}`}>
        <ReviewStars rating={review.rating} size="md" />
        <span className="text-xs text-muted">{review.createdAtLabel}</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-foreground">{review.reviewerName}</p>
      {review.petName ? (
        <p className="mt-0.5 text-xs text-muted">Pet: {review.petName}</p>
      ) : null}
      {review.text ? (
        <p className="mt-2 text-sm leading-relaxed text-foreground/90">{review.text}</p>
      ) : null}
      {review.tags.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {review.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full bg-mint/50 px-2.5 py-0.5 text-[0.7rem] font-semibold text-brand-teal"
            >
              {tag}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
