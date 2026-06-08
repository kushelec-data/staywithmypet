import type { SupabaseClient } from "@supabase/supabase-js";
import { formatBookingDatesForRow } from "@/lib/date-format";
import type { DateFormatLocale } from "@/lib/date-format";
import {
  ensureConversationForRequest,
  seedRequestMessageIfAbsent,
} from "@/lib/messaging";
import {
  messagesHrefForRequest,
  petHrefForRequestParticipant,
  profileHrefForParticipant,
  REQUEST_ACCESS_STATUSES,
} from "@/lib/request-profile-access";
import { speciesDisplayLabel } from "@/lib/pet-data";
import { normalizeAvailabilityDates } from "@/lib/pet-availability";
import {
  parseProfileDetails,
  profileCalendarSelectedDates,
} from "@/lib/profile-details";
import {
  DATE_NOT_AVAILABLE_ERROR,
  isPastDateInput,
  PAST_DATE_REQUEST_ERROR,
} from "@/lib/request-validation";
import { ensureUserProfile } from "@/lib/profile";
import { fetchUserPets } from "@/lib/pet-data";
import { fetchUserProfile } from "@/lib/profile-load";
import { isBookingOverlapError } from "@/lib/bookings";
import { pickSupabaseJoin, profileDisplayName } from "@/lib/profile-display";
import { isMissingRelationError, isPostgrestError, logSupabaseError } from "@/lib/supabase-errors";
import {
  INCOMING_REQUEST_COLUMNS,
  isIncomingRequest,
  isOutgoingRequest,
  OUTGOING_REQUEST_COLUMNS,
  resolveEffectiveSenderReceiver,
  type RequestParticipantColumn,
} from "@/lib/request-list-filters";
import {
  REQUEST_SELECT,
  REQUEST_SELECT_WITH_RELATIONS,
  type RequestInsert,
  type RequestRow,
} from "@/types/database";

export type { RequestStatus } from "@/types/database";

export type CareRequest = {
  id: string;
  status: RequestRow["status"];
  dateFrom: string | null;
  dateTo: string | null;
  message: string | null;
  careType: string | null;
  petId: string | null;
  petName: string | null;
  petSpeciesLabel: string | null;
  petParentId: string;
  petFriendId: string;
  petProfileHref: string | null;
  petParentProfileHref: string | null;
  otherPartyProfileHref: string | null;
  canOpenMessages: boolean;
  messagesHref: string;
  senderId: string;
  receiverId: string;
  senderName: string;
  receiverName: string;
  otherPartyName: string;
  dateLabel: string;
  requestedDates: string[];
  createdAt: string;
  createdAtLabel: string;
  canRespond: boolean;
  canCancel: boolean;
};

export type CreateCareRequestInput = {
  petId: string;
  petParentId: string;
  petFriendId: string;
  senderId: string;
  receiverId: string;
  message: string;
  careType: string;
  selectedDates: string[];
};

/** Preferred label for care requests using stored selected dates when available. */
export function formatRequestDateLabel(
  row: Pick<RequestRow, "date_from" | "date_to" | "requested_dates"> & {
    starts_at?: string | null;
    ends_at?: string | null;
  },
  locale?: DateFormatLocale,
): string {
  return formatBookingDatesForRow(row, { locale });
}

