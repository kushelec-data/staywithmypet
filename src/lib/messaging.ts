import type { PostgrestError, RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { formatCareTypeLabel } from "@/lib/care-type-options";
import { formatSupabaseError } from "@/lib/profile-load";
import { pickPrimaryPhotoUrl } from "@/lib/pet-photos";

type PetPhotoJoin = {
  public_url: string | null;
  is_primary: boolean;
  sort_order: number;
};
import {
  bookingStatusBadgeClasses,
  bookingStatusLabel,
  resolveBookingDisplayStatus,
  type BookingStatusCopy,
  type BookingTab,
} from "@/lib/bookings";
import { formatBookingDatesForRow, type DateFormatLocale } from "@/lib/date-format";
import { normalizeAvailabilityDates } from "@/lib/pet-availability";
import { formatRequestDateLabel, requestStatusBadgeClasses, requestStatusLabel, type RequestStatus, type RequestStatusCopy } from "@/lib/requests";
import type {
  BookingStatus,
  Database,
  MessageInboxPreviewRow,
  MessageRow as DbMessageRow,
} from "@/types/database";
import {
  MESSAGE_INBOX_PREVIEW_LEGACY_SELECT,
  MESSAGE_INBOX_PREVIEW_SELECT,
} from "@/types/database";
import { isMissingColumnError, isPostgrestError, logSupabaseError } from "@/lib/supabase-errors";
import { chatMessagePreviewText, type ChatMediaType } from "@/lib/chat-media";

function asMessagingDbClient(supabase: SupabaseClient): SupabaseClient<Database> {
  return supabase as SupabaseClient<Database>;
}

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  isOwn: boolean;
  storagePath: string | null;
  mediaType: ChatMediaType | null;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
};

export type SendMessageMedia = {
  storagePath: string;
  mediaType: ChatMediaType;
  fileName: string;
  fileSize: number;
  mimeType: string;
};

/** Grace period after a booking is cancelled before chat becomes read-only. */
export const CANCELLED_BOOKING_CHAT_GRACE_MS = 96 * 60 * 60 * 1000;

export type ConversationSummary = {
  id: string;
  requestId: string;
  bookingId: string | null;
  petId: string | null;
  petName: string | null;
  /** e.g. "Care for Paula" */
  threadTitle: string;
  petPhotoUrl: string | null;
  otherPartyId: string;
  otherPartyName: string;
  otherPartyAvatarUrl: string | null;
  requestStatus: RequestStatus;
  /** Persisted booking status from the database. */
  bookingStatus: BookingStatus | null;
  bookingStartDate: string | null;
  bookingEndDate: string | null;
  bookingRequestedDates: string[];
  /** Request span when `requested_dates` is empty (legacy rows). */
  requestDateFrom: string | null;
  requestDateTo: string | null;
  /** Set when the linked booking was cancelled (ISO). */
  bookingCancelledAt: string | null;
  dateLabel: string;
  /** Stable key for merge/dedup when booking dates match */
  dateRangeKey: string;
  careType: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  sortAt: string;
  /** Conversation row ids represented in inbox (merged threads include all source ids). */
  conversationIds: string[];
};

export type ConversationStatusDisplay = {
  label: string;
  badgeClasses: string;
};

/** Dispatched after messages/notifications are marked read for a thread. */
export const CONVERSATION_READ_EVENT = "swmp:conversation-read";

function conversationIdsFor(summary: Pick<ConversationSummary, "id" | "conversationIds">): string[] {
  const ids = summary.conversationIds?.length ? summary.conversationIds : [summary.id];
  return [...new Set(ids)];
}

export function formatConversationDateLabel(
  conversation: Pick<
    ConversationSummary,
    | "bookingRequestedDates"
    | "bookingStartDate"
    | "bookingEndDate"
    | "requestDateFrom"
    | "requestDateTo"
  >,
  locale?: DateFormatLocale,
): string {
  return formatBookingDatesForRow(
    {
      requested_dates: conversation.bookingRequestedDates,
      date_from: conversation.requestDateFrom ?? conversation.bookingStartDate,
      date_to: conversation.requestDateTo ?? conversation.bookingEndDate,
    },
    { locale },
  );
}

