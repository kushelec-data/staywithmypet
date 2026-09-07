export const ANALYTICS_RANGES = ["1d", "7d", "30d", "90d"] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export const ANALYTICS_RANGE_LABELS: Record<AnalyticsRange, string> = {
  "1d": "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
};

export const ANALYTICS_CHART_METRICS = [
  "active_users",
  "page_views",
  "requests",
  "messages",
  "bookings",
  "matches",
] as const;
export type AnalyticsChartMetric = (typeof ANALYTICS_CHART_METRICS)[number];

export const ANALYTICS_CHART_LABELS: Record<AnalyticsChartMetric, string> = {
  active_users: "Active Users",
  page_views: "Page Views",
  requests: "Requests",
  messages: "Messages",
  bookings: "Bookings",
  matches: "Matches",
};

export function parseAnalyticsRange(raw: string | null | undefined): AnalyticsRange {
  if (raw === "1d" || raw === "30d" || raw === "90d") return raw;
  return "7d";
}

export function parseChartMetric(raw: string | null | undefined): AnalyticsChartMetric {
  if (ANALYTICS_CHART_METRICS.includes(raw as AnalyticsChartMetric)) {
    return raw as AnalyticsChartMetric;
  }
  return "active_users";
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export type AnalyticsWindow = {
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
  grain: "hour" | "day";
  range: AnalyticsRange;
};

/** Inclusive start, exclusive end. Previous window is the same duration immediately before. */
export function resolveAnalyticsWindow(range: AnalyticsRange, now = new Date()): AnalyticsWindow {
  const end = now;
  if (range === "1d") {
    const start = startOfUtcDay(now);
    const ms = end.getTime() - start.getTime() || 24 * 60 * 60 * 1000;
    return {
      start,
      end,
      previousStart: new Date(start.getTime() - ms),
      previousEnd: start,
      grain: "hour",
      range,
    };
  }
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const start = startOfUtcDay(new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000));
  const duration = end.getTime() - start.getTime();
  return {
    start,
    end,
    previousStart: new Date(start.getTime() - duration),
    previousEnd: start,
    grain: "day",
    range,
  };
}

export function inWindow(iso: string | null | undefined, start: Date, end: Date): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t < end.getTime();
}

export function bucketKey(iso: string, grain: "hour" | "day"): string {
  const d = new Date(iso);
  if (grain === "hour") {
    const hour = String(d.getUTCHours()).padStart(2, "0");
    return `${d.toISOString().slice(0, 10)}T${hour}`;
  }
  return d.toISOString().slice(0, 10);
}

