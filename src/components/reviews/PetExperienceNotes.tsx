"use client";

import { ReviewCard } from "@/components/reviews/ReviewCard";
import { useLanguage } from "@/context/LanguageContext";
import {
  aggregatePetExperienceTags,
  fetchPetExperienceReviews,
  type ReviewDisplay,
} from "@/lib/reviews";
import { createClient } from "@/lib/supabase";
import { useEffect, useMemo, useState } from "react";

type PetExperienceNotesProps = {
  petId: string;
  compact?: boolean;
};

export function PetExperienceNotes({ petId, compact = false }: PetExperienceNotesProps) {
  const { t } = useLanguage();
  const r = t.reviews;
  const supabase = useMemo(() => createClient(), []);
  const [reviews, setReviews] = useState<ReviewDisplay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchPetExperienceReviews(supabase, petId)
      .then((rows) => {
        if (!cancelled) setReviews(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, petId]);

  const sectionClass = compact
    ? "card-elevated scroll-mt-24 rounded-2xl p-4 sm:p-5"
    : "card-elevated scroll-mt-28 rounded-3xl p-5 sm:p-6";

  if (loading) {
    return (
      <section id="reviews" className={sectionClass}>
        <h2 className="font-heading text-base font-semibold text-foreground">Reviews</h2>
        <p className="mt-2 text-sm text-muted">{r.loading}</p>
      </section>
    );
  }

  const tagSummary = aggregatePetExperienceTags(reviews);
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, rev) => sum + rev.rating, 0) / reviews.length
      : 0;

  return (
    <section id="reviews" className={sectionClass}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-base font-semibold text-foreground">Reviews</h2>
        {reviews.length > 0 ? (
          <p className="text-sm font-medium text-brand-teal">
            ★ {avgRating.toFixed(1)} · {reviews.length}{" "}
            {reviews.length === 1 ? r.noteSingular : r.notePlural}
          </p>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-muted">{r.petExperienceSubtitle}</p>

      {reviews.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{r.emptyProfile}</p>
      ) : (
        <>
          {tagSummary.length > 0 ? (
            <ul className={`flex flex-wrap gap-1.5 ${compact ? "mt-2" : "mt-3"}`}>
              {tagSummary.map(({ tag, count }) => (
                <li
                  key={tag}
                  className="rounded-full border border-brand-teal/20 bg-mint/40 px-2.5 py-0.5 text-xs font-semibold text-brand-teal"
                >
                  {tag}
                  {count > 1 ? <span className="ml-1 opacity-70">×{count}</span> : null}
                </li>
              ))}
            </ul>
          ) : null}

          <ul className={compact ? "mt-3 space-y-2.5" : "mt-4 space-y-3"}>
            {reviews.map((review) => (
              <li key={review.id}>
                <ReviewCard review={review} compact={compact} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
