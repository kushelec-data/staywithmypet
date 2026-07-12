import "server-only";

import type { ReviewEmailResult } from "@/lib/booking-review-emails";

export type BookingCompletionPath = "manual" | "automatic" | "cron";

export type ReviewEmailConfigIssue =
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "SMTP_USER"
  | "SMTP_PASSWORD";

export type ReviewEmailConfigStatus = {
  ok: boolean;
  missing: ReviewEmailConfigIssue[];
};

/** Validates env required for review reminder emails (server logs only). */
export function checkReviewEmailConfiguration(): ReviewEmailConfigStatus {
  const missing: ReviewEmailConfigIssue[] = [];

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }
  if (!process.env.SMTP_USER?.trim()) {
    missing.push("SMTP_USER");
  }
  if (!process.env.SMTP_PASSWORD?.trim()) {
    missing.push("SMTP_PASSWORD");
  }

  return { ok: missing.length === 0, missing };
}

export function logReviewEmailConfigError(
  context: BookingCompletionPath,
  bookingId?: string,
): ReviewEmailConfigStatus {
  const status = checkReviewEmailConfiguration();
  if (!status.ok) {
    console.error("[booking-review-email] configuration missing", {
      context,
      bookingId: bookingId ?? null,
      missing: status.missing,
    });
  }
  return status;
}

/**
 * Shared hook after a booking becomes completed.
 * Sends idempotent per-participant review reminder emails.
 */
export async function onBookingCompleted(
  bookingId: string,
  path: BookingCompletionPath,
): Promise<ReviewEmailResult> {
  const trimmed = bookingId.trim();
  if (!trimmed) {
    return { sent: 0, skipped: 0, blocked: true, reason: "invalid_booking_id" };
  }

  console.info("[booking-completion] hook start", { bookingId: trimmed, path });

  const config = logReviewEmailConfigError(path, trimmed);
  if (!config.ok) {
    return {
      sent: 0,
      skipped: 0,
      blocked: true,
      configError: true,
      missingConfig: config.missing,
      reason: "configuration_missing",
    };
  }

  const { triggerBookingReviewRequestEmails } = await import("@/lib/booking-review-emails");
  return triggerBookingReviewRequestEmails(trimmed, path);
}

/** Fire-and-forget review emails for one or more newly completed bookings. */
export function queueBookingCompletedReviewEmails(
  bookingIds: string[],
  path: BookingCompletionPath,
): void {
  for (const bookingId of bookingIds) {
    void onBookingCompleted(bookingId, path).catch((err) => {
      console.error("[booking-completion] review emails failed", {
        bookingId,
        path,
        message: err instanceof Error ? err.message : String(err),
      });
    });
  }
}

/** True when cron recovery route can authenticate incoming requests. */
export function isCronRecoveryConfigured(): boolean {
  return Boolean(
    process.env.CRON_SECRET?.trim() || process.env.EMAIL_INTERNAL_SECRET?.trim(),
  );
}
