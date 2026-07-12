import "server-only";

import { defaultUniqueKey } from "@/lib/emails";
import { sendBookingEmailAsync } from "@/lib/emails/send-booking";
import type { EmailRecipientRole, EmailTemplateContext } from "@/lib/emails/types";
import { resolveRecipientEmail } from "@/lib/email-send";
import type { BookingCompletionPath } from "@/lib/booking-completion";
import { speciesDisplayLabel, type PetSpecies } from "@/lib/pet-data";
import { profileDisplayName } from "@/lib/profile-display";
import { createAdminClient } from "@/lib/supabase/admin";

type BookingEmailRow = {
  id: string;
  request_id: string;
  pet_id: string;
  pet_parent_id: string;
  pet_friend_id: string;
  start_date: string;
  end_date: string;
  status: string;
  completed_at: string | null;
};

type RequestEmailRow = {
  care_type: string | null;
  requested_dates: string[] | null;
};

export type ReviewEmailResult = {
  sent: number;
  skipped: number;
  blocked?: boolean;
  configError?: boolean;
  missingConfig?: string[];
  bookingNotEligible?: boolean;
  reason?: string;
};

type ReviewParticipant = {
  userId: string;
  role: EmailRecipientRole;
  type: "review_reminder_parent" | "review_reminder_friend";
};

function normalizeSpecies(raw: string | null): PetSpecies {
  if (raw === "dog" || raw === "cat" || raw === "rabbit" || raw === "bird" || raw === "other") {
    return raw;
  }
  return "other";
}

function logReviewParticipantResult(
  bookingId: string,
  path: BookingCompletionPath,
  detail: Record<string, unknown>,
): void {
  console.info("[booking-review-email] participant", {
    bookingId,
    path,
    ...detail,
  });
}

async function loadBooking(bookingId: string): Promise<BookingEmailRow | null> {
  const admin = createAdminClient();
  if (!admin) {
    console.error("[booking-review-email] SUPABASE_SERVICE_ROLE_KEY is not configured");
    return null;
  }

  const { data, error } = await admin
    .from("bookings")
    .select(
      "id, request_id, pet_id, pet_parent_id, pet_friend_id, start_date, end_date, status, completed_at",
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (error) {
    console.error("[booking-review-email] load booking failed", {
      bookingId,
      code: error.code,
      message: error.message,
    });
    return null;
  }
  if (!data) return null;
  return data as BookingEmailRow;
}

async function loadRequest(requestId: string): Promise<RequestEmailRow | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("requests")
    .select("care_type, requested_dates")
    .eq("id", requestId)
    .maybeSingle();

  if (error || !data) return null;
  return data as RequestEmailRow;
}

async function loadPet(petId: string): Promise<{ name: string; typeLabel: string }> {
  const admin = createAdminClient();
  if (!admin) return { name: "your pet", typeLabel: "pet" };

  const { data } = await admin
    .from("pets")
    .select("name, species, breed")
    .eq("id", petId)
    .maybeSingle();

  const name = (data?.name as string | null)?.trim() || "your pet";
  const species = normalizeSpecies((data?.species as string | null) ?? null);
  const typeLabel = speciesDisplayLabel(species, (data?.breed as string | null) ?? null).toLowerCase();
  return { name, typeLabel };
}

async function loadDisplayName(userId: string): Promise<string> {
  const admin = createAdminClient();
  if (!admin) return "Member";

  const { data } = await admin.from("profiles").select("display_name").eq("id", userId).maybeSingle();
  return profileDisplayName(data as { display_name: string } | null) ?? "Member";
}

function bookingEmailContext(
  booking: BookingEmailRow,
  request: RequestEmailRow | null,
  pet: { name: string; typeLabel: string },
): EmailTemplateContext {
  return {
    petName: pet.name,
    petType: pet.typeLabel,
    careType: request?.care_type ?? undefined,
    dateFrom: booking.start_date,
    dateTo: booking.end_date,
    requestedDates: request?.requested_dates ?? null,
    bookingId: booking.id,
  };
}

export function reviewReminderParticipants(booking: Pick<BookingEmailRow, "pet_parent_id" | "pet_friend_id">): ReviewParticipant[] {
  return [
    {
      userId: booking.pet_parent_id,
      role: "pet_parent",
      type: "review_reminder_parent",
    },
    {
      userId: booking.pet_friend_id,
      role: "pet_friend",
      type: "review_reminder_friend",
    },
  ];
}

export function reviewReminderUniqueKey(
  type: ReviewParticipant["type"],
  bookingId: string,
  userId: string,
): string {
  return defaultUniqueKey(type, userId, { bookingId });
}

/** True when the user has already submitted their review for this booking. */
export async function userHasReviewForBooking(
  userId: string,
  bookingId: string,
): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;

  const { data, error } = await admin
    .from("reviews")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("reviewer_id", userId)
    .maybeSingle();

  if (error) return false;
  return Boolean(data?.id);
}

export async function reviewReminderAlreadySent(
  type: ReviewParticipant["type"],
  bookingId: string,
  userId: string,
): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;

  const uniqueKey = reviewReminderUniqueKey(type, bookingId, userId);
  const { data, error } = await admin
    .from("email_events")
    .select("id, sent_at")
    .eq("unique_key", uniqueKey)
    .maybeSingle();

  if (error) return false;
  return Boolean(data?.sent_at);
}