function formatCreatedAt(createdAt: string): string {
  try {
    return new Date(createdAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return createdAt;
  }
}

export function requestStatusLabel(status: RequestRow["status"]): string {
  switch (status) {
    case "accepted":
      return "Accepted";
    case "declined":
      return "Declined";
    case "cancelled":
      return "Cancelled";
    case "completed":
      return "Completed";
    default:
      return "Pending";
  }
}

export function requestStatusBadgeClasses(status: RequestRow["status"]): string {
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold tracking-wide ring-1";
  switch (status) {
    case "accepted":
      return `${base} bg-emerald-50 text-emerald-800 ring-emerald-200/70`;
    case "declined":
      return `${base} bg-red-50 text-red-700 ring-red-200/70`;
    case "cancelled":
      return `${base} bg-neutral-100 text-neutral-600 ring-neutral-200/80`;
    case "completed":
      return `${base} bg-sky-50 text-sky-800 ring-sky-200/70`;
    default:
      return `${base} bg-amber-50 text-amber-800 ring-amber-200/70`;
  }
}

/** Normalize message text for display (spacing, light word-boundary fixes). */
export function normalizeRequestMessage(raw: string | null | undefined): string {
  if (!raw?.trim()) return "";

  let text = raw.trim().replace(/\s+/g, " ");
  text = text.replace(/([.!?,;:])(?=\S)/g, "$1 ");
  text = text.replace(/([a-z])([A-Z])/g, "$1 $2");

  const glueWords = ["my", "your", "the", "and", "for", "to", "a", "an", "dog", "cat", "pet"];
  for (const word of glueWords) {
    const re = new RegExp(`([a-z]{2,})(${word}\\b)`, "gi");
    text = text.replace(re, "$1 $2");
  }

  return text.replace(/\s+/g, " ").trim();
}

type ProfileJoin = { id: string; display_name: string };
type PetJoin = { id: string; name: string; species?: string | null; breed?: string | null };

function formatPetSpeciesLabel(
  species: string | null | undefined,
  breed: string | null | undefined,
): string | null {
  if (!species?.trim()) return null;
  const label = speciesDisplayLabel(species.trim(), breed?.trim() ?? null);
  if (!label) return null;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function requestAllowsMessaging(status: RequestRow["status"], message: string | null): boolean {
  if (!REQUEST_ACCESS_STATUSES.includes(status as (typeof REQUEST_ACCESS_STATUSES)[number])) {
    return false;
  }
  return Boolean(message?.trim());
}

type RequestRowWithRelations = RequestRow & {
  sender?: ProfileJoin | ProfileJoin[] | null;
  receiver?: ProfileJoin | ProfileJoin[] | null;
  pet?: PetJoin | PetJoin[] | null;
};

const MISSING_PARTICIPANT_LABEL = "Member";

function collectParticipantProfileIds(rows: RequestRow[]): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    const { senderId, receiverId } = resolveEffectiveSenderReceiver(row);
    if (senderId) ids.add(senderId);
    if (receiverId) ids.add(receiverId);
    if (row.pet_parent_id) ids.add(row.pet_parent_id);
    if (row.pet_friend_id) ids.add(row.pet_friend_id);
  }
  return [...ids];
}

function mapRequestRow(
  row: RequestRow,
  userId: string,
  direction: "incoming" | "outgoing",
  names: {
    senderName: string;
    receiverName: string;
    petName: string | null;
    petSpeciesLabel: string | null;
  },
): CareRequest {
  const { senderId, receiverId } = resolveEffectiveSenderReceiver(row);
  const otherId = direction === "outgoing" ? receiverId : senderId;
  const otherPartyName =
    otherId === senderId ? names.senderName : otherId === receiverId ? names.receiverName : MISSING_PARTICIPANT_LABEL;
  const canOpenMessages = requestAllowsMessaging(row.status, row.message);

  return {
    id: row.id,
    status: row.status,
    dateFrom: row.date_from,
    dateTo: row.date_to,
    message: row.message,
    careType: row.care_type,
    petId: row.pet_id,
    petName: names.petName,
    petSpeciesLabel: names.petSpeciesLabel,
    petParentId: row.pet_parent_id,
    petFriendId: row.pet_friend_id,
    petProfileHref: row.pet_id ? petHrefForRequestParticipant(row.pet_id) : null,
    petParentProfileHref:
      row.pet_id && row.pet_parent_id !== userId
        ? profileHrefForParticipant(row.pet_parent_id)
        : null,
    otherPartyProfileHref:
      otherId && otherId !== userId ? profileHrefForParticipant(otherId) : null,
    canOpenMessages,
    messagesHref: messagesHrefForRequest(row.id),
    senderId: senderId ?? "",
    receiverId: receiverId ?? "",
    senderName: names.senderName,
    receiverName: names.receiverName,
    otherPartyName,
    requestedDates: normalizeAvailabilityDates(row.requested_dates ?? []),
    dateLabel: formatRequestDateLabel(row),
    createdAt: row.created_at,
    createdAtLabel: formatCreatedAt(row.created_at),
    canRespond: receiverId === userId && row.status === "pending",
    canCancel: senderId === userId && row.status === "pending",
  };
}

