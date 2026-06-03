import type { SupabaseClient } from "@supabase/supabase-js";
import { countCompletedBookingsForUser, countReviewsAsReviewee } from "@/lib/bookings-stats";
import { calculateTrustScore } from "@/lib/trust-score";
import type { ProfileRow } from "@/lib/profile-utils";
import { isMissingRelationError, isPostgrestError } from "@/lib/supabase-errors";

type TrustRefreshOptions = {
  emailVerified: boolean;
};

/** Recompute and persist profile.trust_score after a review or booking change. */
export async function refreshStoredTrustScore(
  supabase: SupabaseClient,
  userId: string,
  profile: ProfileRow,
  options: TrustRefreshOptions,
): Promise<number> {
  const phoneOnFile = Boolean(profile.phone_e164?.trim() || profile.phone?.trim());
  const [completedBookingsCount, reviewsAsRevieweeCount] = await Promise.all([
    countCompletedBookingsForUser(supabase, userId),
    countReviewsAsReviewee(supabase, userId),
  ]);

  const percent = calculateTrustScore(
    profile,
    {
      emailVerified: options.emailVerified,
      completedBookingsCount,
      reviewsAsRevieweeCount,
    },
    { phoneOnFile },
  ).percent;

  const { error } = await supabase.from("profiles").update({ trust_score: percent }).eq("id", userId);

  if (error) {
    if (isPostgrestError(error) && /trust_score|column/i.test(error.message)) {
      return percent;
    }
    if (isMissingRelationError(error)) return percent;
    throw error;
  }

  return percent;
}
