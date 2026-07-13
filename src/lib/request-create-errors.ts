import type { PostgrestError } from "@supabase/supabase-js";
import { MEMBERSHIP_REQUIRED_MESSAGE } from "@/lib/membership-access";
import { BLOCKED_USER_MESSAGE } from "@/lib/trust-safety";
import {
  DATES_UNAVAILABLE_CODE,
  PetDatesUnavailableError,
  type PetCalendarBlockReason,
} from "@/lib/pet-booking-availability";
import {
  DATE_NOT_AVAILABLE_ERROR,
  PAST_DATE_REQUEST_ERROR,
} from "@/lib/request-validation";
import { isPostgrestError } from "@/lib/supabase-errors";

export type CareRequestCreateErrorCode =
  | "MEMBERSHIP_REQUIRED"
  | "TERMS_REQUIRED"
  | "INVALID_DATES"
  | "DATES_UNAVAILABLE"
  | "REQUEST_ALREADY_EXISTS"
  | "REQUEST_PERMISSION_DENIED"
  | "REQUEST_CREATE_ERROR"
  | "NOTIFICATION_ERROR";

export type CareRequestCreateFailure = {
  ok: false;
  code: CareRequestCreateErrorCode;
  message: string;
  error: string;
  unavailableDates?: string[];
  blockReason?: PetCalendarBlockReason;
  supabaseCode?: string | null;
  details?: string | null;
  hint?: string | null;
};

export type CreateCareRequestResult =
  | { ok: true; requestId: string }
  | CareRequestCreateFailure;

const INVALID_PARTICIPANTS = "Invalid request participants.";
const SELF_REQUEST = "You cannot send a request to yourself.";
const DATES_ALREADY_BOOKED_MESSAGE =
  "Some selected dates are already booked. Please choose different dates.";
const DATES_PENDING_MESSAGE =
  "Some selected dates already have a pending care request. Please choose different dates.";

export function friendlyCareRequestCreateMessage(code: CareRequestCreateErrorCode): string {
  switch (code) {
    case "MEMBERSHIP_REQUIRED":
      return "An active Pet Parent membership is required to send a care request.";
    case "INVALID_DATES":
      return "Please select one or more available dates.";
    case "DATES_UNAVAILABLE":
      return DATES_ALREADY_BOOKED_MESSAGE;
    case "REQUEST_ALREADY_EXISTS":
      return "You already have a request for these dates.";
    case "REQUEST_PERMISSION_DENIED":
      return "This request cannot be sent. Please check the pet and booking details.";
    default:
      return "Could not send request. Please try again.";
  }
}

export function friendlyCareRequestCreateMessageForRole(
  code: CareRequestCreateErrorCode,
  role: "pet_parent" | "pet_friend",
): string {
  if (code === "MEMBERSHIP_REQUIRED") {
    return role === "pet_parent"
      ? "An active Pet Parent membership is required to send a care request."
      : "An active Pet Friend membership is required to send a care request.";
  }
  return friendlyCareRequestCreateMessage(code);
}

export function classifyCareRequestCreateError(
  error: PostgrestError | Error | string,
): CareRequestCreateErrorCode {
  const message =
    typeof error === "string" ? error : isPostgrestError(error) ? error.message : error.message;
  const code = isPostgrestError(error) ? error.code ?? "" : "";

  if (message.includes(MEMBERSHIP_REQUIRED_MESSAGE)) return "MEMBERSHIP_REQUIRED";
  if (error instanceof PetDatesUnavailableError || message === DATES_UNAVAILABLE_CODE) {
    return "DATES_UNAVAILABLE";
  }
  if (message === DATE_NOT_AVAILABLE_ERROR || message === PAST_DATE_REQUEST_ERROR) {
    return "INVALID_DATES";
  }
  if (message.includes("select at least one date")) return "INVALID_DATES";
  if (message === BLOCKED_USER_MESSAGE || message === SELF_REQUEST) {
    return "REQUEST_PERMISSION_DENIED";
  }
  if (message === INVALID_PARTICIPANTS) return "REQUEST_PERMISSION_DENIED";

  if (code === "23505" || /duplicate key|unique constraint/i.test(message)) {
    return "REQUEST_ALREADY_EXISTS";
  }

  if (
    code === "42501" ||
    code === "PGRST301" ||
    /row-level security/i.test(message) ||
    /permission denied/i.test(message) ||
    /users_are_blocked/i.test(message)
  ) {
    return "REQUEST_PERMISSION_DENIED";
  }

  if (code === "23503" && /pet_id|profiles|pets/i.test(message)) {
    return "REQUEST_PERMISSION_DENIED";
  }

  return "REQUEST_CREATE_ERROR";
}

export function logCareRequestCreateFailure(
  stage: string,
  context: Record<string, unknown>,
  error: PostgrestError | Error | string,
): void {
  if (isPostgrestError(error)) {
    console.error(`[care-request:create] ${stage} failed`, {
      ...context,
      code: error.code ?? null,
      message: error.message,
      details: error.details ?? null,
      hint: error.hint ?? null,
    });
    return;
  }

  const message = typeof error === "string" ? error : error.message;
  console.error(`[care-request:create] ${stage} failed`, {
    ...context,
    message,
  });
}

export function buildDatesUnavailableFailure(
  error: PetDatesUnavailableError,
  role: "pet_parent" | "pet_friend" = "pet_parent",
): CareRequestCreateFailure {
  const message =
    error.reason === "pending"
      ? DATES_PENDING_MESSAGE
      : friendlyCareRequestCreateMessageForRole("DATES_UNAVAILABLE", role);

  return {
    ok: false,
    code: "DATES_UNAVAILABLE",
    message,
    error: error.message,
    unavailableDates: error.unavailableDates,
    blockReason: error.reason,
  };
}

export function buildCareRequestCreateFailure(
  error: PostgrestError | Error | string,
  role: "pet_parent" | "pet_friend" = "pet_parent",
): CareRequestCreateFailure {
  const code = classifyCareRequestCreateError(error);
  const rawMessage =
    typeof error === "string" ? error : isPostgrestError(error) ? error.message : error.message;

  return {
    ok: false,
    code,
    message: friendlyCareRequestCreateMessageForRole(code, role),
    error: rawMessage,
    ...(isPostgrestError(error)
      ? {
          supabaseCode: error.code ?? null,
          details: error.details ?? null,
          hint: error.hint ?? null,
        }
      : {}),
  };
}
