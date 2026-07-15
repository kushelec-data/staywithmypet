import "server-only";

import { formatBookingDatesForRow } from "@/lib/date-format";
import { sendTransactionalEmail } from "@/lib/email-send";
import {
  buildNewMessageNotificationEmail,
  logMessageEmailEvent,
  maskUserId,
  messageEmailDedupeKey,
  RECENTLY_ACTIVE_MS,
  truncateMessagePreview,
  type MessageEmailSkipReason,
} from "@/lib/message-notification-email";
import { resolveEmailLocale } from "@/lib/email-templates/locale";
import { createAdminClient } from "@/lib/supabase/admin";

type ConversationRow = {
  id: string;
  pet_parent_id: string;
  pet_friend_id: string;
  request_id: string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
};

export type DeliverNewMessageNotificationInput = {
  conversationId: string;
  messageId: string;
  senderUserId: string;
  recipientUserId: string;
};

export type DeliverNewMessageNotificationResult = {
  sent: boolean;
  skipped: boolean;
  notificationAssumed: boolean;
  reason?: MessageEmailSkipReason;
};

async function loadConversation(conversationId: string): Promise<ConversationRow | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("conversations")
    .select("id, pet_parent_id, pet_friend_id, request_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (error || !data) return null;
  return data as ConversationRow;
}

async function loadMessage(messageId: string): Promise<MessageRow | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("messages")
    .select("id, conversation_id, sender_id, body")
    .eq("id", messageId)
    .maybeSingle();

  if (error || !data) return null;
  return data as MessageRow;
}

async function recipientRecentlyViewedConversation(
  conversationId: string,
  recipientUserId: string,
  senderUserId: string,
  excludeMessageId: string,
): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;

  const { data, error } = await admin
    .from("messages")
    .select("read_at, created_at")
    .eq("conversation_id", conversationId)
    .eq("sender_id", senderUserId)
    .neq("id", excludeMessageId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.read_at) return false;

  const readAt = new Date(data.read_at).getTime();
  if (!Number.isFinite(readAt)) return false;
  return Date.now() - readAt < RECENTLY_ACTIVE_MS;
}

async function loadConversationEmailContext(conversation: ConversationRow): Promise<{
  petName: string | null;
  bookingDateRange: string | null;
  bookingStatus: string | null;
  bookingId: string | null;
  requestId: string | null;
}> {
  const admin = createAdminClient();
  if (!admin) {
    return {
      petName: null,
      bookingDateRange: null,
      bookingStatus: null,
      bookingId: null,
      requestId: conversation.request_id,
    };
  }

  const requestId = conversation.request_id;
  const [{ data: booking }, { data: request }] = await Promise.all([
    admin
      .from("bookings")
      .select("id, status, start_date, end_date")
      .eq("request_id", requestId)
      .maybeSingle(),
    admin
      .from("requests")
      .select("pet_id, requested_dates, date_from, date_to")
      .eq("id", requestId)
      .maybeSingle(),
  ]);

  let petName: string | null = null;
  const petId = (request?.pet_id as string | null) ?? null;
  if (petId) {
    const { data: pet } = await admin.from("pets").select("name").eq("id", petId).maybeSingle();
    petName = (pet?.name as string | null)?.trim() || null;
  }

  let bookingDateRange: string | null = null;
  let bookingStatus: string | null = null;
  let bookingId: string | null = null;

  if (booking) {
    bookingId = booking.id as string;
    bookingStatus = booking.status as string;
    bookingDateRange = formatBookingDatesForRow({
      requested_dates: (request?.requested_dates as string[] | null) ?? null,
      date_from: (request?.date_from as string | null) ?? (booking.start_date as string),
      date_to: (request?.date_to as string | null) ?? (booking.end_date as string),
    });
  } else if (request) {
    bookingDateRange = formatBookingDatesForRow({
      requested_dates: request.requested_dates as string[] | null,
      date_from: request.date_from as string | null,
      date_to: request.date_to as string | null,
    });
  }

  return { petName, bookingDateRange, bookingStatus, bookingId, requestId };
}