/** Date-aware booking tab for inbox badges and sorting (DB status unchanged). */
export function getConversationBookingDisplayStatus(
  conversation: Pick<
    ConversationSummary,
    "bookingStatus" | "bookingStartDate" | "bookingEndDate" | "bookingRequestedDates"
  >,
): BookingTab | null {
  if (!conversation.bookingStatus) return null;

  const requested = normalizeAvailabilityDates(conversation.bookingRequestedDates ?? []);
  const startDate = conversation.bookingStartDate ?? requested[0] ?? null;
  const endDate = conversation.bookingEndDate ?? requested[requested.length - 1] ?? null;

  if (!startDate || !endDate) {
    return conversation.bookingStatus as BookingTab;
  }

  return resolveBookingDisplayStatus({
    status: conversation.bookingStatus,
    start_date: startDate,
    end_date: endDate,
    requested_dates: requested,
  });
}

/** Single status source for inbox list, chat header, and badges (booking wins when linked). */
export function resolveConversationStatusDisplay(
  conversation: ConversationSummary,
  requestStatusCopy?: RequestStatusCopy,
  bookingStatusCopy?: BookingStatusCopy,
): ConversationStatusDisplay {
  const bookingDisplay = getConversationBookingDisplayStatus(conversation);
  if (bookingDisplay) {
    return {
      label: bookingStatusLabel(bookingDisplay, bookingStatusCopy),
      badgeClasses: bookingStatusBadgeClasses(bookingDisplay),
    };
  }
  return {
    label: requestStatusLabel(conversation.requestStatus, requestStatusCopy),
    badgeClasses: requestStatusBadgeClasses(conversation.requestStatus),
  };
}

function dateRangeKeyFromRequest(req: {
  date_from: string | null;
  date_to: string | null;
  starts_at: string | null;
  ends_at: string | null;
}): string {
  return [req.date_from, req.date_to, req.starts_at, req.ends_at]
    .map((v) => v ?? "")
    .join("|");
}

export function getCancelledBookingChatGraceEndsAt(
  cancelledAt: string | null | undefined,
): Date | null {
  if (!cancelledAt?.trim()) return null;
  const at = new Date(cancelledAt);
  if (Number.isNaN(at.getTime())) return null;
  return new Date(at.getTime() + CANCELLED_BOOKING_CHAT_GRACE_MS);
}

export function isCancelledBookingChatGraceActive(
  conversation: ConversationSummary,
  now: Date = new Date(),
): boolean {
  if (conversation.bookingStatus !== "cancelled") return false;
  const ends = getCancelledBookingChatGraceEndsAt(conversation.bookingCancelledAt);
  if (!ends) return true;
  return now < ends;
}

export function isCancelledBookingChatGraceExpired(
  conversation: ConversationSummary,
  now: Date = new Date(),
): boolean {
  if (conversation.bookingStatus !== "cancelled") return false;
  const ends = getCancelledBookingChatGraceEndsAt(conversation.bookingCancelledAt);
  if (!ends) return false;
  return now >= ends;
}

export function formatCancelledBookingChatGraceEnd(
  cancelledAt: string | null | undefined,
): string | null {
  const ends = getCancelledBookingChatGraceEndsAt(cancelledAt);
  if (!ends) return null;
  try {
    return ends.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return ends.toISOString();
  }
}

export function isConversationCompleted(conversation: ConversationSummary): boolean {
  const bookingDisplay = getConversationBookingDisplayStatus(conversation);
  if (
    conversation.requestStatus === "completed" ||
    conversation.bookingStatus === "completed" ||
    bookingDisplay === "completed"
  ) {
    return true;
  }
  if (conversation.requestStatus === "cancelled" || conversation.requestStatus === "declined") {
    return true;
  }
  if (conversation.bookingStatus === "cancelled") {
    return isCancelledBookingChatGraceExpired(conversation);
  }
  return false;
}

export function isConversationActiveBooking(conversation: ConversationSummary): boolean {
  if (isConversationCompleted(conversation)) return false;
  const bookingDisplay = getConversationBookingDisplayStatus(conversation);
  if (bookingDisplay === "active" || bookingDisplay === "upcoming") {
    return true;
  }
  return conversation.requestStatus === "accepted";
}

/** Merge duplicate inbox rows for the same pet/user when booking dates match. */
export function mergeConversationSummaries(
  conversations: ConversationSummary[],
): ConversationSummary[] {
  const groups = new Map<string, ConversationSummary[]>();

  for (const conversation of conversations) {
    const mergeKey = [
      conversation.petId ?? "",
      conversation.otherPartyId,
      conversation.dateRangeKey,
    ].join("::");
    const existing = groups.get(mergeKey);
    if (existing) {
      existing.push(conversation);
    } else {
      groups.set(mergeKey, [conversation]);
    }
  }

  const merged: ConversationSummary[] = [];

  for (const group of groups.values()) {
    if (group.length === 1) {
      merged.push(group[0]!);
      continue;
    }

    const byBooking = new Map<string | null, ConversationSummary[]>();
    for (const item of group) {
      const key = item.bookingId;
      const bucket = byBooking.get(key);
      if (bucket) {
        bucket.push(item);
      } else {
        byBooking.set(key, [item]);
      }
    }

    for (const bucket of byBooking.values()) {
      if (bucket.length === 1) {
        merged.push(bucket[0]!);
        continue;
      }

      const best = bucket.reduce((a, b) => (a.sortAt >= b.sortAt ? a : b));
      merged.push({
        ...best,
        unreadCount: bucket.reduce((sum, c) => sum + c.unreadCount, 0),
        conversationIds: [
          ...new Set(bucket.flatMap((c) => conversationIdsFor(c))),
        ],
      });
    }
  }

  return merged;
}

