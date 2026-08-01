import type { PostgrestError } from "@supabase/supabase-js";
import { isSafeDebugLoggingEnabled, sanitizeLogFields } from "@/lib/security/safe-log";

const GENERIC_MESSAGE = "Something went wrong. Please try again.";

const FRIENDLY_BY_CODE: Record<string, string> = {
  "23505": "This record already exists.",
  "23503": "That action is not allowed right now.",
  "42501": "You do not have permission to do that.",
  PGRST116: "We could not find that item.",
  PGRST301: "You do not have permission to do that.",
};

function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as PostgrestError).message === "string"
  );
}

/** Log full error server-side; return a safe message for UI/API responses. */
export function toFriendlyClientMessage(error: unknown, fallback = GENERIC_MESSAGE): string {
  if (error instanceof Error && error.message.trim()) {
    const msg = error.message.trim();
    if (!looksLikeDatabaseError(msg)) return msg;
  }

  if (isPostgrestError(error)) {
    if (error.code && FRIENDLY_BY_CODE[error.code]) {
      return FRIENDLY_BY_CODE[error.code];
    }
    if (process.env.NODE_ENV === "development") {
      const parts = [error.message];
      if (error.details) parts.push(error.details);
      if (error.hint) parts.push(error.hint);
      if (error.code) parts.push(`Code: ${error.code}`);
      return parts.join(" — ");
    }
    return fallback;
  }

  return fallback;
}

export function logServerError(context: string, error: unknown): void {
  if (isPostgrestError(error)) {
    const fields = {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    };
    if (isSafeDebugLoggingEnabled()) {
      console.error(`[${context}]`, fields);
      return;
    }
    console.error(`[${context}]`, sanitizeLogFields(fields));
    return;
  }
  if (isSafeDebugLoggingEnabled()) {
    console.error(`[${context}]`, error);
    return;
  }
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${context}]`, { message });
}

function looksLikeDatabaseError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("postgres") ||
    lower.includes("pgrst") ||
    lower.includes("row-level security") ||
    lower.includes("violates") ||
    lower.includes("duplicate key") ||
    /\bSQL\b/.test(message)
  );
}