function namesFromEmbeddedRow(row: RequestRowWithRelations): {
  senderName: string;
  receiverName: string;
  petName: string | null;
  petSpeciesLabel: string | null;
} {
  const senderProfile = pickSupabaseJoin(row.sender);
  const receiverProfile = pickSupabaseJoin(row.receiver);
  const petRow = pickSupabaseJoin(row.pet);

  const senderName = profileDisplayName(senderProfile) ?? MISSING_PARTICIPANT_LABEL;
  const receiverName = profileDisplayName(receiverProfile) ?? MISSING_PARTICIPANT_LABEL;

  const petName =
    row.pet_id && petRow?.name?.trim()
      ? petRow.name.trim()
      : row.pet_id
        ? "Pet"
        : null;

  const petSpeciesLabel = row.pet_id
    ? formatPetSpeciesLabel(petRow?.species, petRow?.breed)
    : null;

  return { senderName, receiverName, petName, petSpeciesLabel };
}

function mapRequestsFromEmbedded(
  rows: RequestRowWithRelations[],
  userId: string,
  direction: "incoming" | "outgoing",
): CareRequest[] {
  return rows.map((row) => mapRequestRow(row, userId, direction, namesFromEmbeddedRow(row)));
}

async function loadProfileNamesById(
  supabase: SupabaseClient,
  profileIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!profileIds.length) return map;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", profileIds);

  if (error) throw error;

  for (const row of data ?? []) {
    const id = row.id as string;
    const label = profileDisplayName(row as { display_name: string });
    if (label) map.set(id, label);
  }

  return map;
}

type PetListMeta = { name: string; speciesLabel: string | null };

async function loadPetMetaById(
  supabase: SupabaseClient,
  petIds: string[],
): Promise<Map<string, PetListMeta>> {
  const map = new Map<string, PetListMeta>();
  if (!petIds.length) return map;

  const { data, error } = await supabase
    .from("pets")
    .select("id, name, species, breed")
    .in("id", petIds);
  if (error) throw error;

  for (const row of data ?? []) {
    const name = (row.name as string)?.trim();
    if (!name) continue;
    map.set(row.id as string, {
      name,
      speciesLabel: formatPetSpeciesLabel(
        row.species as string | null,
        row.breed as string | null,
      ),
    });
  }

  return map;
}

function participantName(
  profileNames: Map<string, string>,
  profileId: string | null | undefined,
): string {
  if (!profileId) return MISSING_PARTICIPANT_LABEL;
  return profileNames.get(profileId) ?? MISSING_PARTICIPANT_LABEL;
}

async function enrichRequests(
  supabase: SupabaseClient,
  rows: RequestRow[],
  userId: string,
  direction: "incoming" | "outgoing",
): Promise<CareRequest[]> {
  if (!rows.length) return [];

  const petIds = [...new Set(rows.map((r) => r.pet_id).filter((id): id is string => Boolean(id)))];
  const profileIds = collectParticipantProfileIds(rows);

  const [petMeta, profileNames] = await Promise.all([
    loadPetMetaById(supabase, petIds),
    loadProfileNamesById(supabase, profileIds),
  ]);

  return rows.map((row) => {
    const pet = row.pet_id ? petMeta.get(row.pet_id) : null;
    return mapRequestRow(row, userId, direction, {
      senderName: participantName(profileNames, row.sender_id),
      receiverName: participantName(profileNames, row.receiver_id),
      petName: pet?.name ?? (row.pet_id ? "Pet" : null),
      petSpeciesLabel: pet?.speciesLabel ?? null,
    });
  });
}

function isEmbedQueryError(error: unknown): boolean {
  if (!isPostgrestError(error)) return false;
  if (isMissingRelationError(error)) return true;
  return (
    error.code === "PGRST200" ||
    /could not find.*relationship/i.test(error.message) ||
    /foreign key/i.test(error.message)
  );
}

