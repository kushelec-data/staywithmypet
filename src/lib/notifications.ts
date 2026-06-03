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
  | "booking_review_friend"
  | "membership_activated"
  | "membership_expiry_reminder"
  | "membership_renewal_reminder";

export type NotificationCategory =
  | "requests"
  | "messages"
  | "bookings"
  | "reviews"
  | "membership";

const REQUEST_NOTIFICATION_TYPES: NotificationType[] = [
  "request_received",
  "request_accepted",
  "request_declined",
];

const MESSAGE_NOTIFICATION_TYPES: NotificationType[] = ["new_message"];

const BOOKING_NOTIFICATION_TYPES: NotificationType[] = ["booking_completed"];

const REVIEW_NOTIFICATION_TYPES: NotificationType[] = [
  "booking_review_parent",
  "booking_review_friend",
];

const MEMBERSHIP_NOTIFICATION_TYPES: NotificationType[] = [
  "membership_activated",
  "membership_expiry_reminder",
  "membership_renewal_reminder",
];

export const NOTIFICATION_CATEGORY_ORDER: NotificationCategory[] = [
  "requests",
  "messages",
  "bookings",
  "reviews",
  "membership",
];

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

export const NOTIFICATIONS_REFRESH_EVENT = "staywithmypet:notifications-refresh";

/** Notify the bell (and other listeners) to reload counts. */
export function notifyNotificationsRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_REFRESH_EVENT));
}

export function notificationCategory(type: NotificationType): NotificationCategory {
  if (REQUEST_NOTIFICATION_TYPES.includes(type)) return "requests";
  if (MESSAGE_NOTIFICATION_TYPES.includes(type)) return "messages";
  if (BOOKING_NOTIFICATION_TYPES.includes(type)) return "bookings";
  if (REVIEW_NOTIFICATION_TYPES.includes(type)) return "reviews";
  if (MEMBERSHIP_NOTIFICATION_TYPES.includes(type) || type.startsWith("membership_")) {
    return "membership";
  }
  return "requests";
}

/** Stable key so duplicate rows for the same event collapse to the newest. */
export function notificationDedupeKey(notification: AppNotification): string {
  if (notification.relatedBookingId) {
    return `${notification.type}:booking:${notification.relatedBookingId}`;
  }
  if (notification.relatedConversationId) {
    return `${notification.type}:conversation:${notification.relatedConversationId}`;
  }
  if (notification.relatedRequestId) {
    return `${notification.type}:request:${notification.relatedRequestId}`;
  }
  return `${notification.type}:id:${notification.id}`;
}

export function dedupeNotifications(notifications: AppNotification[]): AppNotification[] {
  const byKey = new Map<string, AppNotification>();
  for (const item of notifications) {
    const key = notificationDedupeKey(item);
    const existing = byKey.get(key);
    if (!existing || item.createdAt > existing.createdAt) {
      byKey.set(key, item);
    }
  }
  return [...byKey.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function groupNotificationsByCategory(
  notifications: AppNotification[],
): { category: NotificationCategory; items: AppNotification[] }[] {
  const deduped = dedupeNotifications(notifications);
  const buckets = new Map<NotificationCategory, AppNotification[]>();
  for (const category of NOTIFICATION_CATEGORY_ORDER) {
    buckets.set(category, []);
  }
  for (const item of deduped) {
    const category = notificationCategory(item.type);
    buckets.get(category)?.push(item);
  }
  return NOTIFICATION_CATEGORY_ORDER.map((category) => ({
    category,
    items: buckets.get(category) ?? [],
  })).filter((group) => group.items.length > 0);
}

export type NotificationActionKind =
  | "view_request"
  | "open_message"
  | "view_booking"
  | "leave_review"
  | "view_membership";

export function notificationActionKind(notification: AppNotification): NotificationActionKind {
  switch (notification.type) {
    case "new_message":
      return "open_message";
    case "booking_review_parent":
    case "booking_review_friend":
      return "leave_review";
    case "booking_completed":
      return "view_booking";
    case "membership_activated":
    case "membership_expiry_reminder":
    case "membership_renewal_reminder":
      return "view_membership";
    case "request_received":
    case "request_accepted":
    case "request_declined":
    default:
      return "view_request";
  }
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
    case "membership_activated":
    case "membership_expiry_reminder":
    case "membership_renewal_reminder":
      return "/membership";
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
    return dedupeNotifications((primary.data ?? []).map((row) => mapRow(row as NotificationRow)));
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

  return dedupeNotifications(
    (fallback.data ?? []).map((row) =>
      mapRow({ ...(row as NotificationRow), related_booking_id: null }),
    ),
  );
}

export async function fetchUnreadNotificationCount(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("notifications")
    .select(NOTIFICATION_SELECT)
    .eq("user_id", userId)
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    if (isMissingRelationError(error)) return 0;
    throw error;
  }

  return dedupeNotifications((data ?? []).map((row) => mapRow(row as NotificationRow))).length;
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
  notifyNotificationsRefresh();
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
  notifyNotificationsRefresh();
}

export async function markNotificationsReadForConversations(
  supabase: SupabaseClient,
  conversationIds: string[],
  userId: string,
): Promise<void> {
  const ids = [...new Set(conversationIds.filter(Boolean))];
  if (!ids.length) return;

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: now })
    .eq("user_id", userId)
    .in("related_conversation_id", ids)
    .is("read_at", null);

  if (error) {
    if (isMissingRelationError(error)) return;
    throw error;
  }

  notifyNotificationsRefresh();
}

export async function markNotificationsReadByTypes(
  supabase: SupabaseClient,
  userId: string,
  types: readonly NotificationType[],
): Promise<void> {
  if (!types.length) return;

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: now })
    .eq("user_id", userId)
    .in("type", [...types])
    .is("read_at", null);

  if (error) {
    if (isMissingRelationError(error)) return;
    throw error;
  }

  notifyNotificationsRefresh();
}

/** Mark all unread notifications for one care request. */
export async function markNotificationsReadForRequest(
  supabase: SupabaseClient,
  userId: string,
  requestId: string,
): Promise<void> {
  if (!requestId) return;

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: now })
    .eq("user_id", userId)
    .eq("related_request_id", requestId)
    .is("read_at", null);

  if (error) {
    if (isMissingRelationError(error)) return;
    throw error;
  }

  notifyNotificationsRefresh();
}

/** Mark all request-related notifications read (incoming + outgoing). */
export async function markRequestNotificationsRead(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  await markNotificationsReadByTypes(supabase, userId, REQUEST_NOTIFICATION_TYPES);
}

/** Mark all message notifications read. */
export async function markMessageNotificationsRead(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  await markNotificationsReadByTypes(supabase, userId, MESSAGE_NOTIFICATION_TYPES);
}

/** Mark booking + review notifications tied to one booking (and its request). */
export async function markBookingNotificationsRead(
  supabase: SupabaseClient,
  userId: string,
  bookingId: string,
  requestId?: string | null,
): Promise<void> {
  const now = new Date().toISOString();
  const filters = [`related_booking_id.eq.${bookingId}`];
  if (requestId) {
    filters.push(`related_request_id.eq.${requestId}`);
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: now })
    .eq("user_id", userId)
    .is("read_at", null)
    .or(filters.join(","));

  if (error) {
    if (isMissingRelationError(error)) return;
    throw error;
  }

  notifyNotificationsRefresh();
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
