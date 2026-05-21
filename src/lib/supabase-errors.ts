import type { PostgrestError } from "@supabase/supabase-js";
import { logServerError, toFriendlyClientMessage } from "@/lib/security/errors";
import { formatSupabaseError } from "@/lib/profile-load";

export function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    typeof (error as PostgrestError).message === "string"
  );
}

/** Log full PostgREST / Postgres error fields for debugging. */
export function logSupabaseError(context: string, error: PostgrestError | Error): void {
  if (isPostgrestError(error)) {
    console.error(`[request] ${context}`, {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return;
  }
  console.error(`[request] ${context}`, error);
}

/** Undefined column (Postgres) or missing schema cache column (PostgREST). */
export function isMissingColumnError(error: PostgrestError): boolean {
  return error.code === "42703" || error.code === "PGRST204";
}

/** Table/relation missing (migrations not applied). */
export function isMissingRelationError(error: PostgrestError): boolean {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /relation.*does not exist/i.test(error.message) ||
    /schema cache/i.test(error.message)
  );
}

export function formatRequestSubmitError(error: unknown): string {
  if (isPostgrestError(error)) {
    logServerError("request", error);
    return toFriendlyClientMessage(error, "Could not send request. Please try again.");
  }
  if (error instanceof Error && error.message.trim()) {
    return toFriendlyClientMessage(error, "Could not send request. Please try again.");
  }
  return "Could not send request. Please try again.";
}

/** Friendly UI copy; raw Postgres details only in development. */
export function formatRequestSubmitErrorForUi(error: unknown): string {
  return formatRequestSubmitError(error);
}