function dedupeRequestRows<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

function logRequestListQueryError(
  column: RequestParticipantColumn,
  userId: string,
  error: { message: string; code?: string; details?: string; hint?: string },
): void {
  console.error("[request:list] Supabase query error", {
    column,
    userId,
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
  });
}

async function fetchRequestRowsByParticipantColumns(
  supabase: SupabaseClient,
  userId: string,
  columns: readonly RequestParticipantColumn[],
): Promise<RequestRow[]> {
  const batches = await Promise.all(
    columns.map(async (column) => {
      const { data, error } = await supabase
        .from("requests")
        .select(REQUEST_SELECT)
        .eq(column, userId)
        .order("created_at", { ascending: false });

      if (error) {
        logRequestListQueryError(column, userId, error);
        return [] as RequestRow[];
      }

      return (data ?? []) as RequestRow[];
    }),
  );

  return dedupeRequestRows(batches.flat());
}

function sortRequestsNewestFirst(rows: RequestRow[]): RequestRow[] {
  return [...rows].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

function filterRowsForDirection(
  rows: RequestRow[],
  userId: string,
  direction: "incoming" | "outgoing",
): RequestRow[] {
  const predicate = direction === "incoming" ? isIncomingRequest : isOutgoingRequest;
  return rows.filter((row) => predicate(row, userId));
}

async function fetchRequestsForDirection(
  supabase: SupabaseClient,
  userId: string,
  direction: "incoming" | "outgoing",
): Promise<CareRequest[]> {
  const columns = direction === "incoming" ? INCOMING_REQUEST_COLUMNS : OUTGOING_REQUEST_COLUMNS;

  const merged = await fetchRequestRowsByParticipantColumns(supabase, userId, columns);
  const rows = sortRequestsNewestFirst(filterRowsForDirection(merged, userId, direction));

  console.info(`[request:list] ${direction} loaded`, {
    userId,
    merged: merged.length,
    afterDirectionFilter: rows.length,
  });

  if (rows.length === 0) {
    return [];
  }

  const withRelations = await supabase
    .from("requests")
    .select(REQUEST_SELECT_WITH_RELATIONS)
    .in("id", rows.map((r) => r.id))
    .order("created_at", { ascending: false });

  if (!withRelations.error) {
    const embedded = dedupeRequestRows((withRelations.data ?? []) as RequestRowWithRelations[]);
    const order = new Map(rows.map((r, i) => [r.id, i]));
    embedded.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    return mapRequestsFromEmbedded(embedded, userId, direction);
  }

  if (isEmbedQueryError(withRelations.error)) {
    console.warn("[request:list] embed select failed, using base rows", {
      direction,
      message: withRelations.error.message,
      code: withRelations.error.code,
    });
    return enrichRequests(supabase, rows, userId, direction);
  }

  console.error("[request:list] embed by id failed", {
    direction,
    userId,
    message: withRelations.error.message,
    code: withRelations.error.code,
    details: withRelations.error.details,
    hint: withRelations.error.hint,
  });
  return enrichRequests(supabase, rows, userId, direction);
}

/** Logged-in user's profile id (same as auth.users.id when profile exists). */
export async function resolveRequesterProfileId(supabase: SupabaseClient): Promise<string> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    logSupabaseError("auth.getUser", authError);
    throw authError;
  }
  if (!user) {
    throw new Error("You must be logged in to send a request.");
  }

  await ensureUserProfile(supabase, user);
  const profile = await fetchUserProfile(supabase, user.id);
  if (!profile?.id) {
    throw new Error("Profile not found. Complete your profile setup before sending a request.");
  }
  return profile.id;
}

async function loadAllowedRequestDates(
  supabase: SupabaseClient,
  input: CreateCareRequestInput,
): Promise<Set<string>> {
  if (input.senderId === input.petParentId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("details")
      .eq("id", input.petFriendId)
      .maybeSingle();
    if (error) throw error;
    const details = parseProfileDetails(data?.details);
    return new Set(profileCalendarSelectedDates(details));
  }

  const { data, error } = await supabase
    .from("pets")
    .select("availability_dates")
    .eq("id", input.petId)
    .maybeSingle();
  if (error) throw error;
  return new Set(normalizeAvailabilityDates(data?.availability_dates));
}

