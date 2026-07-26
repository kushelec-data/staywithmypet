/** Development-only timing for app-wide performance investigation. No-op in production. */

const DEV =
  process.env.NODE_ENV === "development" || process.env.APP_DEV_PERF === "1";

export function appDevPerfIsEnabled(): boolean {
  return DEV;
}

function roundMs(ms: number): number {
  return Math.round(ms * 10) / 10;
}

export type AppDevPerfMeta = Record<string, string | number | boolean | null | undefined>;

/** Log a completed perf span (development only). */
export function appDevLogPerf(
  scope: string,
  durationMs: number,
  requestCount: number,
  meta?: AppDevPerfMeta,
): void {
  if (!DEV) return;
  console.info("[app-perf]", {
    scope,
    durationMs: roundMs(durationMs),
    supabaseRequests: requestCount,
    ...meta,
  });
}

/** Time an async block and log duration + optional request count (development only). */
export async function appDevSpan<T>(
  scope: string,
  requestCount: number,
  fn: () => Promise<T>,
  meta?: AppDevPerfMeta,
): Promise<T> {
  if (!DEV) {
    return fn();
  }

  const startedAt = performance.now();
  try {
    return await fn();
  } finally {
    appDevLogPerf(scope, performance.now() - startedAt, requestCount, meta);
  }
}
