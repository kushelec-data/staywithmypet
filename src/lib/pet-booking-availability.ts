import {
  BOOKING_BLOCKING_STATUSES,
  bookingOccurrenceDates,
  monthBounds,
} from "@/lib/booking-calendar";
import {
  eachISODateInRangeInclusive,
  normalizeAvailabilityDates,
} from "@/lib/pet-availability";
import type { BookingStatus, RequestStatus } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

export const DATES_UNAVAILABLE_CODE = "DATES_UNAVAILABLE" as const;
export const DATES_UNAVAILABLE_ERROR = DATES_UNAVAILABLE_CODE;

export type PetCalendarBlockReason = "booked" | "pending";

export class PetDatesUnavailableError extends Error {
  readonly code = DATES_UNAVAILABLE_CODE;
  readonly unavailableDates: string[];
  readonly reason: PetCalendarBlockReason;

  constructor(unavailableDates: string[], reason: PetCalendarBlockReason) {
    super(DATES_UNAVAILABLE_ERROR);
    this.name = "PetDatesUnavailableError";
    this.unavailableDates = normalizeAvailabilityDates(unavailableDates);
    this.reason = reason;
  }
}

type RequestDateRow = {
  requested_dates?: string[] | null;
  date_from?: string | null;
  date_to?: string | null;
};

type BookingDateRow = {
  start_date: string;
  end_date: string;
  status: BookingStatus;
  requests:
    | { requested_dates?: string[] | null }
    | { requested_dates?: string[] | null }[]
    | null;
};

/** Expand a request row to individual ISO dates (non-contiguous lists preserved). */
export function expandRequestCareDates(row: RequestDateRow): string[] {
  const requested = normalizeAvailabilityDates(row.requested_dates ?? []);
  if (requested.length) return requested;
  if (row.date_from) {
    return eachISODateInRangeInclusive(row.date_from, row.date_to ?? row.date_from);
  }
  return [];
}

/** Expand a booking to individual occupied ISO dates. */
export function expandBookingCareDates(row: BookingDateRow): string[] {
  const reqJoin = Array.isArray(row.requests) ? row.requests[0] : row.requests;
  return bookingOccurrenceDates({
    startDate: row.start_date,
    endDate: row.end_date,
    requestedDates: normalizeAvailabilityDates(reqJoin?.requested_dates ?? []),
  });
}

export function mergeDateSets(...sets: Iterable<string>[]): Set<string> {
  const out = new Set<string>();
  for (const set of sets) {
    for (const iso of set) out.add(iso);
  }
  return out;
}

export function findUnavailableSelectedDates(
  selectedDates: string[],
  bookedDates: Set<string>,
  pendingDates: Set<string>,
): { unavailableDates: string[]; reason: PetCalendarBlockReason | null } {
  const normalized = normalizeAvailabilityDates(selectedDates);
  const booked = normalized.filter((d) => bookedDates.has(d));
  if (booked.length) {
    return { unavailableDates: booked, reason: "booked" };
  }
  const pending = normalized.filter((d) => pendingDates.has(d));
  if (pending.length) {
    return { unavailableDates: pending, reason: "pending" };
  }
  return { unavailableDates: [], reason: null };
}

export function datesInMonthRange(
  dates: Iterable<string>,
  year: number,
  month: number,
): string[] {
  const { start, end } = monthBounds(year, month);
  return [...dates].filter((d) => d >= start && d <= end).sort();
}

export async function loadPetBlockingBookedDates(
  client: SupabaseClient,
  petId: string,
  range?: { start: string; end: string },
): Promise<Set<string>> {
  let query = client
    .from("bookings")
    .select("start_date, end_date, status, requests ( requested_dates )")
    .eq("pet_id", petId)
    .in("status", [...BOOKING_BLOCKING_STATUSES] as BookingStatus[]);

  if (range) {
    query = query.lte("start_date", range.end).gte("end_date", range.start);
  }

  const { data, error } = await query;
  if (error) throw error;

  const dates = new Set<string>();
  for (const row of (data ?? []) as BookingDateRow[]) {
    if (!BOOKING_BLOCKING_STATUSES.includes(row.status)) continue;
    for (const iso of expandBookingCareDates(row)) {
      if (!range || (iso >= range.start && iso <= range.end)) {
        dates.add(iso);
      }
    }
  }
  return dates;
}

export async function loadPetPendingRequestDates(
  client: SupabaseClient,
  petId: string,
  options?: { excludeRequestId?: string; status?: RequestStatus },
): Promise<Set<string>> {
  const status = options?.status ?? "pending";
  let query = client
    .from("requests")
    .select("id, requested_dates, date_from, date_to")
    .eq("pet_id", petId)
    .eq("status", status);

  if (options?.excludeRequestId) {
    query = query.neq("id", options.excludeRequestId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const dates = new Set<string>();
  for (const row of data ?? []) {
    for (const iso of expandRequestCareDates(row as RequestDateRow)) {
      dates.add(iso);
    }
  }
  return dates;
}

export async function assertSelectedDatesNotBlocked(
  client: SupabaseClient,
  petId: string,
  selectedDates: string[],
): Promise<void> {
  const normalized = normalizeAvailabilityDates(selectedDates);
  if (!normalized.length) return;

  const min = normalized[0]!;
  const max = normalized[normalized.length - 1]!;
  const [booked, pending] = await Promise.all([
    loadPetBlockingBookedDates(client, petId, { start: min, end: max }),
    loadPetPendingRequestDates(client, petId),
  ]);

  const conflict = findUnavailableSelectedDates(normalized, booked, pending);
  if (conflict.unavailableDates.length && conflict.reason) {
    throw new PetDatesUnavailableError(conflict.unavailableDates, conflict.reason);
  }
}
