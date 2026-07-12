"use server";

import {
  onBookingCompleted,
  queueBookingCompletedReviewEmails,
} from "@/lib/booking-completion";

/** Queue review reminder emails after automatic booking completion. */
export async function triggerAutoCompletedReviewEmailsAction(
  bookingIds: string[],
): Promise<void> {
  queueBookingCompletedReviewEmails(bookingIds, "automatic");
}

/** Manual/API retry for review reminders on one booking. */
export async function triggerBookingReviewEmailsAction(bookingId: string): Promise<void> {
  await onBookingCompleted(bookingId, "manual");
}