async function assertRequestedDatesAvailable(
  supabase: SupabaseClient,
  input: CreateCareRequestInput,
  requestedDates: string[],
): Promise<void> {
  const allowed = await loadAllowedRequestDates(supabase, input);
  const invalid = requestedDates.find((d) => !allowed.has(d));
  if (invalid) {
    throw new Error(DATE_NOT_AVAILABLE_ERROR);
  }
}

export async function createCareRequest(
  supabase: SupabaseClient,
  input: CreateCareRequestInput,
): Promise<{ requestId: string }> {
  const { assertRateLimit, requireAuthUserId } = await import("@/lib/security");
  const sessionUserId = await requireAuthUserId(supabase);
  assertRateLimit("care_request", sessionUserId);

  if (input.senderId !== sessionUserId) {
    throw new Error("Invalid request participants.");
  }

  if (input.petParentId === input.petFriendId || input.senderId === input.receiverId) {
    throw new Error("You cannot send a request to yourself.");
  }

  const { isUserBlocked, BLOCKED_USER_MESSAGE } = await import("@/lib/trust-safety");
  if (await isUserBlocked(supabase, input.senderId, input.receiverId)) {
    throw new Error(BLOCKED_USER_MESSAGE);
  }

  if (input.senderId !== input.petParentId && input.senderId !== input.petFriendId) {
    throw new Error("Invalid request participants.");
  }

  if (input.receiverId !== input.petParentId && input.receiverId !== input.petFriendId) {
    throw new Error("Invalid request participants.");
  }

  const senderMode =
    input.senderId === input.petParentId ? ("pet_parent" as const) : ("pet_friend" as const);
  const { assertActiveMembership } = await import("@/lib/membership-access");
  await assertActiveMembership(supabase, input.senderId, senderMode);

  const requestedDates = normalizeAvailabilityDates(input.selectedDates);
  if (!requestedDates.length) {
    throw new Error("Please select at least one date from the calendar.");
  }

  if (requestedDates.some((d) => isPastDateInput(d))) {
    throw new Error(PAST_DATE_REQUEST_ERROR);
  }

  await assertRequestedDatesAvailable(supabase, input, requestedDates);

  const dateFrom = requestedDates[0];
  const dateTo = requestedDates[requestedDates.length - 1];
  const careType = input.careType.trim();
  const message = input.message.trim() || null;

  const requestId = crypto.randomUUID();
  const payload: RequestInsert = {
    id: requestId,
    pet_id: input.petId,
    pet_parent_id: input.petParentId,
    pet_friend_id: input.petFriendId,
    sender_id: input.senderId,
    receiver_id: input.receiverId,
    requested_dates: requestedDates,
    date_from: dateFrom,
    date_to: dateTo,
    care_type: careType,
    message,
    status: "pending",
  };

  const { error } = await supabase.from("requests").insert(payload);
  if (error) {
    logSupabaseError("insert", error);
    console.error("[request] insert payload", payload);
    throw error;
  }

  console.info("[request:delivery] inserted", {
    requestId,
    senderId: payload.sender_id,
    receiverId: payload.receiver_id,
    petParentId: payload.pet_parent_id,
    petFriendId: payload.pet_friend_id,
    status: payload.status,
  });

  if (message) {
    try {
      await ensureConversationForRequest(supabase, requestId);
      await seedRequestMessageIfAbsent(supabase, requestId);
    } catch (err) {
      if (isPostgrestError(err)) {
        logSupabaseError("request message seed", err);
      } else {
        console.error("[request] message seed", err);
      }
    }
  }

  return { requestId };
}

export function logRequestSubmitFailure(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (context && Object.keys(context).length > 0) {
    console.error("[request] submit context", context);
  }
  if (isPostgrestError(error)) {
    logSupabaseError("submit", error);
    return;
  }
  console.error("[request] submit", error);
}

export type RespondToRequestResult = {
  conversationId: string | null;
};

