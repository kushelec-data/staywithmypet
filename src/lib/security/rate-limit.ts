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

/**
 * In-memory limiter. Per-instance only — safe for local dev and as a fallback,
 * but NOT reliable across serverless instances. Server code should prefer the
 * shared-store variants below, which upgrade to a distributed store when
 * Upstash Redis REST env vars are configured.
 */
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

/* -------------------------------------------------------------------------- */
/* Shared-store (distributed) limiter                                         */
/* -------------------------------------------------------------------------- */

/**
 * Reads Upstash Redis REST credentials from the environment. Returns null when
 * they are not configured, in which case callers transparently fall back to
 * the in-memory limiter above.
 *
 * Required environment variables (server-only, never exposed to the client):
 *   - UPSTASH_REDIS_REST_URL
 *   - UPSTASH_REDIS_REST_TOKEN
 */
function getSharedStoreConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

export function isSharedRateLimitEnabled(): boolean {
  return getSharedStoreConfig() !== null;
}

/**
 * Distributed limiter backed by Upstash Redis REST. Uses a single pipelined
 * round trip: INCR the counter, set the window expiry only on first hit
 * (PEXPIRE ... NX), and read the remaining TTL to compute retry-after.
 *
 * Fails open: any misconfiguration or network/store error falls back to the
 * in-memory limiter so that a store outage never blocks legitimate traffic
 * (e.g. checkout). When the store is unavailable it degrades to per-instance
 * limiting rather than no limiting.
 */
async function checkSharedStore(
  config: { url: string; token: string },
  action: RateLimitAction,
  identity: string,
): Promise<RateLimitResult> {
  const limitConfig = LIMITS[action];
  const key = `rl:${action}:${identity}`;

  const response = await fetch(`${config.url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", key],
      ["PEXPIRE", key, limitConfig.windowMs, "NX"],
      ["PTTL", key],
    ]),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Upstash pipeline failed with status ${response.status}`);
  }

  const results = (await response.json()) as Array<{ result?: unknown; error?: string }>;
  const count = Number(results?.[0]?.result);
  const ttlMs = Number(results?.[2]?.result);

  if (!Number.isFinite(count)) {
    throw new Error("Upstash pipeline returned an unexpected payload");
  }

  if (count > limitConfig.max) {
    const safeTtl = Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : limitConfig.windowMs;
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil(safeTtl / 1000)) };
  }

  return { ok: true };
}

/**
 * Rate-limit check that uses the shared store when configured and otherwise
 * falls back to the in-memory limiter. Use this from server code (API routes,
 * server actions) so limits are enforced across serverless instances.
 */
export async function checkRateLimitShared(
  action: RateLimitAction,
  identity: string,
): Promise<RateLimitResult> {
  const config = getSharedStoreConfig();
  if (!config) {
    return checkRateLimit(action, identity);
  }

  try {
    return await checkSharedStore(config, action, identity);
  } catch {
    // Fail open to the per-instance limiter on any store/network error.
    return checkRateLimit(action, identity);
  }
}

/** Throws when the limit is exceeded. Shared-store variant of assertRateLimit. */
export async function assertRateLimitShared(
  action: RateLimitAction,
  identity: string,
): Promise<void> {
  const result = await checkRateLimitShared(action, identity);
  if (!result.ok) {
    throw new Error(rateLimitMessage(result.retryAfterSec));
  }
}
