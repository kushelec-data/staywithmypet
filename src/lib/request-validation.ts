export const REQUEST_MESSAGE_MAX_CHARS = 500;

export function countMessageCharacters(text: string): number {
  return text.length;
}

export function isMessageLengthValid(text: string): boolean {
  return text.trim().length > 0 && text.length <= REQUEST_MESSAGE_MAX_CHARS;
}

import { isPastDate, todayISODate } from "@/lib/calendar-date-state";

/** Local calendar date YYYY-MM-DD for today. */
export function todayDateInputValue(): string {
  return todayISODate();
}

export function isPastDateInput(date: string): boolean {
  if (!date) return false;
  return isPastDate(date);
}

export const PAST_DATE_REQUEST_ERROR = "Please choose today or a future date.";

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