export function sortConversationSummaries(
  conversations: ConversationSummary[],
): ConversationSummary[] {
  return [...conversations].sort((a, b) => {
    const aUnread = a.unreadCount > 0 ? 0 : 1;
    const bUnread = b.unreadCount > 0 ? 0 : 1;
    if (aUnread !== bUnread) return aUnread - bUnread;

    const aCompleted = isConversationCompleted(a) ? 1 : 0;
    const bCompleted = isConversationCompleted(b) ? 1 : 0;
    if (aCompleted !== bCompleted) return aCompleted - bCompleted;

    const aActive = isConversationActiveBooking(a) ? 0 : 1;
    const bActive = isConversationActiveBooking(b) ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;

    if (a.sortAt !== b.sortAt) return a.sortAt < b.sortAt ? 1 : -1;
    return a.id.localeCompare(b.id);
  });
}

export function prepareInboxConversations(
  conversations: ConversationSummary[],
): ConversationSummary[] {
  return sortConversationSummaries(mergeConversationSummaries(conversations));
}

export function conversationThreadTitle(petName: string | null, fallbackName: string): string {
  if (petName?.trim()) return `Care for ${petName.trim()}`;
  return fallbackName;
}

export function canSendInConversation(conversation: ConversationSummary): boolean {
  if (conversation.requestStatus === "declined") {
    return false;
  }
  if (conversation.bookingStatus === "cancelled") {
    return isCancelledBookingChatGraceActive(conversation);
  }
  if (conversation.requestStatus === "cancelled") {
    return false;
  }
  return true;
}

type ConversationRow = {
  id: string;
  request_id: string;
  pet_parent_id: string | null;
  pet_friend_id: string | null;
  created_at: string;
};

type RequestRow = {
  id: string;
  status: RequestStatus;
  date_from: string | null;
  date_to: string | null;
  requested_dates: string[] | null;
  starts_at: string | null;
  ends_at: string | null;
  care_type: string | null;
  service_type: string | null;
  pet_id: string | null;
  pet_parent_id: string;
  pet_friend_id: string;
};

type MessageRow = DbMessageRow;

const MESSAGE_THREAD_SELECT =
  "id, conversation_id, sender_id, body, read_at, created_at, storage_path, media_type, file_name, file_size, mime_type" as const;

const MESSAGE_THREAD_LEGACY_SELECT =
  "id, conversation_id, sender_id, body, read_at, created_at" as const;

function mapMessageRow(row: MessageRow, userId: string): ChatMessage {
  const mediaType =
    row.media_type === "image" || row.media_type === "video"
      ? row.media_type
      : null;

  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body ?? "",
    readAt: row.read_at,
    createdAt: row.created_at,
    isOwn: row.sender_id === userId,
    storagePath: row.storage_path ?? null,
    mediaType,
    fileName: row.file_name ?? null,
    fileSize: row.file_size ?? null,
    mimeType: row.mime_type ?? null,
  };
}

const CONVERSATION_SELECT =
  "id, request_id, pet_parent_id, pet_friend_id, created_at";

const REQUEST_SELECT_EXTENDED =
  "id, status, date_from, date_to, requested_dates, starts_at, ends_at, care_type, service_type, pet_id, pet_parent_id, pet_friend_id";

const REQUEST_SELECT_BASE =
  "id, status, starts_at, ends_at, service_type, pet_id, pet_parent_id, pet_friend_id";

const REQUEST_SELECT_MINIMAL = "id, status, pet_parent_id, pet_friend_id, pet_id";

function isMissingRelationError(error: PostgrestError): boolean {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /relation.*does not exist/i.test(error.message) ||
    /schema cache/i.test(error.message)
  );
}

function isMissingRpcError(error: PostgrestError): boolean {
  return (
    error.code === "PGRST202" ||
    error.code === "42883" ||
    /function.*does not exist/i.test(error.message)
  );
}

