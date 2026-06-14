import "server-only";

import { sendBookingEmail } from "@/lib/emails/send-booking";
import { queueEmailEvent } from "@/lib/email-send";
import type { EmailRecipientRole, EmailTemplateContext } from "@/lib/emails/types";
import { speciesDisplayLabel, type PetSpecies } from "@/lib/pet-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { profileDisplayName } from "@/lib/profile-display";
import type { ProfileRole } from "@/lib/profile-setup";
import type { ProfileActiveMode } from "@/lib/profile-mode";
import type { EmailEventType } from "@/lib/emails";

type RequestEmailRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  pet_parent_id: string;
  pet_friend_id: string;
  pet_id: string | null;
  care_type: string | null;
  date_from: string | null;
  date_to: string | null;
  requested_dates: string[] | null;
};

type BookingEmailRow = {
  id: string;
  request_id: string;
  pet_id: string;
  pet_parent_id: string;
  pet_friend_id: string;
  start_date: string;
  end_date: string;
};

type PetEmailRow = {
  name: string | null;
  species: string | null;
  breed: string | null;
};

function roleForUserOnRequest(row: RequestEmailRow, userId: string): EmailRecipientRole {
  return row.pet_parent_id === userId ? "pet_parent" : "pet_friend";
}

function normalizeSpecies(raw: string | null): PetSpecies {
  if (raw === "dog" || raw === "cat" || raw === "rabbit" || raw === "bird" || raw === "other") {
    return raw;
  }
  return "other";
}

async function loadRequest(requestId: string): Promise<RequestEmailRow | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("requests")
    .select(
      "id, sender_id, receiver_id, pet_parent_id, pet_friend_id, pet_id, care_type, date_from, date_to, requested_dates",
    )
    .eq("id", requestId)
    .maybeSingle();

  if (error || !data) return null;
  return data as RequestEmailRow;
}

async function loadBookingByRequestId(requestId: string): Promise<BookingEmailRow | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("bookings")
    .select("id, request_id, pet_id, pet_parent_id, pet_friend_id, start_date, end_date")
    .eq("request_id", requestId)
    .maybeSingle();

  if (error || !data) return null;
  return data as BookingEmailRow;
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

async function loadPet(petId: string | null): Promise<{ name: string; typeLabel: string }> {
  if (!petId) return { name: "your pet", typeLabel: "pet" };
  const admin = createAdminClient();
  if (!admin) return { name: "your pet", typeLabel: "pet" };

  const { data } = await admin
    .from("pets")
    .select("name, species, breed")
    .eq("id", petId)
    .maybeSingle();

  const row = data as PetEmailRow | null;
  const name = row?.name?.trim() || "your pet";
  const species = normalizeSpecies(row?.species ?? null);
  const typeLabel = speciesDisplayLabel(species, row?.breed ?? null).toLowerCase();
  return { name, typeLabel };
}

async function loadDisplayName(userId: string): Promise<string> {
  const admin = createAdminClient();
  if (!admin) return "Member";

  const { data } = await admin.from("profiles").select("display_name").eq("id", userId).maybeSingle();
  return profileDisplayName(data as { display_name: string } | null) ?? "Member";
}

function requestContext(
  row: RequestEmailRow,
  pet: { name: string; typeLabel: string },
  otherPartyName: string,
): EmailTemplateContext {
  return {
    petName: pet.name,
    petType: pet.typeLabel,
    careType: row.care_type ?? undefined,
    dateFrom: row.date_from,
    dateTo: row.date_to,
    requestedDates: row.requested_dates,
    otherPartyName,
  };
}

function bookingContext(
  row: BookingEmailRow,
  pet: { name: string; typeLabel: string },
  careType: string | null,
  request?: RequestEmailRow | null,
): EmailTemplateContext {
  return {
    petName: pet.name,
    petType: pet.typeLabel,
    careType: careType ?? undefined,
    dateFrom: row.start_date,
    dateTo: row.end_date,
    requestedDates: request?.requested_dates ?? null,
    bookingId: row.id,
  };
}

