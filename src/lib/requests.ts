import type { SupabaseClient } from "@supabase/supabase-js";
import { formatDateRange as formatIsoDateRange } from "@/lib/date-format";
import { ensureConversationForAcceptedRequest } from "@/lib/messaging";
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
  senderId: string;
  receiverId: string;
  senderName: string;
  receiverName: string;
  otherPartyName: string;
  dateLabel: string;
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

export function formatDateRange(
  dateFrom: string | null,
  dateTo: string | null,
  startsAt: string | null,
  endsAt: string | null,
  locale?: string,
): string {
  const from = dateFrom ?? (startsAt ? startsAt.slice(0, 10) : null);
  const to = dateTo ?? (endsAt ? endsAt.slice(0, 10) : null);
  if (!from && !to) return "Dates to be confirmed";
  if (from && to) return formatIsoDateRange(from, to, locale);
  if (from) return `From ${formatIsoDateRange(from, from, locale)}`;
  if (to) return `Until ${formatIsoDateRange(to, to, locale)}`;
  return "Dates to be confirmed";
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
type PetJoin = { id: string; name: string };

type RequestRowWithRelations = RequestRow & {
  sender?: ProfileJoin | ProfileJoin[] | null;
  receiver?: ProfileJoin | ProfileJoin[] | null;
  pet?: PetJoin | PetJoin[] | null;
};

const MISSING_PARTICIPANT_LABEL = "Member";

function collectParticipantProfileIds(rows: RequestRow[]): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    if (row.sender_id) ids.add(row.sender_id);
    if (row.receiver_id) ids.add(row.receiver_id);
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
  },
): CareRequest {
  const senderId = row.sender_id;
  const receiverId = row.receiver_id;
  const otherId = direction === "outgoing" ? receiverId : senderId;
  const otherPartyName =
    otherId === senderId ? names.senderName : otherId === receiverId ? names.receiverName : MISSING_PARTICIPANT_LABEL;

  return {
    id: row.id,
    status: row.status,
    dateFrom: row.date_from,
    dateTo: row.date_to,
    message: row.message,
    careType: row.care_type,
    petId: row.pet_id,
    petName: names.petName,
    senderId,
    receiverId,
    senderName: names.senderName,
    receiverName: names.receiverName,
    otherPartyName,
    dateLabel: formatDateRange(row.date_from, row.date_to, null, null),
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

  return { senderName, receiverName, petName };
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

async function loadPetNamesById(
  supabase: SupabaseClient,
  petIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!petIds.length) return map;

  const { data, error } = await supabase.from("pets").select("id, name").in("id", petIds);
  if (error) throw error;

  for (const row of data ?? []) {
    const name = (row.name as string)?.trim();
    if (name) map.set(row.id as string, name);
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

  const [petNames, profileNames] = await Promise.all([
    loadPetNamesById(supabase, petIds),
    loadProfileNamesById(supabase, profileIds),
  ]);

  return rows.map((row) =>
    mapRequestRow(row, userId, direction, {
      senderName: participantName(profileNames, row.sender_id),
      receiverName: participantName(profileNames, row.receiver_id),
      petName: row.pet_id ? (petNames.get(row.pet_id) ?? "Pet") : null,
    }),
  );
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

async function fetchRequestsForDirection(
  supabase: SupabaseClient,
  userId: string,
  direction: "incoming" | "outgoing",
): Promise<CareRequest[]> {
  const column = direction === "incoming" ? "receiver_id" : "sender_id";

  const withRelations = await supabase
    .from("requests")
    .select(REQUEST_SELECT_WITH_RELATIONS)
    .eq(column, userId)
    .order("created_at", { ascending: false });

  if (!withRelations.error) {
    return mapRequestsFromEmbedded(
      (withRelations.data ?? []) as RequestRowWithRelations[],
      userId,
      direction,
    );
  }

  if (!isEmbedQueryError(withRelations.error)) {
    throw withRelations.error;
  }

  const base = await supabase
    .from("requests")
    .select(REQUEST_SELECT)
    .eq(column, userId)
    .order("created_at", { ascending: false });

  if (base.error) throw base.error;
  return enrichRequests(supabase, (base.data ?? []) as RequestRow[], userId, direction);
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

  const conversationId = await ensureConversationForAcceptedRequest(supabase, requestId);
  if (!conversationId) {
    throw new Error("Request was accepted but the chat could not be started. Refresh and open Messages.");
  }

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

/** Requests where user is the receiver. */
export async function countIncomingRequests(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("requests")
      .select("id", { count: "exact", head: true })
      .eq("receiver_id", userId);

    if (error) return 0;
    return count ?? 0;
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
    const { count, error } = await supabase
      .from("requests")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", userId);

    if (error) return 0;
    return count ?? 0;
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