function parseConversationId(data: unknown): string | null {
  if (typeof data === "string" && data) return data;
  return null;
}

export function formatMessagingError(error: unknown): string {
  if (isPostgrestError(error)) {
    if (isMissingRelationError(error)) {
      return "Messaging tables are not set up yet. Apply the latest Supabase migrations, then refresh.";
    }
    return formatSupabaseError(error);
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Could not load messages.";
}

async function fetchRecentInboxMessages(
  supabase: SupabaseClient,
  conversationIds: string[],
): Promise<MessageInboxPreviewRow[]> {
  if (!conversationIds.length) return [];

  const db = asMessagingDbClient(supabase);
  const withMedia = await db
    .from("messages")
    .select(MESSAGE_INBOX_PREVIEW_SELECT)
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });

  if (!withMedia.error) {
    return withMedia.data ?? [];
  }

  if (!isMissingColumnError(withMedia.error)) {
    throw withMedia.error;
  }

  const legacy = await db
    .from("messages")
    .select(MESSAGE_INBOX_PREVIEW_LEGACY_SELECT)
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });

  if (legacy.error) {
    throw legacy.error;
  }

  return (legacy.data ?? []).map((row) => ({
    conversation_id: row.conversation_id,
    body: row.body,
    created_at: row.created_at,
    media_type: null,
  }));
}

async function fetchRequestForConversation(
  supabase: SupabaseClient,
  requestId: string,
): Promise<RequestRow | null> {
  const tiers = [REQUEST_SELECT_EXTENDED, REQUEST_SELECT_BASE, REQUEST_SELECT_MINIMAL];

  for (const select of tiers) {
    const { data, error } = await supabase
      .from("requests")
      .select(select)
      .eq("id", requestId)
      .maybeSingle();

    if (!error && data) {
      const row = data as unknown as RequestRow;
      return {
        ...row,
        date_from: "date_from" in row ? row.date_from : null,
        date_to: "date_to" in row ? row.date_to : null,
        requested_dates: "requested_dates" in row ? row.requested_dates : null,
        care_type: "care_type" in row ? row.care_type : null,
        starts_at: row.starts_at ?? null,
        ends_at: row.ends_at ?? null,
        service_type: row.service_type ?? null,
      };
    }

    if (error && !isMissingColumnError(error)) {
      throw error;
    }
  }

  return null;
}

const REQUEST_CONVERSATION_STATUSES: RequestStatus[] = ["pending", "accepted", "completed"];

/** Create or return conversation for a request that allows messaging (RPC + client upsert fallback). */
export async function ensureConversationForRequest(
  supabase: SupabaseClient,
  requestId: string,
): Promise<string | null> {
  const request = await fetchRequestForConversation(supabase, requestId);
  if (!request) return null;
  if (!REQUEST_CONVERSATION_STATUSES.includes(request.status)) return null;

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "ensure_conversation_for_request",
    { p_request_id: requestId },
  );

  if (!rpcError) {
    const fromRpc = parseConversationId(rpcData);
    if (fromRpc) return fromRpc;
  } else if (!isMissingRpcError(rpcError) && !isMissingRelationError(rpcError)) {
    logSupabaseError("ensure_conversation_for_request", rpcError);
  }

  const { data: existing, error: existingError } = await supabase
    .from("conversations")
    .select("id")
    .eq("request_id", requestId)
    .maybeSingle();

  if (!existingError && existing?.id) {
    return existing.id as string;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("conversations")
    .upsert(
      {
        request_id: requestId,
        pet_parent_id: request.pet_parent_id,
        pet_friend_id: request.pet_friend_id,
      },
      { onConflict: "request_id" },
    )
    .select("id")
    .single();

  if (!insertError && inserted?.id) {
    return inserted.id as string;
  }

  if (insertError) {
    logSupabaseError("conversations upsert", insertError);
    throw insertError;
  }

  return null;
}

/** @deprecated use ensureConversationForRequest */
export async function ensureConversationForAcceptedRequest(
  supabase: SupabaseClient,
  requestId: string,
): Promise<string | null> {
  return ensureConversationForRequest(supabase, requestId);
}

