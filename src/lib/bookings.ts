import type { SupabaseClient } from "@supabase/supabase-js";
import { formatCareTypeLabel, localizeCareTypeLabel, type CareTypeDisplayCopy } from "@/lib/care-type-options";
import type { Locale } from "@/i18n/translations";
import type { Dictionary } from "@/i18n/translations";
import { statusBadgeClass } from "@/lib/status-colors";
import { formatBookingDatesForRow } from "@/lib/date-format";
import { normalizeRequestMessage } from "@/lib/requests";
import { normalizeAvailabilityDates } from "@/lib/pet-availability";
import { todayDateInputValue } from "@/lib/request-validation";
import { formatSupabaseError } from "@/lib/profile-load";
import { isMissingRelationError, isPostgrestError } from "@/lib/supabase-errors";
import type { BookingRow, BookingStatus } from "@/types/database";

export type { BookingStatus } from "@/types/database";

export type BookingTab = "upcoming" | "active" | "completed" | "cancelled";

export type Booking = {
  id: string;
  requestId: string;
  petId: string;
  petName: string;
  petParentId: string;
  petFriendId: string;
  otherPartyId: string;
  otherPartyName: string;
  careType: string | null;
  /** Stored DB care_type value for locale-aware display labels. */
  careTypeRaw: string | null;
  message: string | null;
  requestedDates: string[];
  requestedDatesLabel: string | null;
  status: BookingStatus;
  /** Tab derived from dates + cancelled flag. */
  displayStatus: BookingTab;
  startDate: string;
  endDate: string;
  dateLabel: string;
  createdAt: string;
  createdAtLabel: string;
  completedAt: string | null;
  completedAtLabel: string | null;
  cancelledAt: string | null;
  cancelledAtLabel: string | null;
  cancelledReason: string | null;
};

export type BookingDetail = Booking & {
  parentName: string;
  friendName: string;
};

const BOOKING_SELECT_BASE =
  "id, request_id, pet_id, pet_parent_id, pet_friend_id, status, start_date, end_date, created_at, completed_at, cancelled_at, cancelled_reason";

const BOOKING_SELECT_WITH_REQUEST = `${BOOKING_SELECT_BASE}, requests ( care_type, message, requested_dates, date_from, date_to )`;

const REQUEST_FIELDS_FOR_BOOKING =
  "id, care_type, message, requested_dates, date_from, date_to";

type RequestJoin = {
  care_type: string | null;
  message: string | null;
  requested_dates: string[] | null;
  date_from: string | null;
  date_to: string | null;
};

type BookingRowWithRequest = BookingRow & {
  requests: RequestJoin | RequestJoin[] | null;
};