export function enumerateBuckets(window: Pick<AnalyticsWindow, "start" | "end" | "grain">): string[] {
  const keys: string[] = [];
  if (window.grain === "hour") {
    const cursor = new Date(window.start);
    cursor.setUTCMinutes(0, 0, 0);
    while (cursor.getTime() < window.end.getTime()) {
      keys.push(bucketKey(cursor.toISOString(), "hour"));
      cursor.setUTCHours(cursor.getUTCHours() + 1);
    }
    return keys.length ? keys : [bucketKey(window.start.toISOString(), "hour")];
  }
  const cursor = startOfUtcDay(window.start);
  const last = startOfUtcDay(new Date(window.end.getTime() - 1));
  while (cursor.getTime() <= last.getTime()) {
    keys.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}

export type PeriodChange = {
  current: number;
  previous: number;
  label: string;
  direction: "up" | "down" | "flat" | "new";
};

export function periodChange(current: number, previous: number): PeriodChange {
  if (previous === 0 && current > 0) {
    return { current, previous, label: "New", direction: "new" };
  }
  if (previous === 0 && current === 0) {
    return { current, previous, label: "0%", direction: "flat" };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct > 0) return { current, previous, label: `+${pct}%`, direction: "up" };
  if (pct < 0) return { current, previous, label: `${pct}%`, direction: "down" };
  return { current, previous, label: "0%", direction: "flat" };
}

export type AnalyticsActivityEvent = {
  user_id: string | null;
  event_type: string;
  page_path: string | null;
  created_at: string;
  entity_type?: string | null;
  entity_id?: string | null;
};

export type AnalyticsCanonicalFacts = {
  signups: Array<{ id: string; created_at: string }>;
  requests: Array<{
    id: string;
    sender_id?: string | null;
    pet_parent_id: string;
    pet_friend_id: string;
    pet_id: string;
    status: string;
    created_at: string;
    updated_at?: string;
    responded_at?: string | null;
  }>;
  messages: Array<{ id: string; sender_id: string; conversation_id: string; created_at: string }>;
  bookings: Array<{
    id: string;
    pet_parent_id: string;
    pet_friend_id: string;
    status: string;
    created_at: string;
    completed_at: string | null;
    cancelled_at?: string | null;
  }>;
  conversations: Array<{ id: string; request_id: string; created_at: string }>;
  pets: Array<{ id: string; owner_id: string; name: string; created_at?: string }>;
  matches: Array<{
    id: string;
    pet_parent_id: string;
    pet_friend_id: string;
    pet_id: string;
    status: string;
    created_at: string;
    viewed_at: string | null;
    clicked_at: string | null;
  }>;
  activity: AnalyticsActivityEvent[];
};

const PAGE_VIEW = "page_view";

/** Canonical marketplace actions are not also counted from activity_events. */
export function countCanonicalInWindow<T extends { created_at: string }>(
  rows: T[],
  start: Date,
  end: Date,
): T[] {
  return rows.filter((row) => inWindow(row.created_at, start, end));
}

export function uniqueActiveUsers(
  facts: AnalyticsCanonicalFacts,
  start: Date,
  end: Date,
): Set<string> {
  const users = new Set<string>();
  const add = (id: string | null | undefined) => {
    if (id) users.add(id);
  };

  for (const event of facts.activity) {
    if (inWindow(event.created_at, start, end)) add(event.user_id);
  }
  for (const req of facts.requests) {
    if (inWindow(req.created_at, start, end)) add(req.sender_id ?? req.pet_friend_id);
  }
  for (const msg of facts.messages) {
    if (inWindow(msg.created_at, start, end)) add(msg.sender_id);
  }
  for (const booking of facts.bookings) {
    if (inWindow(booking.created_at, start, end) || inWindow(booking.completed_at, start, end)) {
      add(booking.pet_parent_id);
      add(booking.pet_friend_id);
    }
  }
  for (const pet of facts.pets) {
    if (pet.created_at && inWindow(pet.created_at, start, end)) add(pet.owner_id);
  }
  for (const match of facts.matches) {
    if (
      inWindow(match.viewed_at, start, end) ||
      inWindow(match.clicked_at, start, end) ||
      inWindow(match.created_at, start, end)
    ) {
      add(match.pet_parent_id);
      add(match.pet_friend_id);
    }
  }
  return users;
}

export function matchInteractionCount(matches: AnalyticsCanonicalFacts["matches"], start: Date, end: Date): number {
  let n = 0;
  for (const match of matches) {
    if (inWindow(match.viewed_at, start, end)) n += 1;
    if (inWindow(match.clicked_at, start, end)) n += 1;
    if (match.status === "dismissed" && (inWindow(match.viewed_at, start, end) || inWindow(match.created_at, start, end))) {
      n += 1;
    }
  }
  return n;
}

export function kpiTotals(facts: AnalyticsCanonicalFacts, start: Date, end: Date) {
  const pageViews = facts.activity.filter(
    (e) => e.event_type === PAGE_VIEW && inWindow(e.created_at, start, end),
  ).length;
  const requestsSent = facts.requests.filter((r) => inWindow(r.created_at, start, end)).length;
  const messagesSent = facts.messages.filter((m) => inWindow(m.created_at, start, end)).length;
  const bookingsCreated = facts.bookings.filter((b) => inWindow(b.created_at, start, end)).length;
  const completedBookings = facts.bookings.filter((b) => inWindow(b.completed_at, start, end)).length;
  return {
    uniqueActiveUsers: uniqueActiveUsers(facts, start, end).size,
    pageViews,
    newSignups: facts.signups.filter((s) => inWindow(s.created_at, start, end)).length,
    requestsSent,
    messagesSent,
    bookingsCreated,
    completedBookings,
    matchInteractions: matchInteractionCount(facts.matches, start, end),
  };
}

export function dailySeries(
  facts: AnalyticsCanonicalFacts,
  window: AnalyticsWindow,
  metric: AnalyticsChartMetric,
): Array<{ bucket: string; value: number }> {
  const buckets = enumerateBuckets(window);
  const values = new Map<string, number>();
  for (const key of buckets) values.set(key, 0);

  const bump = (iso: string, amount = 1) => {
    if (!inWindow(iso, window.start, window.end)) return;
    const key = bucketKey(iso, window.grain);
    if (!values.has(key)) return;
    values.set(key, (values.get(key) ?? 0) + amount);
  };

  if (metric === "active_users") {
    const seen = new Map<string, Set<string>>();
    const mark = (userId: string | null | undefined, iso: string) => {
      if (!userId || !inWindow(iso, window.start, window.end)) return;
      const key = bucketKey(iso, window.grain);
      if (!values.has(key)) return;
      const set = seen.get(key) ?? new Set<string>();
      set.add(userId);
      seen.set(key, set);
    };
    for (const event of facts.activity) mark(event.user_id, event.created_at);
    for (const req of facts.requests) {
      mark(req.sender_id, req.created_at);
    }
    for (const msg of facts.messages) mark(msg.sender_id, msg.created_at);
    for (const booking of facts.bookings) {
      mark(booking.pet_parent_id, booking.created_at);
      mark(booking.pet_friend_id, booking.created_at);
    }
    for (const [key, set] of seen) values.set(key, set.size);
  } else if (metric === "page_views") {
    for (const event of facts.activity) {
      if (event.event_type === PAGE_VIEW) bump(event.created_at);
    }
  } else if (metric === "requests") {
    for (const req of facts.requests) bump(req.created_at);
  } else if (metric === "messages") {
    for (const msg of facts.messages) bump(msg.created_at);
  } else if (metric === "bookings") {
    for (const booking of facts.bookings) bump(booking.created_at);
  } else if (metric === "matches") {
    for (const match of facts.matches) {
      if (match.viewed_at) bump(match.viewed_at);
      if (match.clicked_at) bump(match.clicked_at);
    }
  }

  return buckets.map((bucket) => ({ bucket, value: values.get(bucket) ?? 0 }));
}

export function dailyOverviewRows(facts: AnalyticsCanonicalFacts, window: AnalyticsWindow) {
  const buckets = enumerateBuckets({ ...window, grain: "day" });
  return buckets
    .map((date) => {
      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      const sliceEnd = end.getTime() < window.end.getTime() ? end : window.end;
      const active = uniqueActiveUsers(facts, start, sliceEnd).size;
      return {
        date,
        activeUsers: active,
        newUsers: facts.signups.filter((s) => inWindow(s.created_at, start, sliceEnd)).length,
        profileCompletions: facts.activity.filter(
          (e) => e.event_type === "profile_completed" && inWindow(e.created_at, start, sliceEnd),
        ).length,
        petsCreated: facts.pets.filter((p) => p.created_at && inWindow(p.created_at, start, sliceEnd)).length,
        requestsSent: facts.requests.filter((r) => inWindow(r.created_at, start, sliceEnd)).length,
        messagesSent: facts.messages.filter((m) => inWindow(m.created_at, start, sliceEnd)).length,
        bookingsCreated: facts.bookings.filter((b) => inWindow(b.created_at, start, sliceEnd)).length,
        bookingsCompleted: facts.bookings.filter((b) => inWindow(b.completed_at, start, sliceEnd)).length,
        matchesViewed: facts.matches.filter((m) => inWindow(m.viewed_at, start, sliceEnd)).length,
        matchesClicked: facts.matches.filter((m) => inWindow(m.clicked_at, start, sliceEnd)).length,
      };
    })
    .reverse();
}

export function topPages(events: AnalyticsActivityEvent[], start: Date, end: Date) {
  const views = events.filter((e) => e.event_type === PAGE_VIEW && inWindow(e.created_at, start, end));
  const byPath = new Map<string, { views: number; users: Set<string> }>();
  for (const event of views) {
    const path = event.page_path || "/";
    const row = byPath.get(path) ?? { views: 0, users: new Set<string>() };
    row.views += 1;
    if (event.user_id) row.users.add(event.user_id);
    byPath.set(path, row);
  }
  const total = views.length || 1;
  return [...byPath.entries()]
    .map(([page, row]) => ({
      page,
      views: row.views,
      uniqueUsers: row.users.size,
      percent: Math.round((row.views / total) * 1000) / 10,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 20);
}

export function topEvents(events: AnalyticsActivityEvent[], start: Date, end: Date) {
  const inRange = events.filter((e) => inWindow(e.created_at, start, end));
  const byType = new Map<string, { total: number; users: Set<string> }>();
  for (const event of inRange) {
    const row = byType.get(event.event_type) ?? { total: 0, users: new Set<string>() };
    row.total += 1;
    if (event.user_id) row.users.add(event.user_id);
    byType.set(event.event_type, row);
  }
  const all = inRange.length || 1;
  return [...byType.entries()]
    .map(([event, row]) => ({
      event,
      users: row.users.size,
      total: row.total,
      percent: Math.round((row.total / all) * 1000) / 10,
    }))
    .sort((a, b) => b.total - a.total);
}

export function marketplaceActivity(facts: AnalyticsCanonicalFacts, start: Date, end: Date) {
  const req = facts.requests.filter((r) => inWindow(r.created_at, start, end));
  const accepted = facts.requests.filter(
    (r) => r.status === "accepted" && inWindow(r.responded_at ?? r.updated_at, start, end),
  ).length;
  const declined = facts.requests.filter(
    (r) => r.status === "declined" && inWindow(r.responded_at ?? r.updated_at, start, end),
  ).length;
  const cancelled = facts.requests.filter(
    (r) => r.status === "cancelled" && inWindow(r.updated_at, start, end),
  ).length;
  return {
    requestsSent: req.length,
    requestsAccepted: accepted,
    requestsDeclined: declined,
    requestsCancelled: cancelled,
    conversationsOpened: facts.conversations.filter((c) => inWindow(c.created_at, start, end)).length,
    messagesSent: facts.messages.filter((m) => inWindow(m.created_at, start, end)).length,
    bookingsCreated: facts.bookings.filter((b) => inWindow(b.created_at, start, end)).length,
    bookingsActive: facts.bookings.filter((b) => b.status === "upcoming" || b.status === "active").length,
    bookingsCompleted: facts.bookings.filter((b) => inWindow(b.completed_at, start, end)).length,
    bookingsCancelled: facts.bookings.filter(
      (b) => b.status === "cancelled" && inWindow(b.cancelled_at ?? b.created_at, start, end),
    ).length,
    matchesViewed: facts.matches.filter((m) => inWindow(m.viewed_at, start, end)).length,
    matchesClicked: facts.matches.filter((m) => inWindow(m.clicked_at, start, end)).length,
    matchesDismissed: facts.matches.filter((m) => m.status === "dismissed" && inWindow(m.created_at, start, end)).length,
  };
}

export type FunnelStepCount = { step: string; count: number };

export function funnelConversions(steps: FunnelStepCount[]) {
  const signup = steps[0]?.count || 1;
  const rows = steps.map((step, i) => {
    const prev = i === 0 ? step.count : steps[i - 1]?.count ?? 0;
    const fromPrev = i === 0 ? 100 : prev === 0 ? 0 : Math.round((step.count / prev) * 1000) / 10;
    const fromSignup = Math.round((step.count / signup) * 1000) / 10;
    return { ...step, fromPrev, fromSignup };
  });
  let dropIndex = 1;
  let worst = 101;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].fromPrev < worst) {
      worst = rows[i].fromPrev;
      dropIndex = i;
    }
  }
  return {
    rows,
    largestDropoff:
      rows.length > 1
        ? {
            from: rows[dropIndex - 1].step,
            to: rows[dropIndex].step,
            conversion: rows[dropIndex].fromPrev,
          }
        : null,
  };
}