/** Insert the request message as the first chat message when the thread is still empty. */
export async function seedRequestMessageIfAbsent(
  supabase: SupabaseClient,
  requestId: string,
): Promise<void> {
  const { data: requestRow, error: requestError } = await supabase
    .from("requests")
    .select("message, sender_id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError) {
    logSupabaseError("seed request message load", requestError);
    return;
  }
  if (!requestRow) return;

  const status = requestRow.status as RequestStatus;
  if (status === "declined" || status === "cancelled") return;

  const body = (requestRow.message as string | null)?.trim() ?? "";
  if (!body) return;

  const senderId = requestRow.sender_id as string;
  const conversationId = await ensureConversationForRequest(supabase, requestId);
  if (!conversationId) return;

  const { count: messageCount, error: countError } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId);

  if (countError) {
    logSupabaseError("seed request message count", countError);
    return;
  }

  if ((messageCount ?? 0) > 0) {
    const { data: duplicate } = await supabase
      .from("messages")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("sender_id", senderId)
      .eq("body", body)
      .limit(1)
      .maybeSingle();
    if (duplicate?.id) return;
    return;
  }

  const { error: insertError } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    body,
  });

  if (insertError) {
    logSupabaseError("seed request message insert", insertError);
  }
}

/** Ensure conversations exist for all accepted requests the user is part of. */
export async function syncAcceptedRequestConversations(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { data: requests, error } = await supabase
    .from("requests")
    .select("id")
    .in("status", REQUEST_CONVERSATION_STATUSES)
    .or(`pet_parent_id.eq.${userId},pet_friend_id.eq.${userId}`);

  if (error) {
    if (isMissingRelationError(error)) return;
    throw error;
  }

  for (const row of requests ?? []) {
    try {
      await ensureConversationForRequest(supabase, row.id);
      await seedRequestMessageIfAbsent(supabase, row.id);
    } catch (err) {
      logSupabaseError(`sync conversation ${row.id}`, err as PostgrestError);
    }
  }
}

