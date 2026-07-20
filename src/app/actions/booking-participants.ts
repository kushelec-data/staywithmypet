"use server";

import {
  loadBookingParticipantDetails,
  loadRequestParticipantDetails,
  type ParticipantDetailsLoadResult,
  type RequestParticipantDetails,
} from "@/lib/booking-participant-details";
import { createClient } from "@/lib/supabase/server";

export async function getBookingParticipantDetailsAction(
  bookingId: string,
): Promise<ParticipantDetailsLoadResult> {
  if (!bookingId?.trim()) {
    return { details: null, error: "not_found" };
  }
  const supabase = await createClient();
  return loadBookingParticipantDetails(supabase, bookingId.trim());
}

export async function getRequestParticipantDetailsAction(
  requestId: string,
): Promise<RequestParticipantDetails | null> {
  const userId = await requireUserId();
  if (!userId || !requestId?.trim()) return null;
  return loadRequestParticipantDetails(userId, requestId.trim());
}

async function requireUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