export async function deliverNewMessageNotification(
  input: DeliverNewMessageNotificationInput,
): Promise<DeliverNewMessageNotificationResult> {
  const conversationId = input.conversationId.trim();
  const messageId = input.messageId.trim();
  const senderUserId = input.senderUserId.trim();
  const recipientUserId = input.recipientUserId.trim();

  logMessageEmailEvent("start", {
    conversation_id: conversationId,
    message_id: messageId,
    sender_user_id: maskUserId(senderUserId),
    recipient_user_id: maskUserId(recipientUserId),
  });

  if (!conversationId || !messageId || !senderUserId || !recipientUserId) {
    logMessageEmailEvent("skip", { reason: "validation_failed" });
    return { sent: false, skipped: true, notificationAssumed: false, reason: "validation_failed" };
  }

  if (senderUserId === recipientUserId) {
    logMessageEmailEvent("skip", { reason: "validation_failed", detail: "self_recipient" });
    return { sent: false, skipped: true, notificationAssumed: false, reason: "validation_failed" };
  }

  const [message, conversation] = await Promise.all([
    loadMessage(messageId),
    loadConversation(conversationId),
  ]);

  if (!message || message.sender_id !== senderUserId || message.conversation_id !== conversationId) {
    logMessageEmailEvent("skip", { reason: "validation_failed", detail: "message_mismatch" });
    return { sent: false, skipped: true, notificationAssumed: false, reason: "validation_failed" };
  }

  if (!conversation) {
    logMessageEmailEvent("skip", { reason: "validation_failed", detail: "conversation_missing" });
    return { sent: false, skipped: true, notificationAssumed: false, reason: "validation_failed" };
  }

  const participants = new Set([conversation.pet_parent_id, conversation.pet_friend_id]);
  if (!participants.has(senderUserId) || !participants.has(recipientUserId)) {
    logMessageEmailEvent("skip", { reason: "validation_failed", detail: "not_participant" });
    return { sent: false, skipped: true, notificationAssumed: false, reason: "validation_failed" };
  }

  const recentlyActive = await recipientRecentlyViewedConversation(
    conversationId,
    recipientUserId,
    senderUserId,
    messageId,
  );
  if (recentlyActive) {
    logMessageEmailEvent("skip", {
      conversation_id: conversationId,
      message_id: messageId,
      reason: "recipient_recently_active",
      notification_created: "assumed_db_trigger",
    });
    return {
      sent: false,
      skipped: true,
      notificationAssumed: true,
      reason: "recipient_recently_active",
    };
  }

  const uniqueKey = messageEmailDedupeKey(conversationId, recipientUserId);
  const admin = createAdminClient();
  if (!admin) {
    logMessageEmailEvent("skip", { reason: "no_admin" });
    return { sent: false, skipped: true, notificationAssumed: true, reason: "no_admin" };
  }

  const [{ data: senderProfile }, { data: recipientProfile }] = await Promise.all([
    admin.from("profiles").select("display_name").eq("id", senderUserId).maybeSingle(),
    admin.from("profiles").select("display_name").eq("id", recipientUserId).maybeSingle(),
  ]);

  const senderName = (senderProfile?.display_name as string | null)?.trim() || "Member";
  const recipientName = (recipientProfile?.display_name as string | null)?.trim() || "Member";
  const emailContext = await loadConversationEmailContext(conversation);
  const locale = await resolveEmailLocale(recipientUserId);
  const preview = truncateMessagePreview(message.body);

  const template = buildNewMessageNotificationEmail(
    {
      recipientName,
      senderName,
      conversationId,
      messagePreview: preview,
      petName: emailContext.petName,
      bookingDateRange: emailContext.bookingDateRange,
      bookingStatus: emailContext.bookingStatus,
    },
    locale,
  );

  const result = await sendTransactionalEmail({
    eventType: "new_message",
    userId: recipientUserId,
    uniqueKey,
    requestId: emailContext.requestId,
    bookingId: emailContext.bookingId,
    context: {
      recipientName,
      senderName,
      conversationId,
      message: preview,
      petName: emailContext.petName ?? undefined,
      locale,
    },
  });

  if (result.reason === "duplicate") {
    logMessageEmailEvent("skip", {
      conversation_id: conversationId,
      message_id: messageId,
      reason: "cooldown_duplicate",
      unique_key: uniqueKey,
      notification_created: "assumed_db_trigger",
    });
    return {
      sent: false,
      skipped: true,
      notificationAssumed: true,
      reason: "cooldown_duplicate",
    };
  }

  logMessageEmailEvent(result.sent ? "sent" : "failed", {
    conversation_id: conversationId,
    message_id: messageId,
    sender_user_id: maskUserId(senderUserId),
    recipient_user_id: maskUserId(recipientUserId),
    recipient_email_present: result.reason !== "no_email",
    notification_created: "assumed_db_trigger",
    email_skipped_reason: result.reason ?? null,
    smtp_success: result.sent,
    unique_key: uniqueKey,
    subject: template.subject,
  });

  if (result.sent) {
    return { sent: true, skipped: false, notificationAssumed: true };
  }

  return {
    sent: false,
    skipped: result.skipped,
    notificationAssumed: true,
    reason: (result.reason as MessageEmailSkipReason | undefined) ?? "send_failed",
  };
}
