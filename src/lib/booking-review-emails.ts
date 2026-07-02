import "server-only";

import { sendBookingEmailAsync } from "@/lib/emails/send-booking";
import type { EmailRecipientRole, EmailTemplateContext } from "@/lib/emails/types";
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
};

type RequestEmailRow = {
  care_type: string | null;
  requested_dates: string[] | null;
};

type ReviewEmailResult = { sent: number; skipped: number };

function normalizeSpecies(raw: string | null): PetSpecies {
  if (raw === "dog" || raw === "cat" || raw === "rabbit" || raw === "bird" || raw === "other") {
    return raw;
  }
  return "other";
}

async function loadBooking(bookingId: string): Promise<BookingEmailRow | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("bookings")
    .select("id, request_id, pet_id, pet_parent_id, pet_friend_id, start_date, end_date")
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !data) return null;
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

/**
 * Send Excel "Leave a Review" emails (review_reminder_parent / review_reminder_friend)
 * when a booking is completed. Skips recipients who already reviewed or were already emailed.
 */
export async function triggerBookingReviewRequestEmails(
  bookingId: string,
): Promise<ReviewEmailResult> {
  const booking = await loadBooking(bookingId);
  if (!booking) return { sent: 0, skipped: 0 };

  const [row, pet] = await Promise.all([
    loadRequest(booking.request_id),
    loadPet(booking.pet_id),
  ]);
  const ctx = bookingEmailContext(booking, row, pet);

  let sent = 0;
  let skipped = 0;

  const participants: Array<{
    userId: string;
    role: EmailRecipientRole;
    type: "review_reminder_parent" | "review_reminder_friend";
  }> = [
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

  for (const participant of participants) {
    if (await userHasReviewForBooking(participant.userId, bookingId)) {
      skipped += 1;
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
  }

  return { sent, skipped };
}

/** Cron/backup: email review requests for recently completed bookings (idempotent). */
export async function processPendingBookingReviewEmails(
  limit = 100,
): Promise<{ processed: number; sent: number; skipped: number }> {
  const admin = createAdminClient();
  if (!admin) return { processed: 0, sent: 0, skipped: 0 };

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 90);

  const { data: bookings, error } = await admin
    .from("bookings")
    .select("id")
    .eq("status", "completed")
    .gte("completed_at", since.toISOString())
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[email] pending booking review query failed", error.message);
    return { processed: 0, sent: 0, skipped: 0 };
  }

  let sent = 0;
  let skipped = 0;

  for (const row of bookings ?? []) {
    const result = await triggerBookingReviewRequestEmails(row.id as string);
    sent += result.sent;
    skipped += result.skipped;
  }

  return { processed: bookings?.length ?? 0, sent, skipped };
}
