import type { PostgrestError } from "@supabase/supabase-js";
import { logServerError, toFriendlyClientMessage } from "@/lib/security/errors";

export type SupabaseErrorDetail = {
  code: string | null;
  message: string;
  details: string | null;
  hint: string | null;
};

export function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    typeof (error as PostgrestError).message === "string"
  );
}

export function supabaseErrorDetail(error: PostgrestError | null | undefined): SupabaseErrorDetail | null {
  if (!error) return null;
  return {
    code: error.code ?? null,
    message: error.message,
    details: error.details ?? null,
    hint: error.hint ?? null,
  };
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

/** Invalid enum literal (e.g. membership_status before inactive/trialing migration). */
export function isInvalidEnumValueError(error: PostgrestError): boolean {
  return (
    error.code === "22P02" ||
    /invalid input value for enum/i.test(error.message) ||
    /enum\s+membership_status/i.test(error.message)
  );
}

/** Undefined column (Postgres) or missing schema cache column (PostgREST). */
export function isMissingColumnError(error: PostgrestError, column?: string): boolean {
  const codeMatch = error.code === "42703" || error.code === "PGRST204";
  if (!column) return codeMatch;
  const pattern = new RegExp(column, "i");
  return (
    codeMatch ||
    pattern.test(error.message) ||
    pattern.test(error.details ?? "")
  );
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

const REQUEST_SUBMIT_FALLBACK = "Could not send request. Please try again.";

function formatSupabaseDetailAppendix(error: PostgrestError): string {
  return [
    error.code ? `code: ${error.code}` : null,
    error.message ? `message: ${error.message}` : null,
    error.details ? `details: ${error.details}` : null,
    error.hint ? `hint: ${error.hint}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatRequestSubmitError(error: unknown): string {
  if (isPostgrestError(error)) {
    logServerError("request", error);
    return toFriendlyClientMessage(error, REQUEST_SUBMIT_FALLBACK);
  }
  if (error instanceof Error && error.message.trim()) {
    return toFriendlyClientMessage(error, REQUEST_SUBMIT_FALLBACK);
  }
  return REQUEST_SUBMIT_FALLBACK;
}

/**
 * Friendly headline plus raw PostgREST fields (all environments) for request-submit debugging.
 */
export function formatRequestSubmitErrorForUi(error: unknown): string {
  const base = formatRequestSubmitError(error);
  if (!isPostgrestError(error)) return base;

  const appendix = formatSupabaseDetailAppendix(error);
  if (!appendix) return base;

  const alreadyVerbose =
    base.includes(error.message) &&
    (error.details ? base.includes(error.details) : true);
  if (alreadyVerbose) return base;

  return `${base}\n\n${appendix}`;
}