export function retentionFromActivity(events: AnalyticsActivityEvent[], start: Date, end: Date) {
  const pageOrBehavior = events.filter((e) => inWindow(e.created_at, start, end) && e.user_id);
  if (pageOrBehavior.length === 0) {
    return {
      available: false as const,
      reason:
        "Retention needs user_activity_events after tracking is deployed. Canonical history is not used here.",
    };
  }
  const daysByUser = new Map<string, Set<string>>();
  for (const event of pageOrBehavior) {
    const set = daysByUser.get(event.user_id!) ?? new Set<string>();
    set.add(event.created_at.slice(0, 10));
    daysByUser.set(event.user_id!, set);
  }
  let once = 0;
  let twoThree = 0;
  let fourSeven = 0;
  let multi = 0;
  for (const set of daysByUser.values()) {
    const n = set.size;
    if (n === 1) once += 1;
    else multi += 1;
    if (n >= 2 && n <= 3) twoThree += 1;
    if (n >= 4) fourSeven += 1;
  }
  return {
    available: true as const,
    users: daysByUser.size,
    activeOnlyOnce: once,
    activeMultipleDays: multi,
    buckets: { one: once, twoToThree: twoThree, fourToSeven: fourSeven },
  };
}

export function activityHasReferrerOrDevice(events: AnalyticsActivityEvent[]): boolean {
  return false;
  void events;
}

