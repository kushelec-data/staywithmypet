import type { PostgrestError, RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { formatSupabaseError } from "@/lib/profile-load";
import { pickPrimaryPhotoUrl } from "@/lib/pet-photos";

type PetPhotoJoin = {
  public_url: string | null;
  is_primary: boolean;
  sort_order: number;
};
import { formatDateRange, type RequestStatus } from "@/lib/requests";
import type { BookingStatus } from "@/types/database";
import { isMissingColumnError, isPostgrestError } from "@/lib/supabase-errors";
import { logSupabaseError } from "@/lib/supabase-errors";

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  isOwn: boolean;
};

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
  bookingStatus: BookingStatus | null;
  dateLabel: string;
  /** Stable key for merge/dedup when booking dates match */
  dateRangeKey: string;
  careType: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  sortAt: string;
};

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

export function isConversationCompleted(conversation: ConversationSummary): boolean {
  return (
    conversation.requestStatus === "completed" ||
    conversation.bookingStatus === "completed" ||
    conversation.bookingStatus === "cancelled" ||
    conversation.requestStatus === "cancelled" ||
    conversation.requestStatus === "declined"
  );
}

export function isConversationActiveBooking(conversation: ConversationSummary): boolean {
  if (isConversationCompleted(conversation)) return false;
  if (conversation.bookingStatus === "active" || conversation.bookingStatus === "upcoming") {
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
  if (conversation.requestStatus === "declined" || conversation.requestStatus === "cancelled") {
    return false;
  }
  if (conversation.bookingStatus === "cancelled") return false;
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
  starts_at: string | null;
  ends_at: string | null;
  care_type: string | null;
  service_type: string | null;
  pet_id: string | null;
  pet_parent_id: string;
  pet_friend_id: string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

const CONVERSATION_SELECT =
  "id, request_id, pet_parent_id, pet_friend_id, created_at";

const REQUEST_SELECT_EXTENDED =
  "id, status, date_from, date_to, starts_at, ends_at, care_type, service_type, pet_id, pet_parent_id, pet_friend_id";

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

/** Create or return conversation for an accepted request (RPC + client upsert fallback). */
export async function ensureConversationForAcceptedRequest(
  supabase: SupabaseClient,
  requestId: string,
): Promise<string | null> {
  const request = await fetchRequestForConversation(supabase, requestId);
  if (!request) return null;
  if (request.status !== "accepted" && request.status !== "completed") return null;

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

/** Ensure conversations exist for all accepted requests the user is part of. */
export async function syncAcceptedRequestConversations(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { data: requests, error } = await supabase
    .from("requests")
    .select("id")
    .in("status", ["accepted", "completed"])
    .or(`pet_parent_id.eq.${userId},pet_friend_id.eq.${userId}`);

  if (error) {
    if (isMissingRelationError(error)) return;
    throw error;
  }

  for (const row of requests ?? []) {
    try {
      await ensureConversationForAcceptedRequest(supabase, row.id);
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
    if (req.status !== "accepted" && req.status !== "completed") return false;
    return req.pet_parent_id === userId || req.pet_friend_id === userId;
  });

  if (!eligibleConversations.length) return [];

  const conversationIds = eligibleConversations.map((c) => c.id);
  const lastByConversation = new Map<string, { body: string; created_at: string }>();

  const { data: recentMessages, error: msgError } = await supabase
    .from("messages")
    .select("conversation_id, body, created_at")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });

  if (msgError) throw msgError;

  for (const m of recentMessages ?? []) {
    if (!lastByConversation.has(m.conversation_id)) {
      lastByConversation.set(m.conversation_id, {
        body: m.body,
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

  const bookingByRequest = new Map<string, { id: string; status: BookingStatus }>();
  const { data: bookingRows } = await supabase
    .from("bookings")
    .select("id, request_id, status")
    .in("request_id", requestIds);

  for (const b of bookingRows ?? []) {
    bookingByRequest.set(b.request_id as string, {
      id: b.id as string,
      status: b.status as BookingStatus,
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
      dateLabel: formatDateRange(
        req.date_from,
        req.date_to,
        req.starts_at,
        req.ends_at,
      ),
      dateRangeKey: dateRangeKeyFromRequest(req),
      careType: req.care_type ?? req.service_type,
      lastMessagePreview: last?.body ?? null,
      lastMessageAt: last?.created_at ?? null,
      unreadCount: unreadByConversation.get(row.id) ?? 0,
      sortAt,
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
  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, body, read_at, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row: MessageRow) => ({
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    readAt: row.read_at,
    createdAt: row.created_at,
    isOwn: row.sender_id === userId,
  }));
}

export async function sendMessage(
  supabase: SupabaseClient,
  conversationId: string,
  senderId: string,
  body: string,
  otherPartyId?: string,
): Promise<ChatMessage> {
  const { assertRateLimit, requireAuthUserId } = await import("@/lib/security");
  const sessionUserId = await requireAuthUserId(supabase);
  if (senderId !== sessionUserId) {
    throw new Error("You cannot send messages as another user.");
  }
  assertRateLimit("message_send", sessionUserId);

  const trimmed = body.trim();
  if (!trimmed) throw new Error("Message cannot be empty.");

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

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      body: trimmed,
    })
    .select("id, conversation_id, sender_id, body, read_at, created_at")
    .single();

  if (error) throw error;
  const row = data as MessageRow;

  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    readAt: row.read_at,
    createdAt: row.created_at,
    isOwn: true,
  };
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
        onMessage({
          id: row.id,
          conversationId: row.conversation_id,
          senderId: row.sender_id,
          body: row.body,
          readAt: row.read_at,
          createdAt: row.created_at,
          isOwn: row.sender_id === userId,
        });
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