export function triggerWelcomeEmailsForRole(userId: string, role: ProfileRole): void {
  const events: EmailEventType[] = [];
  if (role === "pet_parent" || role === "both") events.push("welcome_pet_parent");
  if (role === "pet_friend" || role === "both") events.push("welcome_pet_friend");

  for (const eventType of events) {
    queueEmailEvent({ eventType, userId });
  }
}

export function triggerWelcomeForModeSwitch(userId: string, targetMode: ProfileActiveMode): void {
  const eventType: EmailEventType =
    targetMode === "pet_parent" ? "welcome_pet_parent" : "welcome_pet_friend";
  queueEmailEvent({ eventType, userId });
}

export function triggerProfileCompletedEmail(userId: string, recipientName?: string): void {
  triggerProfileVerifiedEmail(userId, recipientName);
}

/** Excel row 1 — profile verified / welcome (once per user). */
export function triggerProfileVerifiedEmail(userId: string, recipientName?: string): void {
  queueEmailEvent({
    eventType: "profile_verified",
    userId,
    context: { recipientName },
  });
}

export function triggerEmailVerified(userId: string, recipientName?: string): void {
  queueEmailEvent({
    eventType: "email_verified",
    userId,
    context: { recipientName },
  });
}

export function triggerPhoneVerified(userId: string, recipientName?: string): void {
  queueEmailEvent({
    eventType: "phone_verified",
    userId,
    context: { recipientName },
  });
}

export async function triggerRequestSentEmail(requestId: string): Promise<void> {
  const row = await loadRequest(requestId);
  if (!row?.sender_id) return;

  const [pet, senderName, otherName] = await Promise.all([
    loadPet(row.pet_id),
    loadDisplayName(row.sender_id),
    loadDisplayName(row.receiver_id),
  ]);

  sendBookingEmail({
    type: "request_sent",
    role: roleForUserOnRequest(row, row.sender_id),
    userId: row.sender_id,
    data: {
      recipientName: senderName,
      ...requestContext(row, pet, otherName),
    },
    requestId: row.id,
  });
}

export async function triggerRequestReceivedEmail(requestId: string): Promise<void> {
  const row = await loadRequest(requestId);
  if (!row?.receiver_id) return;

  const [pet, senderName, recipientName] = await Promise.all([
    loadPet(row.pet_id),
    loadDisplayName(row.sender_id),
    loadDisplayName(row.receiver_id),
  ]);

  sendBookingEmail({
    type: "request_received",
    role: roleForUserOnRequest(row, row.receiver_id),
    userId: row.receiver_id,
    data: {
      recipientName,
      ...requestContext(row, pet, senderName),
    },
    requestId: row.id,
  });
}

export async function triggerRequestStatusEmails(
  requestId: string,
  decision: "accepted" | "declined",
): Promise<void> {
  const row = await loadRequest(requestId);
  if (!row) return;

  if (decision === "accepted") {
    await triggerBookingConfirmedForRequest(requestId);
    return;
  }

  const declinerId = row.receiver_id;
  const senderId = row.sender_id;
  const [pet, declinerName, senderName, declinerPartyName, senderPartyName] = await Promise.all([
    loadPet(row.pet_id),
    loadDisplayName(declinerId),
    loadDisplayName(senderId),
    loadDisplayName(declinerId === row.pet_parent_id ? row.pet_friend_id : row.pet_parent_id),
    loadDisplayName(senderId === row.pet_parent_id ? row.pet_friend_id : row.pet_parent_id),
  ]);

  const ctx = requestContext(row, pet, declinerPartyName);

  sendBookingEmail({
    type: "request_declined_by_you",
    role: roleForUserOnRequest(row, declinerId),
    userId: declinerId,
    data: { recipientName: declinerName, ...ctx },
    requestId: row.id,
  });

  sendBookingEmail({
    type: "request_declined",
    role: roleForUserOnRequest(row, senderId),
    userId: senderId,
    data: {
      recipientName: senderName,
      ...requestContext(row, pet, senderPartyName),
    },
    requestId: row.id,
  });
}