async function fetchConversationRows(supabase: SupabaseClient): Promise<ConversationRow[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select(CONVERSATION_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ConversationRow[];
}

async function fetchRequestsByIds(
  supabase: SupabaseClient,
  requestIds: string[],
): Promise<Map<string, RequestRow>> {
  if (!requestIds.length) return new Map();

  const extended = await supabase
    .from("requests")
    .select(REQUEST_SELECT_EXTENDED)
    .in("id", requestIds);

  let rows: RequestRow[] = [];

  if (!extended.error) {
    rows = (extended.data ?? []) as RequestRow[];
  } else if (isMissingColumnError(extended.error)) {
    const base = await supabase
      .from("requests")
      .select(REQUEST_SELECT_BASE)
      .in("id", requestIds);
    if (base.error) throw base.error;
    rows = ((base.data ?? []) as RequestRow[]).map((r) => ({
      ...r,
      date_from: null,
      date_to: null,
      requested_dates: null,
      care_type: null,
    }));
  } else {
    throw extended.error;
  }

  return new Map(rows.map((r) => [r.id, r]));
}

export async function fetchConversations(
  supabase: SupabaseClient,
  userId: string,
): Promise<ConversationSummary[]> {
  await syncAcceptedRequestConversations(supabase, userId);

  const convRows = await fetchConversationRows(supabase);
  if (!convRows.length) return [];

  const requestIds = [...new Set(convRows.map((c) => c.request_id))];
  const requestsById = await fetchRequestsByIds(supabase, requestIds);

  const eligibleConversations = convRows.filter((c) => {
    const req = requestsById.get(c.request_id);
    if (!req) return false;
    if (!REQUEST_CONVERSATION_STATUSES.includes(req.status)) return false;
    return req.pet_parent_id === userId || req.pet_friend_id === userId;
  });

  if (!eligibleConversations.length) return [];

  const conversationIds = eligibleConversations.map((c) => c.id);
  const lastByConversation = new Map<string, { body: string; created_at: string }>();

  const recentMessages = await fetchRecentInboxMessages(supabase, conversationIds);

  for (const m of recentMessages) {
    if (!lastByConversation.has(m.conversation_id)) {
      lastByConversation.set(m.conversation_id, {
        body: chatMessagePreviewText({
          body: m.body,
          mediaType:
            m.media_type === "image" || m.media_type === "video"
              ? m.media_type
              : null,
        }),
        created_at: m.created_at,
      });
    }
  }

  const petIds = [
    ...new Set(
      eligibleConversations
        .map((c) => requestsById.get(c.request_id)?.pet_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  type PetRow = { id: string; name: string; pet_photos?: PetPhotoJoin[] | null };
  const petNames = new Map<string, string>();
  const petPhotos = new Map<string, string | null>();

  if (petIds.length) {
    const { data: pets } = await supabase
      .from("pets")
      .select("id, name, pet_photos ( public_url, is_primary, sort_order )")
      .in("id", petIds);

    for (const p of (pets ?? []) as PetRow[]) {
      petNames.set(p.id, (p.name as string)?.trim() || "Pet");
      petPhotos.set(p.id, pickPrimaryPhotoUrl(p.pet_photos ?? []));
    }
  }

  const bookingByRequest = new Map<
    string,
    {
      id: string;
      status: BookingStatus;
      cancelledAt: string | null;
      startDate: string;
      endDate: string;
    }
  >();
  const { data: bookingRows } = await supabase
    .from("bookings")
    .select("id, request_id, status, cancelled_at, start_date, end_date")
    .in("request_id", requestIds);

  for (const b of bookingRows ?? []) {
    bookingByRequest.set(b.request_id as string, {
      id: b.id as string,
      status: b.status as BookingStatus,
      cancelledAt: (b.cancelled_at as string | null) ?? null,
      startDate: b.start_date as string,
      endDate: b.end_date as string,
    });
  }

  const unreadByConversation = new Map<string, number>();
  const { data: unreadRows } = await supabase
    .from("messages")
    .select("conversation_id")
    .in("conversation_id", conversationIds)
    .is("read_at", null)
    .neq("sender_id", userId);

  for (const row of unreadRows ?? []) {
    const cid = row.conversation_id as string;
    unreadByConversation.set(cid, (unreadByConversation.get(cid) ?? 0) + 1);
  }

  const otherPartyByConversation = new Map<string, string>();
  const summaries: ConversationSummary[] = [];

  for (const row of eligibleConversations) {
    const req = requestsById.get(row.request_id);
    if (!req) continue;

    const parentId = row.pet_parent_id ?? req.pet_parent_id;
    const friendId = row.pet_friend_id ?? req.pet_friend_id;
    const otherId = parentId === userId ? friendId : parentId;
    if (!otherId) continue;
    otherPartyByConversation.set(row.id, otherId);

    const last = lastByConversation.get(row.id);
    const sortAt = last?.created_at ?? row.created_at;
    const petName = req.pet_id ? (petNames.get(req.pet_id) ?? null) : null;
    const booking = bookingByRequest.get(row.request_id);
    const bookingRequestedDates = normalizeAvailabilityDates(req.requested_dates ?? []);

    summaries.push({
      id: row.id,
      requestId: row.request_id,
      bookingId: booking?.id ?? null,
      petId: req.pet_id,
      petName,
      threadTitle: conversationThreadTitle(petName, "Conversation"),
      petPhotoUrl: req.pet_id ? (petPhotos.get(req.pet_id) ?? null) : null,
      otherPartyId: otherId,
      otherPartyName: "Member",
      otherPartyAvatarUrl: null,
      requestStatus: req.status,
      bookingStatus: booking?.status ?? null,
      bookingStartDate: booking?.startDate ?? null,
      bookingEndDate: booking?.endDate ?? null,
      bookingRequestedDates,
      bookingCancelledAt: booking?.cancelledAt ?? null,
      requestDateFrom: req.date_from,
      requestDateTo: req.date_to,
      dateLabel: formatRequestDateLabel(req),
      dateRangeKey: dateRangeKeyFromRequest(req),
      careType: formatCareTypeLabel(req.care_type ?? req.service_type),
      lastMessagePreview: last?.body ?? null,
      lastMessageAt: last?.created_at ?? null,
      unreadCount: unreadByConversation.get(row.id) ?? 0,
      sortAt,
      conversationIds: [row.id],
    });
  }

  const profileIds = [...new Set(otherPartyByConversation.values())];
  if (profileIds.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", profileIds);

    const names = new Map(
      (profiles ?? []).map((p) => [p.id, (p.display_name as string)?.trim() || "Member"]),
    );
    const avatars = new Map(
      (profiles ?? []).map((p) => [p.id, (p.avatar_url as string)?.trim() || null]),
    );

    for (const summary of summaries) {
      const otherId = otherPartyByConversation.get(summary.id);
      if (otherId) {
        summary.otherPartyName = names.get(otherId) ?? "Member";
        summary.otherPartyAvatarUrl = avatars.get(otherId) ?? null;
        summary.threadTitle = conversationThreadTitle(summary.petName, summary.otherPartyName);
      }
    }
  }

  return prepareInboxConversations(summaries);
}

export async function fetchMessages(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
): Promise<ChatMessage[]> {
  const db = asMessagingDbClient(supabase);
  const full = await db
    .from("messages")
    .select(MESSAGE_THREAD_SELECT)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (!full.error) {
    return (full.data ?? []).map((row) => mapMessageRow(row, userId));
  }

  if (!isMissingColumnError(full.error)) {
    throw full.error;
  }

  const legacy = await db
    .from("messages")
    .select(MESSAGE_THREAD_LEGACY_SELECT)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (legacy.error) {
    throw legacy.error;
  }

  return (legacy.data ?? []).map((row) =>
    mapMessageRow(
      {
        ...row,
        storage_path: null,
        media_type: null,
        file_name: null,
        file_size: null,
        mime_type: null,
      },
      userId,
    ),
  );
}

export async function sendMessage(
  supabase: SupabaseClient,
  conversationId: string,
  senderId: string,
  body: string,
  otherPartyId?: string,
  media?: SendMessageMedia | null,
): Promise<ChatMessage> {
  const { assertRateLimitShared, requireAuthUserId } = await import("@/lib/security");
  const sessionUserId = await requireAuthUserId(supabase);
  if (senderId !== sessionUserId) {
    throw new Error("You cannot send messages as another user.");
  }
  await assertRateLimitShared("message_send", sessionUserId);

  const trimmed = body.trim();
  if (!trimmed && !media?.storagePath) {
    throw new Error("Message cannot be empty.");
  }

  const { data: conversationRow, error: conversationError } = await supabase
    .from("conversations")
    .select("request_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (conversationError) throw conversationError;
  if (!conversationRow?.request_id) {
    throw new Error("Conversation not found.");
  }

  const { data: requestRow, error: requestError } = await supabase
    .from("requests")
    .select("status")
    .eq("id", conversationRow.request_id)
    .maybeSingle();

  if (requestError) throw requestError;
  const requestStatus = (requestRow?.status as RequestStatus | undefined) ?? "pending";
  if (requestStatus === "declined") {
    throw new Error("Messaging is closed for this booking.");
  }

  const { data: bookingRow } = await supabase
    .from("bookings")
    .select("status, cancelled_at")
    .eq("request_id", conversationRow.request_id)
    .maybeSingle();

  const sendCheck: ConversationSummary = {
    id: conversationId,
    requestId: conversationRow.request_id,
    bookingId: null,
    petId: null,
    petName: null,
    threadTitle: "",
    petPhotoUrl: null,
    otherPartyId: otherPartyId ?? "",
    otherPartyName: "",
    otherPartyAvatarUrl: null,
    requestStatus,
    bookingStatus: (bookingRow?.status as BookingStatus | undefined) ?? null,
    bookingStartDate: null,
    bookingEndDate: null,
    bookingRequestedDates: [],
    bookingCancelledAt: (bookingRow?.cancelled_at as string | null) ?? null,
    requestDateFrom: null,
    requestDateTo: null,
    dateLabel: "",
    dateRangeKey: "",
    careType: null,
    lastMessagePreview: null,
    lastMessageAt: null,
    unreadCount: 0,
    sortAt: "",
    conversationIds: [conversationId],
  };

  if (!canSendInConversation(sendCheck)) {
    throw new Error("Messaging period has ended for this cancelled booking.");
  }

  if (otherPartyId) {
    const { isUserBlocked, BLOCKED_USER_MESSAGE } = await import("@/lib/trust-safety");
    if (await isUserBlocked(supabase, senderId, otherPartyId)) {
      throw new Error(BLOCKED_USER_MESSAGE);
    }
  }

  const { data: senderProfile } = await supabase
    .from("profiles")
    .select("role, active_mode")
    .eq("id", senderId)
    .maybeSingle();
  if (senderProfile) {
    const { resolveActiveMode } = await import("@/lib/profile-mode");
    const { assertActiveMembership } = await import("@/lib/membership-access");
    const mode = resolveActiveMode(
      (senderProfile.role as "pet_parent" | "pet_friend" | "both") ?? "pet_friend",
      senderProfile.active_mode as string | null,
    );
    await assertActiveMembership(supabase, senderId, mode);
  }

  const insertPayload: Record<string, unknown> = {
    conversation_id: conversationId,
    sender_id: senderId,
    body: trimmed,
  };

  if (media) {
    insertPayload.storage_path = media.storagePath;
    insertPayload.media_type = media.mediaType;
    insertPayload.file_name = media.fileName;
    insertPayload.file_size = media.fileSize;
    insertPayload.mime_type = media.mimeType;
  }

  let { data, error } = await supabase
    .from("messages")
    .insert(insertPayload)
    .select(MESSAGE_THREAD_SELECT)
    .single();

  if (error && media && isMissingColumnError(error)) {
    throw new Error(
      "Chat media is not available yet. Apply the latest Supabase migrations, then refresh.",
    );
  }

  if (error) throw error;
  const row = data as MessageRow;

  return mapMessageRow(row, senderId);
}

export async function markConversationMessagesRead(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("messages")
    .update({ read_at: now })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .is("read_at", null);

  if (error) throw error;
}

/** Marks messages read for all conversation rows in a summary and related notifications. */
export async function markConversationFullyRead(
  supabase: SupabaseClient,
  conversation: Pick<ConversationSummary, "id" | "conversationIds">,
  userId: string,
): Promise<void> {
  const ids = conversationIdsFor(conversation);
  const { markNotificationsReadForConversations } = await import("@/lib/notifications");

  await Promise.all(ids.map((id) => markConversationMessagesRead(supabase, id, userId)));
  await markNotificationsReadForConversations(supabase, ids, userId);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CONVERSATION_READ_EVENT));
  }
}

export function subscribeToConversationMessages(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
  onMessage: (message: ChatMessage) => void,
): RealtimeChannel {
  return supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const row = payload.new as MessageRow;
        if (!row?.id) return;
        onMessage(mapMessageRow(row, userId));
      },
    )
    .subscribe();
}

