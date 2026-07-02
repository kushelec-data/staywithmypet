"use server";

import { triggerBookingReviewRequestEmails } from "@/lib/booking-review-emails";
import { completeBooking, formatBookingError } from "@/lib/bookings";
import { createClient } from "@/lib/supabase/server";

async function requireUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Mark booking completed and send review-request emails to both participants. */
export async function completeBookingAction(
  bookingId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  if (!userId || !bookingId?.trim()) {
    return { ok: false, error: "Unauthorized" };
  }

  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, pet_parent_id, pet_friend_id, status")
    .eq("id", bookingId.trim())
    .maybeSingle();

  if (!booking) {
    return { ok: false, error: "Booking not found." };
  }

  if (userId !== booking.pet_parent_id && userId !== booking.pet_friend_id) {
    return { ok: false, error: "Not allowed." };
  }

  try {
    if (booking.status !== "completed") {
      await completeBooking(supabase, bookingId.trim());
    }
  } catch (err) {
    return { ok: false, error: formatBookingError(err) };
  }

  try {
    await triggerBookingReviewRequestEmails(bookingId.trim());
  } catch (err) {
    console.error("[booking] review request emails failed", {
      bookingId,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  return { ok: true };
}