function pickRequest(row: BookingRowWithRequest): RequestJoin | null {
  if (!row.requests) return null;
  return Array.isArray(row.requests) ? row.requests[0] ?? null : row.requests;
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

/** Effective start/end for display status (requested dates override row span). */
export function resolveBookingDateBounds(
  row: Pick<BookingRow, "start_date" | "end_date"> & { requested_dates?: string[] | null },
): { startDate: string; endDate: string } {
  const requested = normalizeAvailabilityDates(row.requested_dates ?? []);
  if (requested.length > 0) {
    return {
      startDate: requested[0]!,
      endDate: requested[requested.length - 1]!,
    };
  }
  return { startDate: row.start_date, endDate: row.end_date };
}

/** Status for tabs: upcoming | active | completed | cancelled. */
export function resolveBookingDisplayStatus(
  row: Pick<BookingRow, "status" | "start_date" | "end_date"> & {
    requested_dates?: string[] | null;
  },
): BookingTab {
  if (row.status === "cancelled") return "cancelled";
  if (row.status === "completed") return "completed";

  const today = todayDateInputValue();
  const { startDate, endDate } = resolveBookingDateBounds(row);

  if (endDate < today) return "completed";
  if (startDate > today) return "upcoming";
  return "active";
}

/** Active tab bookings that can be marked completed by a participant. */
export function canMarkBookingCompleted(
  booking: Pick<Booking, "displayStatus" | "status">,
): boolean {
  return (
    booking.displayStatus === "active" &&
    booking.status !== "completed" &&
    booking.status !== "cancelled"
  );
}

export function bookingStatusLabel(
  status: BookingTab,
  copy?: BookingStatusCopy,
): string {
  const labels = copy ?? DEFAULT_BOOKING_STATUS_COPY;
  switch (status) {
    case "upcoming":
      return labels.statusUpcoming;
    case "active":
      return labels.statusActive;
    case "completed":
      return labels.statusCompleted;
    case "cancelled":
      return labels.statusCancelled;
    default:
      return status;
  }
}

export type BookingStatusCopy = Pick<
  Dictionary["bookings"],
  "statusUpcoming" | "statusActive" | "statusCompleted" | "statusCancelled"
>;

const DEFAULT_BOOKING_STATUS_COPY: BookingStatusCopy = {
  statusUpcoming: "Upcoming",
  statusActive: "Active",
  statusCompleted: "Completed",
  statusCancelled: "Cancelled",
};

export function bookingCareTypeLabel(
  raw: string | null | undefined,
  locale: Locale,
  copy?: CareTypeDisplayCopy,
): string | null {
  return localizeCareTypeLabel(raw, locale, copy);
}

export function bookingStatusBadgeClasses(status: BookingTab): string {
  switch (status) {
    case "upcoming":
    case "active":
      return statusBadgeClass("booked");
    case "completed":
      return statusBadgeClass("unavailable");
    case "cancelled":
      return statusBadgeClass("error");
    default:
      return statusBadgeClass("pending");
  }
}

export function messagesHrefForBooking(requestId: string): string {
  return `/messages?request=${requestId}`;
}

export function bookingDetailsHref(bookingId: string): string {
  return `/dashboard/bookings/${bookingId}`;
}

function mapBookingRow(
  row: BookingRowWithRequest,
  petNames: Map<string, string>,
  profileNames: Map<string, string>,
  userId: string,
): Booking {
  const req = pickRequest(row);
  const requestedDates = normalizeAvailabilityDates(req?.requested_dates ?? []);
  const displayStatus = resolveBookingDisplayStatus({
    status: row.status,
    start_date: row.start_date,
    end_date: row.end_date,
    requested_dates: requestedDates,
  });
  const otherPartyId =
    userId === row.pet_parent_id ? row.pet_friend_id : row.pet_parent_id;
  const dateLabel = formatBookingDatesForRow({
    requested_dates: requestedDates,
    date_from: req?.date_from ?? row.start_date,
    date_to: req?.date_to ?? row.end_date,
  });

  return {
    id: row.id,
    requestId: row.request_id,
    petId: row.pet_id,
    petName: petNames.get(row.pet_id) ?? "Pet",
    petParentId: row.pet_parent_id,
    petFriendId: row.pet_friend_id,
    otherPartyId,
    otherPartyName: profileNames.get(otherPartyId) ?? "Member",
    careTypeRaw: req?.care_type?.trim() || null,
    careType: formatCareTypeLabel(req?.care_type) ?? null,
    message: req?.message ?? null,
    requestedDates,
    requestedDatesLabel: dateLabel,
    status: row.status,
    displayStatus,
    startDate: row.start_date,
    endDate: row.end_date,
    dateLabel,
    createdAt: row.created_at,
    createdAtLabel: formatCreatedAt(row.created_at),
    completedAt: row.completed_at,
    completedAtLabel: row.completed_at ? formatCreatedAt(row.completed_at) : null,
    cancelledAt: row.cancelled_at,
    cancelledAtLabel: row.cancelled_at ? formatCreatedAt(row.cancelled_at) : null,
    cancelledReason: row.cancelled_reason?.trim() || null,
  };
}

async function enrichBookings(
  supabase: SupabaseClient,
  rows: BookingRowWithRequest[],
  userId: string,
): Promise<Booking[]> {
  if (!rows.length) return [];

  const petIds = [...new Set(rows.map((r) => r.pet_id))];
  const profileIds = [
    ...new Set(rows.flatMap((r) => [r.pet_parent_id, r.pet_friend_id])),
  ];

  const [{ data: pets }, { data: profiles }] = await Promise.all([
    supabase.from("pets").select("id, name").in("id", petIds),
    supabase.from("profiles").select("id, display_name").in("id", profileIds),
  ]);

  const petNames = new Map((pets ?? []).map((p) => [p.id, p.name]));
  const profileNames = new Map(
    (profiles ?? []).map((p) => [p.id, (p.display_name as string)?.trim() || "Member"]),
  );

  return rows.map((row) => mapBookingRow(row, petNames, profileNames, userId));
}

export async function fetchBookings(
  supabase: SupabaseClient,
  userId: string,
  tab: BookingTab,
): Promise<Booking[]> {
  await autoCompleteDueBookings(supabase);
  const rows = await fetchBookingRows(supabase, userId, tab);
  const enriched = await enrichBookings(supabase, rows, userId);
  return enriched.filter((b) => b.displayStatus === tab);
}

export async function fetchBookingById(
  supabase: SupabaseClient,
  userId: string,
  bookingId: string,
): Promise<BookingDetail | null> {
  await autoCompleteDueBookings(supabase);
  const filter = `pet_parent_id.eq.${userId},pet_friend_id.eq.${userId}`;

  let row: BookingRowWithRequest | null = null;

  const withRequest = await supabase
    .from("bookings")
    .select(BOOKING_SELECT_WITH_REQUEST)
    .eq("id", bookingId)
    .or(filter)
    .maybeSingle();

  if (!withRequest.error && withRequest.data) {
    row = withRequest.data as BookingRowWithRequest;
  } else if (withRequest.error && !isMissingRelationError(withRequest.error)) {
    throw withRequest.error;
  } else {
    const base = await supabase
      .from("bookings")
      .select(BOOKING_SELECT_BASE)
      .eq("id", bookingId)
      .or(filter)
      .maybeSingle();

    if (base.error) throw base.error;
    if (!base.data) return null;

    const baseRow = base.data as BookingRow;
    const requestMap = await loadRequestsForBookings(supabase, [baseRow.request_id]);
    row = { ...baseRow, requests: requestMap.get(baseRow.request_id) ?? null };
  }

  if (!row) return null;
  const petIds = [row.pet_id];
  const profileIds = [row.pet_parent_id, row.pet_friend_id];

  const [{ data: pets }, { data: profiles }] = await Promise.all([
    supabase.from("pets").select("id, name").in("id", petIds),
    supabase.from("profiles").select("id, display_name").in("id", profileIds),
  ]);

  const petNames = new Map((pets ?? []).map((p) => [p.id, p.name]));
  const profileNames = new Map(
    (profiles ?? []).map((p) => [p.id, (p.display_name as string)?.trim() || "Member"]),
  );

  const booking = mapBookingRow(row, petNames, profileNames, userId);
  return {
    ...booking,
    parentName: profileNames.get(row.pet_parent_id) ?? "Member",
    friendName: profileNames.get(row.pet_friend_id) ?? "Member",
    message: normalizeRequestMessage(booking.message) || booking.message,
  };
}

export async function cancelBooking(
  supabase: SupabaseClient,
  bookingId: string,
  reason?: string | null,
): Promise<void> {
  const { error } = await supabase.rpc("cancel_booking", {
    p_booking_id: bookingId,
    p_reason: reason?.trim() || null,
  });
  if (error) throw error;
}

export async function completeBooking(
  supabase: SupabaseClient,
  bookingId: string,
): Promise<void> {
  const { error } = await supabase.rpc("complete_booking", { p_booking_id: bookingId });
  if (error) throw error;
}

/** Persist completed status when end_date is in the past (idempotent). */
export async function autoCompleteDueBookings(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.rpc("auto_complete_due_bookings_for_user");
  if (!error) return;
  if (isPostgrestError(error) && /auto_complete_due_bookings|Could not find the function/i.test(error.message)) {
    return;
  }
  if (isMissingRelationError(error)) return;
  throw error;
}

export function isBookingOverlapError(error: unknown): boolean {
  if (typeof error === "object" && error !== null && "message" in error) {
    const msg = String((error as { message: string }).message);
    return /overlap/i.test(msg);
  }
  return false;
}

export function formatBookingError(error: unknown): string {
  if (isBookingOverlapError(error)) {
    return "These dates overlap with an existing booking for this pet.";
  }
  if (isPostgrestError(error)) {
    if (/function.*complete_booking|Could not find the function/i.test(error.message)) {
      return "Booking completion is not set up yet. Run supabase/RUN_THIS_booking_completion.sql in the Supabase SQL Editor.";
    }
    return formatSupabaseError(error);
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Could not update booking.";
}

export function formatBookingsLoadError(error: unknown): string {
  if (isPostgrestError(error)) {
    if (isMissingRelationError(error)) {
      return "Bookings are not set up yet. Run supabase/RUN_THIS_bookings.sql in the Supabase SQL Editor.";
    }
    return formatSupabaseError(error);
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Could not load bookings.";
}

async function loadRequestsForBookings(
  supabase: SupabaseClient,
  requestIds: string[],
): Promise<Map<string, RequestJoin>> {
  if (!requestIds.length) return new Map();

  const { data, error } = await supabase
    .from("requests")
    .select(REQUEST_FIELDS_FOR_BOOKING)
    .in("id", requestIds);

  if (error) throw error;

  return new Map((data ?? []).map((r) => [r.id as string, r as RequestJoin]));
}

async function fetchBookingRows(
  supabase: SupabaseClient,
  userId: string,
  tab: BookingTab,
): Promise<BookingRowWithRequest[]> {
  const filter = `pet_parent_id.eq.${userId},pet_friend_id.eq.${userId}`;
  const orderAsc = tab !== "completed" && tab !== "cancelled";

  const withRequest = await supabase
    .from("bookings")
    .select(BOOKING_SELECT_WITH_REQUEST)
    .or(filter)
    .order("start_date", { ascending: orderAsc });

  if (!withRequest.error) {
    return (withRequest.data ?? []) as BookingRowWithRequest[];
  }

  if (isMissingRelationError(withRequest.error)) {
    const baseOnly = await supabase
      .from("bookings")
      .select(BOOKING_SELECT_BASE)
      .or(filter)
      .order("start_date", { ascending: orderAsc });

    if (baseOnly.error) throw baseOnly.error;

    const rows = (baseOnly.data ?? []) as BookingRow[];
    const requestMap = await loadRequestsForBookings(
      supabase,
      [...new Set(rows.map((r) => r.request_id))],
    );

    return rows.map((row) => ({
      ...row,
      requests: requestMap.get(row.request_id) ?? null,
    }));
  }

  throw withRequest.error;
}
