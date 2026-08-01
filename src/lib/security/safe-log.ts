import { maskId, redactEmail } from "@/lib/security/log-redact";

/** Detailed server logs when APP_SAFE_DEBUG_LOG=1 in development or preview only. */
export function isSafeDebugLoggingEnabled(): boolean {
  if (process.env.APP_SAFE_DEBUG_LOG !== "1") return false;
  if (process.env.NODE_ENV === "development") return true;
  if (process.env.VERCEL_ENV === "preview") return true;
  return false;
}

const ID_KEY_PATTERN =
  /^(user_?id|profile_?id|pet_?id|request_?id|booking_?id|session_?id|subscription_?id|invoice_?id|event_?id|membership_?id|acceptance_?id|sender_?id|receiver_?id|parent_?id|friend_?id|owner_?id|client_?reference_?id|meta_?user_?id|auth_?user_?id|unique_?key)$/i;

const EMAIL_KEY_PATTERN = /email/i;

const STRIP_KEYS = new Set([
  "stack",
  "payload",
  "payloadAttempted",
  "metadata",
  "rawBody",
  "body",
  "webhookSecretPrefix",
  "first10",
  "last6",
  "priceSuffix",
  "priceIdSuffix",
  "priceFingerprint",
  "supabaseError",
  "details",
  "hint",
  "oauthErrorDescription",
  "environmentVariables",
  "rawBodyLength",
]);

function sanitizeValue(key: string, value: unknown): unknown {
  if (value == null) return value;

  if (STRIP_KEYS.has(key)) {
    return isSafeDebugLoggingEnabled() ? value : undefined;
  }

  if (EMAIL_KEY_PATTERN.test(key) && typeof value === "string") {
    return redactEmail(value);
  }

  if (ID_KEY_PATTERN.test(key)) {
    if (typeof value === "string") return maskId(value);
    return isSafeDebugLoggingEnabled() ? value : "[redacted]";
  }

  if (typeof value === "string" && /^[0-9a-f-]{20,}$/i.test(value)) {
    return maskId(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      typeof item === "object" && item !== null
        ? sanitizeLogFields(item as Record<string, unknown>)
        : item,
    );
  }

  if (typeof value === "object") {
    return sanitizeLogFields(value as Record<string, unknown>);
  }

  return value;
}

export function sanitizeLogFields(
  fields: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    const sanitized = sanitizeValue(key, value);
    if (sanitized !== undefined) {
      out[key] = sanitized;
    }
  }
  return out;
}

export function safeLogInfo(context: string, fields?: Record<string, unknown>): void {
  if (isSafeDebugLoggingEnabled()) {
    console.info(`[${context}]`, fields ?? {});
    return;
  }
  if (!fields || Object.keys(fields).length === 0) {
    console.info(`[${context}]`);
    return;
  }
  console.info(`[${context}]`, sanitizeLogFields(fields));
}

export function safeLogWarn(context: string, fields?: Record<string, unknown>): void {
  if (isSafeDebugLoggingEnabled()) {
    console.warn(`[${context}]`, fields ?? {});
    return;
  }
  if (!fields || Object.keys(fields).length === 0) {
    console.warn(`[${context}]`);
    return;
  }
  console.warn(`[${context}]`, sanitizeLogFields(fields));
}

export function safeLogError(context: string, fields?: Record<string, unknown>): void {
  if (isSafeDebugLoggingEnabled()) {
    console.error(`[${context}]`, fields ?? {});
    return;
  }
  if (!fields || Object.keys(fields).length === 0) {
    console.error(`[${context}]`);
    return;
  }
  console.error(`[${context}]`, sanitizeLogFields(fields));
}
