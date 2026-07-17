/**
 * Helpers for keeping personally identifiable information (PII) out of server
 * logs. Use these whenever a log line would otherwise contain an email
 * address, an internal user/identifier, or a raw third-party metadata object.
 */

/** Masks an email to its first character + domain, e.g. "a***@example.com". */
export function redactEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const at = email.indexOf("@");
  if (at <= 0) return "[redacted]";
  const domain = email.slice(at + 1);
  return `${email[0]}***@${domain}`;
}

/**
 * Masks an opaque identifier (user id, UUID, etc.) to a short prefix so log
 * lines remain correlatable for debugging without exposing the full value.
 */
export function maskId(id: string | null | undefined): string | null {
  if (!id) return null;
  const value = String(id);
  if (value.length <= 6) return "***";
  return `${value.slice(0, 6)}…`;
}
