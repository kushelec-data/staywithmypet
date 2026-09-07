import { describe, expect, it, vi } from "vitest";
import {
  dailySeries,
  funnelConversions,
  kpiTotals,
  parseAnalyticsRange,
  payloadHasSensitiveFields,
  periodChange,
  resolveAnalyticsWindow,
  retentionFromActivity,
  topPages,
  uniqueActiveUsers,
  userLeaderboard,
  type AnalyticsCanonicalFacts,
} from "@/lib/admin/analytics";

const now = new Date("2026-09-07T12:00:00.000Z");

function facts(overrides: Partial<AnalyticsCanonicalFacts> = {}): AnalyticsCanonicalFacts {
  return {
    signups: [{ id: "u1", created_at: "2026-09-06T10:00:00.000Z" }],
    requests: [
      {
        id: "r1",
        sender_id: "u1",
        pet_parent_id: "p1",
        pet_friend_id: "u1",
        pet_id: "pet-1",
        status: "pending",
        created_at: "2026-09-06T11:00:00.000Z",
      },
    ],
    messages: [{ id: "m1", sender_id: "u1", conversation_id: "c1", created_at: "2026-09-06T12:00:00.000Z" }],
    bookings: [
      {
        id: "b1",
        pet_parent_id: "p1",
        pet_friend_id: "u1",
        status: "completed",
        created_at: "2026-09-06T13:00:00.000Z",
        completed_at: "2026-09-07T09:00:00.000Z",
      },
    ],
    conversations: [{ id: "c1", request_id: "r1", created_at: "2026-09-06T11:30:00.000Z" }],
    pets: [{ id: "pet-1", owner_id: "p1", name: "Bulma", created_at: "2026-09-01T00:00:00.000Z" }],
    matches: [
      {
        id: "ms1",
        pet_parent_id: "p1",
        pet_friend_id: "u1",
        pet_id: "pet-1",
        status: "viewed",
        created_at: "2026-09-05T00:00:00.000Z",
        viewed_at: "2026-09-06T14:00:00.000Z",
        clicked_at: null,
      },
    ],
    activity: [
      {
        user_id: "u1",
        event_type: "page_view",
        page_path: "/find-care",
        created_at: "2026-09-06T15:00:00.000Z",
      },
      {
        user_id: "u1",
        event_type: "request_sent",
        page_path: null,
        created_at: "2026-09-06T11:00:01.000Z",
      },
    ],
    ...overrides,
  };
}

describe("analytics windows and change", () => {
  it("defaults range to last 7 days", () => {
    expect(parseAnalyticsRange(null)).toBe("7d");
    expect(parseAnalyticsRange("nope")).toBe("7d");
  });

  it("groups last 7 days by day", () => {
    const window = resolveAnalyticsWindow("7d", now);
    expect(window.grain).toBe("day");
    expect(window.start.toISOString().slice(0, 10)).toBe("2026-09-01");
    const series = dailySeries(facts(), window, "requests");
    expect(series.some((p) => p.bucket === "2026-09-06" && p.value === 1)).toBe(true);
    expect(series.reduce((s, p) => s + p.value, 0)).toBe(1);
  });

  it("groups today by hour", () => {
    const window = resolveAnalyticsWindow("1d", now);
    expect(window.grain).toBe("hour");
    expect(window.start.toISOString()).toBe("2026-09-07T00:00:00.000Z");
  });

  it("computes previous-period percentages and New when previous is zero", () => {
    expect(periodChange(12, 10).label).toBe("+20%");
    expect(periodChange(8, 10).label).toBe("-20%");
    expect(periodChange(5, 0).label).toBe("New");
    expect(periodChange(5, 0).direction).toBe("new");
    expect(periodChange(0, 0).label).toBe("0%");
  });
});

