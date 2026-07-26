/** Development-only timing for messaging performance investigation. No-op in production. */

const DEV =
  process.env.NODE_ENV === "development" || process.env.MESSAGING_DEV_PERF === "1";

let activeTracker: (() => void) | null = null;

export function messagingDevIsEnabled(): boolean {
  return DEV;
}

/** Register a request counter for nested Supabase calls during a timed span. */
export function messagingDevSetRequestTracker(track: (() => void) | null): void {
  activeTracker = track;
}

/** Count one Supabase round-trip when a dev perf span is active. */
export function messagingDevTrackRequest(): void {
  activeTracker?.();
}

function roundMs(ms: number): number {
  return Math.round(ms * 10) / 10;
}

export type MessagingDevPerfMeta = Record<string, string | number | boolean | null | undefined>;

/** Time an async block and log duration + Supabase request count (development only). */
export async function messagingDevSpan<T>(
  scope: string,
  fn: (trackRequest: () => void) => Promise<T>,
  meta?: MessagingDevPerfMeta,
): Promise<T> {
  if (!DEV) {
    return fn(() => {});
  }

  let requestCount = 0;
  const trackRequest = () => {
    requestCount += 1;
  };

  const previousTracker = activeTracker;
  activeTracker = trackRequest;
  const startedAt = performance.now();

  try {
    return await fn(trackRequest);
  } finally {
    activeTracker = previousTracker;
    const durationMs = roundMs(performance.now() - startedAt);
    console.info("[messaging-perf]", {
      scope,
      durationMs,
      supabaseRequests: requestCount,
      ...meta,
    });
  }
}

/** Log a sub-phase duration without resetting the outer request tracker. */
export function messagingDevLogPhase(
  scope: string,
  durationMs: number,
  supabaseRequests: number,
  meta?: MessagingDevPerfMeta,
): void {
  if (!DEV) return;
  console.info("[messaging-perf]", {
    scope,
    durationMs: roundMs(durationMs),
    supabaseRequests,
    ...meta,
  });
}