export function formatInboxTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMsg = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayDiff = Math.round((startOfToday.getTime() - startOfMsg.getTime()) / 86400000);

    if (dayDiff === 0) {
      return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    }
    if (dayDiff === 1) return "Yesterday";
    if (dayDiff < 7) {
      return d.toLocaleDateString(undefined, { weekday: "short" });
    }
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

export function formatMessageTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export function formatMessageDateDivider(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (sameDay) return "Today";
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (
      d.getFullYear() === yesterday.getFullYear() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getDate() === yesterday.getDate()
    ) {
      return "Yesterday";
    }
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function messageDateKey(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  } catch {
    return iso;
  }
}

export type MessagePositionInGroup = "single" | "first" | "middle" | "last";

export type ThreadMessageGroup = {
  isOwn: boolean;
  messages: ChatMessage[];
};

export type ThreadDateSection = {
  dateKey: string;
  label: string;
  groups: ThreadMessageGroup[];
};

export function getMessagePositionInGroup(
  index: number,
  groupLength: number,
): MessagePositionInGroup {
  if (groupLength <= 1) return "single";
  if (index === 0) return "first";
  if (index === groupLength - 1) return "last";
  return "middle";
}

/** iMessage-style corner radii for stacked bubbles in a sender group. */
export function messageBubbleRadius(
  isOwn: boolean,
  position: MessagePositionInGroup,
): string {
  if (isOwn) {
    switch (position) {
      case "single":
        return "rounded-2xl rounded-br-md";
      case "first":
        return "rounded-t-2xl rounded-l-2xl rounded-r-2xl rounded-br-lg";
      case "middle":
        return "rounded-l-2xl rounded-r-lg rounded-br-md rounded-tr-md";
      case "last":
        return "rounded-b-2xl rounded-bl-2xl rounded-br-md rounded-tl-lg rounded-tr-lg";
    }
  }

  switch (position) {
    case "single":
      return "rounded-2xl rounded-bl-md";
    case "first":
      return "rounded-t-2xl rounded-l-2xl rounded-r-2xl rounded-bl-lg";
    case "middle":
      return "rounded-r-2xl rounded-l-lg rounded-bl-md rounded-tl-md";
    case "last":
      return "rounded-b-2xl rounded-br-2xl rounded-bl-md rounded-tr-lg rounded-tl-lg";
  }
}

/** Group messages by calendar day, then consecutive same-sender runs. */
export function buildThreadSections(messages: ChatMessage[]): ThreadDateSection[] {
  const sections: ThreadDateSection[] = [];
  let currentSection: ThreadDateSection | null = null;
  let currentGroup: ThreadMessageGroup | null = null;

  for (const message of messages) {
    const dateKey = messageDateKey(message.createdAt);

    if (!currentSection || currentSection.dateKey !== dateKey) {
      if (currentGroup && currentSection) {
        currentSection.groups.push(currentGroup);
      }
      if (currentSection) sections.push(currentSection);

      currentSection = {
        dateKey,
        label: formatMessageDateDivider(message.createdAt),
        groups: [],
      };
      currentGroup = { isOwn: message.isOwn, messages: [message] };
      continue;
    }

    if (currentGroup && currentGroup.isOwn === message.isOwn) {
      currentGroup.messages.push(message);
    } else {
      if (currentGroup) currentSection.groups.push(currentGroup);
      currentGroup = { isOwn: message.isOwn, messages: [message] };
    }
  }

  if (currentGroup && currentSection) {
    currentSection.groups.push(currentGroup);
  }
  if (currentSection) sections.push(currentSection);

  return sections;
}
