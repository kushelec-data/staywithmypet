"use server";

import {
  handleOneTimeBookingCancelled,
  handleOneTimeBookingCompleted,
  linkOneTimeMembershipsForRequest,
} from "@/lib/one-time-membership-lifecycle";

export async function handleOneTimeBookingCancelledAction(
  bookingId: string,
): Promise<void> {
  await handleOneTimeBookingCancelled(bookingId);
}

export async function handleOneTimeBookingCompletedAction(
  bookingId: string,
): Promise<void> {
  await handleOneTimeBookingCompleted(bookingId);
}

export async function handleOneTimeBookingsCompletedAction(
  bookingIds: string[],
): Promise<void> {
  for (const bookingId of bookingIds) {
    await handleOneTimeBookingCompleted(bookingId);
  }
}

export async function linkOneTimeMembershipsForRequestAction(
  requestId: string,
): Promise<void> {
  await linkOneTimeMembershipsForRequest(requestId);
}
