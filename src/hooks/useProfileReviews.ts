"use client";

import { fetchReviewsForProfile, summarizeReviews, type ReviewDisplay } from "@/lib/reviews";
import { createClient } from "@/lib/supabase";
import { useEffect, useMemo, useState } from "react";

export function useProfileReviews(profileId: string | null) {
  const supabase = useMemo(() => createClient(), []);
  const [reviews, setReviews] = useState<ReviewDisplay[]>([]);
  const [loading, setLoading] = useState(Boolean(profileId));

  useEffect(() => {
    if (!profileId) {
      setReviews([]);
      setLoading(false);
      return;
    }

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
  }, [supabase, profileId]);

  const summary = useMemo(() => summarizeReviews(reviews), [reviews]);

  return { reviews, loading, ...summary };
}
