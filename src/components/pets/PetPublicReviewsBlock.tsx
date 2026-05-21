"use client";

import { PublicCompactReviewsCard } from "@/components/public/PublicCompactReviewsCard";
import { fetchPetExperienceReviews, summarizeReviews } from "@/lib/reviews";
import { createClient } from "@/lib/supabase";
import { useEffect, useMemo, useState } from "react";
import type { ReviewDisplay } from "@/lib/reviews";

type PetPublicReviewsBlockProps = {
  petId: string;
  fallbackAvg?: number;
  fallbackCount?: number;
};

export function PetPublicReviewsBlock({
  petId,
  fallbackAvg = 0,
  fallbackCount = 0,
}: PetPublicReviewsBlockProps) {
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

  const { ratingAvg, ratingCount } = summarizeReviews(reviews);
  const avg = reviews.length > 0 ? ratingAvg : fallbackAvg;
  const count = reviews.length > 0 ? ratingCount : fallbackCount;

  return (
    <PublicCompactReviewsCard
      reviews={reviews}
      loading={loading}
      ratingAvg={avg}
      ratingCount={count}
      noteLabel="note"
    />
  );
}