export type LeaderboardRow = {
  userId: string;
  pagesViewed: number;
  listingsViewed: number;
  requests: number;
  messages: number;
  bookings: number;
  matchInteractions: number;
  total: number;
  lastActive: string | null;
};

export function userLeaderboard(facts: AnalyticsCanonicalFacts, start: Date, end: Date): LeaderboardRow[] {
  const map = new Map<string, LeaderboardRow>();
  const row = (id: string): LeaderboardRow => {
    const existing = map.get(id);
    if (existing) return existing;
    const created: LeaderboardRow = {
      userId: id,
      pagesViewed: 0,
      listingsViewed: 0,
      requests: 0,
      messages: 0,
      bookings: 0,
      matchInteractions: 0,
      total: 0,
      lastActive: null,
    };
    map.set(id, created);
    return created;
  };
  const touch = (id: string | null | undefined, at: string, field?: keyof LeaderboardRow) => {
    if (!id || !inWindow(at, start, end)) return;
    const r = row(id);
    if (field && field !== "userId" && field !== "lastActive" && field !== "total") {
      (r[field] as number) += 1;
      r.total += 1;
    }
    if (!r.lastActive || at > r.lastActive) r.lastActive = at;
  };

  for (const event of facts.activity) {
    if (!inWindow(event.created_at, start, end) || !event.user_id) continue;
    if (event.event_type === "request_sent" || event.event_type === "message_sent") continue;
    if (event.event_type === "booking_created" || event.event_type === "booking_completed") continue;
    if (event.event_type === PAGE_VIEW) touch(event.user_id, event.created_at, "pagesViewed");
    else if (event.event_type === "profile_viewed" || event.event_type === "pet_viewed") {
      touch(event.user_id, event.created_at, "listingsViewed");
    } else if (event.event_type.startsWith("match_")) {
      touch(event.user_id, event.created_at, "matchInteractions");
    } else {
      touch(event.user_id, event.created_at);
      const r = row(event.user_id);
      r.total += 1;
    }
  }
  for (const req of facts.requests) touch(req.sender_id, req.created_at, "requests");
  for (const msg of facts.messages) touch(msg.sender_id, msg.created_at, "messages");
  for (const booking of facts.bookings) {
    touch(booking.pet_parent_id, booking.created_at, "bookings");
    touch(booking.pet_friend_id, booking.created_at, "bookings");
  }

  return [...map.values()].sort((a, b) => b.total - a.total || (b.lastActive ?? "").localeCompare(a.lastActive ?? "")).slice(0, 25);
}

