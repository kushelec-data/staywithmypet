export const REQUEST_MESSAGE_MAX_CHARS = 500;

export function countMessageCharacters(text: string): number {
  return text.length;
}

export function isMessageLengthValid(text: string): boolean {
  return text.trim().length > 0 && text.length <= REQUEST_MESSAGE_MAX_CHARS;
}

import { isPastDate, todayISODate } from "@/lib/calendar-date-state";
import { normalizeAvailabilityDates } from "@/lib/pet-availability";
import type { RequestRow } from "@/types/database";

/** Local calendar date YYYY-MM-DD for today. */
export function todayDateInputValue(): string {
  return todayISODate();
}

export function isPastDateInput(date: string): boolean {
  if (!date) return false;
  return isPastDate(date);
}

export const PAST_DATE_REQUEST_ERROR = "Please choose today or a future date.";

export const REQUEST_EXPIRED_ERROR =
  "This request has expired because the care dates have already passed.";

export type RequestCareDatesInput = Pick<
  RequestRow,
  "date_from" | "date_to" | "requested_dates"
>;

/** Last care date on a request (max of requested_dates, else date_to, else date_from). */
export function getRequestLastCareDate(row: RequestCareDatesInput): string | null {
  const requested = normalizeAvailabilityDates(row.requested_dates ?? []);
  if (requested.length) return requested[requested.length - 1] ?? null;
  if (row.date_to) return row.date_to;
  if (row.date_from) return row.date_from;
  return null;
}

/** True when the last care date is strictly before today (local calendar). */
export function areRequestCareDatesPast(
  row: RequestCareDatesInput,
  today = todayISODate(),
): boolean {
  const last = getRequestLastCareDate(row);
  if (!last) return false;
  return isPastDate(last, today);
}

/** Pending requests whose last care date is before today are expired in UI and accept flows. */
export function isRequestExpired(
  row: Pick<RequestRow, "status" | "date_from" | "date_to" | "requested_dates">,
  today = todayISODate(),
): boolean {
  if (row.status !== "pending") return false;
  return areRequestCareDatesPast(row, today);
}

export function isRequestExpiredError(message: string): boolean {
  return message === REQUEST_EXPIRED_ERROR;
}

export const DATE_NOT_AVAILABLE_ERROR = "One or more selected dates are not available.";

export function validateCareRequestForm(values: {
  careType: string;
  selectedDates: string[];
  message: string;
  petParentId: string;
  petFriendId: string;
}): string | null {
  if (values.petParentId === values.petFriendId) {
    return "You cannot send a request to yourself.";
  }
  if (!values.careType.trim()) {
    return "Please choose a care type.";
  }
  if (!values.selectedDates.length) {
    return "Please select at least one date from the calendar.";
  }
  if (values.selectedDates.some((d) => isPastDateInput(d))) {
    return PAST_DATE_REQUEST_ERROR;
  }
  if (!isMessageLengthValid(values.message)) {
    if (!values.message.trim()) return "Please add a message.";
    return `Message must be ${REQUEST_MESSAGE_MAX_CHARS} characters or fewer.`;
  }
  return null;
}
