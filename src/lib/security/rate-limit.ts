type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export type RateLimitAction =
  | "auth_login"
  | "auth_signup"
  | "auth_resend"
  | "care_request"
  | "message_send"
  | "file_upload"
  | "contact_form"
  | "api_default";

const LIMITS: Record<RateLimitAction, { max: number; windowMs: number }> = {
  auth_login: { max: 10, windowMs: 15 * 60 * 1000 },
  auth_signup: { max: 5, windowMs: 60 * 60 * 1000 },
  auth_resend: { max: 5, windowMs: 60 * 60 * 1000 },
  care_request: { max: 20, windowMs: 60 * 60 * 1000 },
  message_send: { max: 60, windowMs: 60 * 60 * 1000 },
  file_upload: { max: 30, windowMs: 60 * 60 * 1000 },
  contact_form: { max: 5, windowMs: 60 * 60 * 1000 },
  api_default: { max: 120, windowMs: 60 * 1000 },
};

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

function prune(key: string, now: number): Bucket {
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const fresh = { count: 0, resetAt: now };
    buckets.set(key, fresh);
    return fresh;
  }
  return existing;
}

export function checkRateLimit(
  action: RateLimitAction,
  identity: string,
): RateLimitResult {
  const config = LIMITS[action];
  const now = Date.now();
  const key = `${action}:${identity}`;
  const bucket = prune(key, now);

  if (bucket.resetAt <= now) {
    bucket.count = 0;
    bucket.resetAt = now + config.windowMs;
  }

  bucket.count += 1;
  buckets.set(key, bucket);

  if (bucket.count > config.max) {
    const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return { ok: false, retryAfterSec };
  }

  return { ok: true };
}

export function rateLimitMessage(retryAfterSec: number): string {
  if (retryAfterSec < 60) {
    return `Too many attempts. Please wait ${retryAfterSec} seconds and try again.`;
  }
  const minutes = Math.ceil(retryAfterSec / 60);
  return `Too many attempts. Please wait ${minutes} minute${minutes === 1 ? "" : "s"} and try again.`;
}

/** Throws when the limit is exceeded (for server actions / lib calls). */
export function assertRateLimit(action: RateLimitAction, identity: string): void {
  const result = checkRateLimit(action, identity);
  if (!result.ok) {
    throw new Error(rateLimitMessage(result.retryAfterSec));
  }
}