describe("analytics aggregation", () => {
  it("does not double-count canonical requests when activity also has request_sent", () => {
    const window = resolveAnalyticsWindow("7d", now);
    const totals = kpiTotals(facts(), window.start, window.end);
    expect(totals.requestsSent).toBe(1);
    expect(totals.messagesSent).toBe(1);
    expect(totals.pageViews).toBe(1);
    const board = userLeaderboard(facts(), window.start, window.end);
    expect(board[0].requests).toBe(1);
  });

  it("does not invent page views when tracking is empty", () => {
    const window = resolveAnalyticsWindow("7d", now);
    const empty = facts({ activity: [] });
    expect(kpiTotals(empty, window.start, window.end).pageViews).toBe(0);
    expect(topPages([], window.start, window.end)).toEqual([]);
    const retention = retentionFromActivity([], window.start, window.end);
    expect(retention.available).toBe(false);
  });

  it("counts unique active users once per period", () => {
    const window = resolveAnalyticsWindow("7d", now);
    expect(uniqueActiveUsers(facts(), window.start, window.end).size).toBeGreaterThanOrEqual(1);
  });

  it("computes funnel drop-off from previous stage", () => {
    const result = funnelConversions([
      { step: "Signed up", count: 100 },
      { step: "Role chosen", count: 80 },
      { step: "Profile complete", count: 30 },
      { step: "Request", count: 20 },
    ]);
    expect(result.largestDropoff).toEqual({
      from: "Role chosen",
      to: "Profile complete",
      conversion: 37.5,
    });
    expect(result.rows[2].fromSignup).toBe(30);
  });

  it("never includes message bodies in analytics payloads", () => {
    const window = resolveAnalyticsWindow("7d", now);
    const totals = kpiTotals(facts(), window.start, window.end);
    expect(payloadHasSensitiveFields(totals)).toBe(false);
    expect(JSON.stringify(facts().messages)).not.toMatch(/"body"/);
  });
});

vi.mock("@/lib/admin/auth", () => ({
  getAdminSession: vi.fn(),
}));

vi.mock("@/lib/admin/analytics-load", () => ({
  analyticsQueryFromSearch: vi.fn((sp: { range?: string; metric?: string }) => ({
    range: sp.range === "1d" ? "1d" : "7d",
    metric: "active_users",
  })),
  buildAnalyticsDashboardDto: vi.fn(async () => ({
    range: "7d",
    metric: "active_users",
    window: { start: "", end: "", grain: "day" },
    kpis: {
      uniqueActiveUsers: { current: 1, previous: 0, label: "New", direction: "new" },
      pageViews: { current: 0, previous: 0, label: "0%", direction: "flat" },
      newSignups: { current: 0, previous: 0, label: "0%", direction: "flat" },
      requestsSent: { current: 0, previous: 0, label: "0%", direction: "flat" },
      messagesSent: { current: 0, previous: 0, label: "0%", direction: "flat" },
      bookingsCreated: { current: 0, previous: 0, label: "0%", direction: "flat" },
      completedBookings: { current: 0, previous: 0, label: "0%", direction: "flat" },
      matchInteractions: { current: 0, previous: 0, label: "0%", direction: "flat" },
    },
    series: [],
    daily: [],
    topPages: [],
    pageViewsAvailable: false,
    marketplace: {},
    dau: { daily: 1, avg7: 1, active30d: null },
    leaderboard: [],
    relationships: [],
    funnel: { rows: [], largestDropoff: null },
    retention: { available: false, reason: "none" },
    deviceNote: "Device/referrer analytics not currently recorded.",
    utmNote: "none",
    today: { uniqueActiveUsers: 0, requestsSent: 0, messagesSent: 0, bookingsCreated: 0, newSignups: 0, lastAction: null },
    topEvents: [],
    recent: [{ at: "2026-09-06T12:00:00.000Z", userId: "u1", label: "Member sent a message" }],
  })),
}));

describe("admin analytics API authorization", () => {
  it("returns 401 for anonymous access", async () => {
    const { getAdminSession } = await import("@/lib/admin/auth");
    vi.mocked(getAdminSession).mockResolvedValue({ ok: false, status: 401 });
    const { GET } = await import("@/app/api/admin/analytics/route");
    const res = await GET(new Request("https://example.com/api/admin/analytics"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for a normal authenticated user", async () => {
    const { getAdminSession } = await import("@/lib/admin/auth");
    vi.mocked(getAdminSession).mockResolvedValue({ ok: false, status: 403 });
    const { GET } = await import("@/app/api/admin/analytics/route");
    const res = await GET(new Request("https://example.com/api/admin/analytics"));
    expect(res.status).toBe(403);
  });

  it("allows an approved admin and omits message bodies", async () => {
    const { getAdminSession } = await import("@/lib/admin/auth");
    vi.mocked(getAdminSession).mockResolvedValue({ ok: true, userId: "admin-1" });
    const { GET } = await import("@/app/api/admin/analytics/route");
    const res = await GET(new Request("https://example.com/api/admin/analytics?view=recent-activity"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(JSON.stringify(json)).not.toMatch(/"body"/);
    expect(json.recent[0].label).not.toMatch(/password|token/i);
  });
});
