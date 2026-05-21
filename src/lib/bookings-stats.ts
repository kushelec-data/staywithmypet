import type { SupabaseClient } from "@supabase/supabase-js";

export async function countCompletedBookingsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "completed")
    .or(`pet_parent_id.eq.${userId},pet_friend_id.eq.${userId}`);

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[bookings-stats] completed count failed", error.message);
    }
    return 0;
  }
  return count ?? 0;
}

export async function countReviewsAsReviewee(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("reviewee_id", userId);

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[bookings-stats] reviews count failed", error.message);
    }
    return 0;
  }
  return count ?? 0;
}