export type RecentFeedItem = {
  at: string;
  userId: string | null;
  label: string;
};

export function recentActivityFeed(
  facts: AnalyticsCanonicalFacts,
  names: Map<string, string>,
  pets: Map<string, string>,
  limit = 50,
): RecentFeedItem[] {
  const items: RecentFeedItem[] = [];
  const name = (id: string | null | undefined) => (id ? names.get(id) ?? "Member" : "Member");

  for (const event of facts.activity) {
    if (event.event_type === PAGE_VIEW) {
      items.push({
        at: event.created_at,
        userId: event.user_id,
        label: `${name(event.user_id)} viewed ${event.page_path ?? "a page"}`,
      });
    } else if (event.event_type === "pet_viewed") {
      items.push({
        at: event.created_at,
        userId: event.user_id,
        label: `${name(event.user_id)} viewed a pet profile`,
      });
    } else if (event.event_type === "profile_viewed") {
      items.push({
        at: event.created_at,
        userId: event.user_id,
        label: `${name(event.user_id)} viewed a member profile`,
      });
    } else if (event.event_type === "match_viewed" || event.event_type === "match_clicked") {
      items.push({
        at: event.created_at,
        userId: event.user_id,
        label: `${name(event.user_id)} ${event.event_type === "match_clicked" ? "clicked" : "viewed"} a match`,
      });
    }
  }
  for (const req of facts.requests) {
    items.push({
      at: req.created_at,
      userId: req.sender_id ?? null,
      label: `${name(req.sender_id)} sent a care request${pets.get(req.pet_id) ? ` for ${pets.get(req.pet_id)}` : ""}`,
    });
  }
  for (const msg of facts.messages) {
    items.push({
      at: msg.created_at,
      userId: msg.sender_id,
      label: `${name(msg.sender_id)} sent a message`,
    });
  }
  for (const booking of facts.bookings) {
    items.push({
      at: booking.created_at,
      userId: booking.pet_parent_id,
      label: `Booking created between ${name(booking.pet_parent_id)} and ${name(booking.pet_friend_id)}`,
    });
    if (booking.completed_at) {
      items.push({
        at: booking.completed_at,
        userId: booking.pet_parent_id,
        label: `Booking completed between ${name(booking.pet_parent_id)} and ${name(booking.pet_friend_id)}`,
      });
    }
  }

  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

export function dauStats(facts: AnalyticsCanonicalFacts, window: AnalyticsWindow) {
  const series = dailySeries(facts, { ...window, grain: "day" }, "active_users");
  const avg7 = series.length ? Math.round((series.slice(-7).reduce((s, r) => s + r.value, 0) / Math.min(7, series.length)) * 10) / 10 : 0;
  const days30 = uniqueActiveUsers(
    facts,
    new Date(window.end.getTime() - 30 * 24 * 60 * 60 * 1000),
    window.end,
  ).size;
  return {
    daily: uniqueActiveUsers(facts, window.start, window.end).size,
    avg7,
    active30d: window.range === "90d" || window.range === "30d" ? days30 : null,
  };
}

export function payloadHasSensitiveFields(payload: unknown): boolean {
  const text = JSON.stringify(payload);
  return ["\"body\"", "\"message\"", "access_token", "service_role", "password", "recovery_token"].some((key) =>
    text.includes(key),
  );
}
