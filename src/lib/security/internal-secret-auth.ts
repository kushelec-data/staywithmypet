import { timingSafeEqual } from "node:crypto";

function secretsEqual(expected: string, provided: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** CRON_SECRET or EMAIL_INTERNAL_SECRET for scheduled/internal routes. */
export function getInternalCronSecret(): string | null {
  const secret =
    process.env.CRON_SECRET?.trim() || process.env.EMAIL_INTERNAL_SECRET?.trim();
  return secret || null;
}

/** EMAIL_INTERNAL_SECRET for internal email dispatch only. */
export function getEmailInternalSecret(): string | null {
  return process.env.EMAIL_INTERNAL_SECRET?.trim() || null;
}

export type InternalSecretAuthOptions = {
  /** Accept x-email-internal-secret (membership-reminders, process-scheduled-emails). */
  allowEmailInternalHeader?: boolean;
  /** Require EMAIL_INTERNAL_SECRET and x-email-internal-secret only (/api/emails/send). */
  emailInternalOnly?: boolean;
};

/**
 * Validates internal cron/email secrets using timing-safe comparison.
 * Fails closed when the server secret or supplied secret is missing/blank.
 */
export function isInternalSecretAuthorized(
  request: Request,
  options: InternalSecretAuthOptions = {},
): boolean {
  const configured = options.emailInternalOnly
    ? getEmailInternalSecret()
    : getInternalCronSecret();
  if (!configured) return false;

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (bearer && secretsEqual(configured, bearer)) return true;

  if (!options.emailInternalOnly) {
    const cronHeader = request.headers.get("x-cron-secret")?.trim();
    if (cronHeader && secretsEqual(configured, cronHeader)) return true;
  }

  if (options.allowEmailInternalHeader || options.emailInternalOnly) {
    const emailHeader = request.headers.get("x-email-internal-secret")?.trim();
    if (emailHeader && secretsEqual(configured, emailHeader)) return true;
  }

  return false;
}
