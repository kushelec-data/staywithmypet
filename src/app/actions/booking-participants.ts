"use server";

import {
  loadBookingParticipantDetails,
  loadRequestParticipantDetails,
  type BookingParticipantDetails,
  type RequestParticipantDetails,
} from "@/lib/booking-participant-details";
import { createClient } from "@/lib/supabase/server";

async function requireUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function getBookingParticipantDetailsAction(
  bookingId: string,
): Promise<BookingParticipantDetails | null> {
  const userId = await requireUserId();
  if (!userId || !bookingId?.trim()) return null;
  return loadBookingParticipantDetails(userId, bookingId.trim());
}

export async function getRequestParticipantDetailsAction(
  requestId: string,
): Promise<RequestParticipantDetails | null> {
  const userId = await requireUserId();
  if (!userId || !requestId?.trim()) return null;
  return loadRequestParticipantDetails(userId, requestId.trim());
}