function bookingEligibleForReviewEmails(booking: BookingEmailRow): boolean {
  return booking.status === "completed" && Boolean(booking.completed_at);
}

/**
 * Send Excel "Leave a Review" emails (review_reminder_parent / review_reminder_friend)
 * when a booking is completed. Skips recipients who already reviewed or were already emailed.
 */
export async function triggerBookingReviewRequestEmails(
  bookingId: string,
  path: BookingCompletionPath = "manual",
): Promise<ReviewEmailResult> {
  const booking = await loadBooking(bookingId);
  if (!booking) {
    console.error("[booking-review-email] booking not found or admin unavailable", { bookingId, path });
    return { sent: 0, skipped: 0, blocked: true, reason: "booking_not_found" };
  }

  if (!bookingEligibleForReviewEmails(booking)) {
    console.warn("[booking-review-email] booking not eligible", {
      bookingId,
      path,
      status: booking.status,
      completedAt: booking.completed_at,
    });
    return {
      sent: 0,
      skipped: 0,
      bookingNotEligible: true,
      reason: "booking_not_completed",
    };
  }

  const [row, pet] = await Promise.all([
    loadRequest(booking.request_id),
    loadPet(booking.pet_id),
  ]);
  const ctx = bookingEmailContext(booking, row, pet);

  let sent = 0;
  let skipped = 0;

  for (const participant of reviewReminderParticipants(booking)) {
    const uniqueKey = reviewReminderUniqueKey(participant.type, bookingId, participant.userId);
    const alreadyReviewed = await userHasReviewForBooking(participant.userId, bookingId);
    const alreadyEmailed = await reviewReminderAlreadySent(
      participant.type,
      bookingId,
      participant.userId,
    );
    const recipientEmail = await resolveRecipientEmail(participant.userId);
    const recipientEmailPresent = Boolean(recipientEmail);

    if (alreadyReviewed) {
      skipped += 1;
      logReviewParticipantResult(bookingId, path, {
        recipientRole: participant.role,
        recipientUserId: participant.userId,
        recipientEmailPresent,
        alreadyReviewed: true,
        alreadyEmailed,
        uniqueKey,
        smtpResult: "skipped_review_submitted",
      });
      continue;
    }

    if (alreadyEmailed) {
      skipped += 1;
      logReviewParticipantResult(bookingId, path, {
        recipientRole: participant.role,
        recipientUserId: participant.userId,
        recipientEmailPresent,
        alreadyReviewed: false,
        alreadyEmailed: true,
        uniqueKey,
        smtpResult: "skipped_duplicate",
      });
      continue;
    }

    const otherId =
      participant.userId === booking.pet_parent_id
        ? booking.pet_friend_id
        : booking.pet_parent_id;
    const [recipientName, otherName] = await Promise.all([
      loadDisplayName(participant.userId),
      loadDisplayName(otherId),
    ]);

    const result = await sendBookingEmailAsync({
      type: participant.type,
      role: participant.role,
      userId: participant.userId,
      data: {
        ...ctx,
        recipientName,
        otherPartyName: otherName,
        recipientRole: participant.role,
      },
      requestId: booking.request_id,
      bookingId: booking.id,
    });

    if (result.sent) sent += 1;
    else skipped += 1;

    logReviewParticipantResult(bookingId, path, {
      recipientRole: participant.role,
      recipientUserId: participant.userId,
      recipientEmailPresent,
      alreadyReviewed: false,
      alreadyEmailed: false,
      uniqueKey,
      smtpResult: result.sent
        ? "sent"
        : result.reason === "send_failed"
          ? "send_failed"
          : result.reason ?? "skipped",
      errorCode: result.reason ?? null,
    });
  }

  console.info("[booking-review-email] summary", {
    bookingId,
    path,
    sent,
    skipped,
  });

  return { sent, skipped };
}

/** Cron recovery: email review requests for recently completed bookings (idempotent). */
export async function processPendingBookingReviewEmails(
  limit = 100,
): Promise<{ processed: number; sent: number; skipped: number; configError?: boolean }> {
  const { checkReviewEmailConfiguration, onBookingCompleted } = await import(
    "@/lib/booking-completion"
  );

  const config = checkReviewEmailConfiguration();
  if (!config.ok) {
    console.error("[booking-review-email] cron recovery configuration missing", {
      missing: config.missing,
    });
    return { processed: 0, sent: 0, skipped: 0, configError: true };
  }

  const admin = createAdminClient();
  if (!admin) {
    console.error("[booking-review-email] cron recovery admin client unavailable");
    return { processed: 0, sent: 0, skipped: 0, configError: true };
  }

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 90);

  const { data: bookings, error } = await admin
    .from("bookings")
    .select("id")
    .eq("status", "completed")
    .not("completed_at", "is", null)
    .gte("completed_at", since.toISOString())
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[booking-review-email] cron recovery query failed", {
      code: error.code,
      message: error.message,
    });
    return { processed: 0, sent: 0, skipped: 0 };
  }

  let sent = 0;
  let skipped = 0;

  for (const row of bookings ?? []) {
    const result = await onBookingCompleted(row.id as string, "cron");
    sent += result.sent;
    skipped += result.skipped;
  }

  console.info("[booking-review-email] cron recovery complete", {
    processed: bookings?.length ?? 0,
    sent,
    skipped,
  });

  return { processed: bookings?.length ?? 0, sent, skipped };
}
