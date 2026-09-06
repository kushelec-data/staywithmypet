export const ACTIVITY_EVENT_TYPES = [
  "page_view",
  "profile_viewed",
  "pet_viewed",
  "search_performed",
  "request_started",
  "request_sent",
  "request_accepted",
  "request_declined",
  "conversation_opened",
  "message_sent",
  "booking_created",
  "booking_completed",
  "match_viewed",
  "match_clicked",
  "match_dismissed",
  "profile_completed",
  "pet_created",
] as const;

export type ActivityEventType = (typeof ACTIVITY_EVENT_TYPES)[number];

export type TrackActivityInput = {
  userId: string | null;
  eventType: ActivityEventType;
  entityType?: string | null;
  entityId?: string | null;
  pagePath?: string | null;
  metadata?: Record<string, unknown>;
  sessionId?: string | null;
};

const TRACKED_PAGE_PATHS = new Set([
  "/find-care",
  "/find-pets",
  "/matches",
  "/requests",
  "/messages",
  "/bookings",
  "/profile",
  "/profile/edit",
  "/membership",
]);

export function isTrackedPagePath(pathname: string): boolean {
  if (TRACKED_PAGE_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/users/") && pathname.split("/").length === 3) return true;
  if (pathname.startsWith("/pet/") && pathname.split("/").length === 3) return true;
  if (pathname.startsWith("/find-pets/") && pathname.split("/").length === 3) return true;
  return false;
}

export function pageViewDedupeKey(pathname: string, sessionId: string): string {
  return `swmp_pv:${sessionId}:${pathname}`;
}

export function shouldRecordPageView(opts: {
  pathname: string;
  analyticsConsent: boolean;
  alreadyRecorded: boolean;
}): boolean {
  if (!opts.analyticsConsent) return false;
  if (!isTrackedPagePath(opts.pathname)) return false;
  if (opts.alreadyRecorded) return false;
  return true;
}

type InsertClient = {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => PromiseLike<{ error: { message: string } | null }>;
  };
};

/** Fire-and-forget. Never throws; never includes message bodies. */
export async function trackActivity(
  supabase: InsertClient | null | undefined,
  input: TrackActivityInput,
): Promise<{ ok: boolean }> {
  try {
    if (!supabase || !input.userId) return { ok: false };
    const metadata = { ...(input.metadata ?? {}) };
    delete metadata.body;
    delete metadata.message;
    delete metadata.password;
    delete metadata.token;
    const { error } = await supabase.from("user_activity_events").insert({
      user_id: input.userId,
      event_type: input.eventType,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      page_path: input.pagePath ?? null,
      metadata,
      session_id: input.sessionId ?? null,
    });
    if (error) return { ok: false };
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