export async function respondToRequest(
  supabase: SupabaseClient,
  userId: string,
  requestId: string,
  decision: "accepted" | "declined",
): Promise<RespondToRequestResult> {
  const { error } = await supabase
    .from("requests")
    .update({
      status: decision,
      responded_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("receiver_id", userId)
    .eq("status", "pending");

  if (error) {
    if (isBookingOverlapError(error)) {
      throw new Error("These dates overlap with an existing booking for this pet.");
    }
    throw error;
  }

  if (decision !== "accepted") {
    return { conversationId: null };
  }

  const { data: requestRow, error: requestLoadError } = await supabase
    .from("requests")
    .select("pet_parent_id, pet_friend_id")
    .eq("id", requestId)
    .maybeSingle();

  if (requestLoadError) throw requestLoadError;
  if (!requestRow) {
    throw new Error("Request not found.");
  }

  const receiverRole =
    userId === requestRow.pet_parent_id
      ? ("pet_parent" as const)
      : userId === requestRow.pet_friend_id
        ? ("pet_friend" as const)
        : null;
  if (!receiverRole) {
    throw new Error("Invalid request participants.");
  }

  const { assertActiveMembershipForRole } = await import("@/lib/membership-access");
  await assertActiveMembershipForRole(supabase, userId, receiverRole);

  const conversationId = await ensureConversationForRequest(supabase, requestId);
  if (!conversationId) {
    throw new Error("Request was accepted but the chat could not be started. Refresh and open Messages.");
  }

  await seedRequestMessageIfAbsent(supabase, requestId);

  return { conversationId };
}

export async function cancelRequest(
  supabase: SupabaseClient,
  userId: string,
  requestId: string,
): Promise<void> {
  const { error } = await supabase
    .from("requests")
    .update({ status: "cancelled" })
    .eq("id", requestId)
    .eq("sender_id", userId)
    .eq("status", "pending");

  if (error) throw error;
}

/** Requests I sent — sender_id is the current user. */
export async function fetchOutgoingRequests(
  supabase: SupabaseClient,
  userId: string,
): Promise<CareRequest[]> {
  return fetchRequestsForDirection(supabase, userId, "outgoing");
}

/** Received requests — receiver_id is the current user. */
export async function fetchIncomingRequests(
  supabase: SupabaseClient,
  userId: string,
): Promise<CareRequest[]> {
  return fetchRequestsForDirection(supabase, userId, "incoming");
}

/** Care requests received for a pet (incoming to the pet parent). */
export async function countPetCareRequests(
  supabase: SupabaseClient,
  petId: string,
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("requests")
      .select("id", { count: "exact", head: true })
      .eq("pet_id", petId);

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

/** Requests where user is the receiver. */
export async function countIncomingRequests(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  try {
    const rows = await fetchIncomingRequests(supabase, userId);
    return rows.length;
  } catch {
    return 0;
  }
}

/** Requests where user is the sender. */
export async function countRequestsSent(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  try {
    const rows = await fetchOutgoingRequests(supabase, userId);
    return rows.length;
  } catch {
    return 0;
  }
}

/** Pending or accepted requests the user is part of. */
export async function countActiveCareRequests(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("requests")
      .select("id", { count: "exact", head: true })
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .in("status", ["pending", "accepted"]);

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

/** Incoming requests still waiting for this user to accept or decline. */
export async function countIncomingPendingReply(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("requests")
      .select("id", { count: "exact", head: true })
      .eq("receiver_id", userId)
      .eq("status", "pending");

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export type RequestPetOption = { id: string; name: string };

/** Pets owned by the logged-in Pet Parent (for parent → friend requests). */
export async function fetchRequesterPets(
  supabase: SupabaseClient,
  ownerId: string,
): Promise<RequestPetOption[]> {
  try {
    const rows = await fetchUserPets(supabase, ownerId);
    return rows
      .filter((p) => p.is_active !== false)
      .map((p) => ({ id: p.id, name: p.name }));
  } catch (err) {
    throw err instanceof Error ? err : new Error("Could not load your pets.");
  }
}
