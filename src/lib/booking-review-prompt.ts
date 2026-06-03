import type { SupabaseClient } from "@supabase/supabase-js";
import {
  autoCompleteDueBookings,
  fetchBookings,
  type Booking,
} from "@/lib/bookings";
import {
  fetchMyReviewsForBookings,
  reviewTypeForBookingParticipant,
} from "@/lib/reviews";

/** Most recent completed booking where the user has not left their review yet. */
export async function fetchFirstBookingNeedingReview(
  supabase: SupabaseClient,
  userId: string,
): Promise<Booking | null> {
  await autoCompleteDueBookings(supabase);

  const completed = await fetchBookings(supabase, userId, "completed");
  if (!completed.length) return null;

  const sorted = [...completed].sort((a, b) => b.endDate.localeCompare(a.endDate));
  const reviewMap = await fetchMyReviewsForBookings(
    supabase,
    userId,
    sorted.map((b) => b.id),
  );

  for (const booking of sorted) {
    if (reviewMap.has(booking.id)) continue;
    if (!reviewTypeForBookingParticipant(booking, userId)) continue;
    return booking;
  }

  return null;
}
