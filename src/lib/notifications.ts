import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { formatSupabaseError } from "@/lib/profile-load";
import { isMissingRelationError, isPostgrestError } from "@/lib/supabase-errors";

export type NotificationType =
  | "request_received"
  | "request_accepted"
  | "request_declined"
  | "new_message"
  | "booking_completed"
  | "booking_review_parent"
  | "booking_review_friend";

/** Legacy enum labels still present before migration is applied. */
const LEGACY_NOTIFICATION_TYPES: Record<string, NotificationType> = {
  care_request_received: "request_received",
  message_received: "new_message",
};

type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  related_request_id: string | null;
  related_conversation_id: string | null;
  related_booking_id: string | null;
  read_at: string | null;
  created_at: string;
};

export type AppNotification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  relatedRequestId: string | null;
  relatedConversationId: string | null;
  relatedBookingId: string | null;
  readAt: string | null;
  createdAt: string;
};

const NOTIFICATION_SELECT =
  "id, user_id, type, title, body, related_request_id, related_conversation_id, related_booking_id, read_at, created_at";

function normalizeNotificationType(type: string): NotificationType {
  if (type in LEGACY_NOTIFICATION_TYPES) {
    return LEGACY_NOTIFICATION_TYPES[type];
  }
  return type as NotificationType;
}

function mapRow(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    type: normalizeNotificationType(row.type),
    title: row.title,
    body: row.body,
    relatedRequestId: row.related_request_id,
    relatedConversationId: row.related_conversation_id,
    relatedBookingId: row.related_booking_id ?? null,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export function formatNotificationsError(error: unknown): string {
  if (isPostgrestError(error)) {
    if (isMissingRelationError(error)) {
      return "Notifications are not set up yet. Apply the latest Supabase migrations.";
    }
    return formatSupabaseError(error);
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Could not load notifications.";
}

/** Where to go when the user opens a notification. */
export function notificationHref(notification: AppNotification): string {
  switch (notification.type) {
    case "request_received":
      return "/requests?direction=incoming";
    case "request_accepted":
    case "request_declined":
      return "/requests?direction=outgoing";
    case "new_message":
      return notification.relatedConversationId
        ? `/messages?conversation=${notification.relatedConversationId}`
        : "/messages";
    case "booking_completed":
    case "booking_review_parent":
    case "booking_review_friend":
      return notification.relatedBookingId
        ? `/dashboard/bookings/${notification.relatedBookingId}`
        : "/dashboard/bookings?tab=completed";
    default:
      return "/requests?direction=incoming";
  }
}

const NOTIFICATION_SELECT_LEGACY =
  "id, user_id, type, title, body, related_request_id, related_conversation_id, read_at, created_at";

export async function fetchNotifications(
  supabase: SupabaseClient,
  userId: string,
  limit = 25,
): Promise<AppNotification[]> {
  const primary = await supabase
    .from("notifications")
    .select(NOTIFICATION_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!primary.error) {
    return (primary.data ?? []).map((row) => mapRow(row as NotificationRow));
  }

  if (!isMissingRelationError(primary.error)) {
    throw primary.error;
  }

  const fallback = await supabase
    .from("notifications")
    .select(NOTIFICATION_SELECT_LEGACY)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (fallback.error) throw fallback.error;

  return (fallback.data ?? []).map((row) =>
    mapRow({ ...(row as NotificationRow), related_booking_id: null }),
  );
}

export async function fetchUnreadNotificationCount(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    if (isMissingRelationError(error)) return 0;
    throw error;
  }
  return count ?? 0;
}

export async function markNotificationRead(
  supabase: SupabaseClient,
  notificationId: string,
  userId: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: now })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) throw error;
}

export async function markAllNotificationsRead(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: now })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) throw error;
}

const notificationChannelMarker = (userId: string) => `notifications:${userId}`;

/** Drop stale notification channels before creating a fresh one. */
function removeStaleNotificationChannels(
  supabase: SupabaseClient,
  userId: string,
): void {
  const marker = notificationChannelMarker(userId);
  for (const existing of supabase.getChannels()) {
    if (existing.topic.includes(marker)) {
      supabase.removeChannel(existing);
    }
  }
}

export function subscribeToNotifications(
  supabase: SupabaseClient,
  userId: string,
  onChange: () => void,
): () => void {
  removeStaleNotificationChannels(supabase, userId);

  const channelName = `${notificationChannelMarker(userId)}:${Date.now()}`;

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      () => {
        onChange();
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function isReviewRequestNotification(notification: AppNotification): boolean {
  return (
    notification.type === "booking_review_parent" ||
    notification.type === "booking_review_friend"
  );
}

export function formatNotificationTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (sameDay) {
      return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    }
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}
