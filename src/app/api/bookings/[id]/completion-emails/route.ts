import { triggerBookingCompletedEmails } from "@/lib/email-triggers";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST — send review-request emails for a completed booking (legacy path; prefer server action).
 */
export async function POST(_request: Request, context: RouteContext) {
  const { id: bookingId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, pet_parent_id, pet_friend_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (user.id !== booking.pet_parent_id && user.id !== booking.pet_friend_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await triggerBookingCompletedEmails(bookingId);
  return NextResponse.json({ ok: true });
}