function bookingStartsTomorrowAt(startDate: string): Date | null {
  const parts = startDate.slice(0, 10).split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [year, month, day] = parts;
  const start = new Date(Date.UTC(year, month - 1, day));
  const reminder = new Date(start);
  reminder.setUTCDate(reminder.getUTCDate() - 1);
  reminder.setUTCHours(9, 0, 0, 0);
  if (reminder.getTime() <= Date.now()) return null;
  return reminder;
}

function scheduleBookingStartsTomorrowEmail(
  booking: BookingEmailRow,
  requestId: string,
  userId: string,
  role: EmailRecipientRole,
  ctx: EmailTemplateContext,
): void {
  const scheduleAt = bookingStartsTomorrowAt(booking.start_date);
  if (!scheduleAt) return;

  sendBookingEmail({
    type:
      role === "pet_parent" ? "booking_starts_tomorrow_parent" : "booking_starts_tomorrow_friend",
    role,
    userId,
    data: ctx,
    requestId,
    bookingId: booking.id,
    scheduleAt,
  });
}

export function triggerNewMessageEmail(input: {
  recipientUserId: string;
  recipientName?: string;
  senderName: string;
  conversationId: string;
  messageId: string;
}): void {
  queueEmailEvent({
    eventType: "new_message",
    userId: input.recipientUserId,
    uniqueKey: `new_message_${input.conversationId}_${input.messageId}`,
    context: {
      recipientName: input.recipientName,
      senderName: input.senderName,
      conversationId: input.conversationId,
    },
  });
}

export async function triggerBookingConfirmedForRequest(requestId: string): Promise<void> {
  const booking = await loadBookingByRequestId(requestId);
  if (!booking) return;

  const row = await loadRequest(requestId);
  const careType = row?.care_type ?? null;
  const pet = await loadPet(booking.pet_id);
  const ctx = bookingContext(booking, pet, careType, row);

  for (const userId of [booking.pet_parent_id, booking.pet_friend_id]) {
    const recipientName = await loadDisplayName(userId);
    const otherId =
      userId === booking.pet_parent_id ? booking.pet_friend_id : booking.pet_parent_id;
    const otherName = await loadDisplayName(otherId);
    const role: EmailRecipientRole =
      userId === booking.pet_parent_id ? "pet_parent" : "pet_friend";
    const data = { ...ctx, recipientName, otherPartyName: otherName, recipientRole: role };

    sendBookingEmail({
      type: "booking_confirmed",
      role,
      userId,
      data,
      requestId,
      bookingId: booking.id,
    });

    scheduleBookingStartsTomorrowEmail(booking, requestId, userId, role, data);
  }
}

export async function triggerBookingCompletedEmails(bookingId: string): Promise<void> {
  const booking = await loadBooking(bookingId);
  if (!booking) return;

  const row = await loadRequest(booking.request_id);
  const careType = row?.care_type ?? null;
  const pet = await loadPet(booking.pet_id);
  const ctx = bookingContext(booking, pet, careType, row);

  for (const userId of [booking.pet_parent_id, booking.pet_friend_id]) {
    const recipientName = await loadDisplayName(userId);
    const otherId =
      userId === booking.pet_parent_id ? booking.pet_friend_id : booking.pet_parent_id;
    const otherName = await loadDisplayName(otherId);
    const role: EmailRecipientRole =
      userId === booking.pet_parent_id ? "pet_parent" : "pet_friend";

    sendBookingEmail({
      type: role === "pet_parent" ? "review_reminder_parent" : "review_reminder_friend",
      role,
      userId,
      data: { ...ctx, recipientName, otherPartyName: otherName },
      requestId: booking.request_id,
      bookingId: booking.id,
    });
  }
}

