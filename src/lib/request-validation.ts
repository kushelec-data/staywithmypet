export const REQUEST_MESSAGE_MAX_CHARS = 500;

export function countMessageCharacters(text: string): number {
  return text.length;
}

export function isMessageLengthValid(text: string): boolean {
  return text.trim().length > 0 && text.length <= REQUEST_MESSAGE_MAX_CHARS;
}

/** Local calendar date YYYY-MM-DD for today. */
export function todayDateInputValue(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isPastDateInput(date: string): boolean {
  if (!date) return false;
  return date < todayDateInputValue();
}

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
    return "Selected dates cannot be in the past.";
  }
  if (!isMessageLengthValid(values.message)) {
    if (!values.message.trim()) return "Please add a message.";
    return `Message must be ${REQUEST_MESSAGE_MAX_CHARS} characters or fewer.`;
  }
  return null;
}
