import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  buildAdminUserRows,
  buildRelationshipRows,
  filterAdminUserRows,
  matchAttribution,
  overviewFromUserRows,
  type AdminAuthUser,
  type AdminBookingLite,
  type AdminConversationLite,
  type AdminMatchLite,
  type AdminMessageLite,
  type AdminPetLite,
  type AdminProfileLite,
  type AdminRequestLite,
} from "@/lib/admin/aggregates";
import { countMessagesByConversation, deriveAdminFunnelStage, matchConversionRates } from "@/lib/admin/metrics";
import { shouldRecordPageView, trackActivity } from "@/lib/activity/track";

const parent: AdminProfileLite = {
  id: "parent-1",
  display_name: "Parent",
  role: "pet_parent",
  active_mode: "pet_parent",
  role_chosen_at: "2026-01-01T00:00:00.000Z",
  is_public: true,
  created_at: "2026-01-01T00:00:00.000Z",
  avatar_url: "https://example.com/a.png",
  bio: "word ".repeat(50),
  location: "Tallinn",
  public_location: "Tallinn",
  city: "Tallinn",
  country: "Estonia",
  google_place_id: "place",
  latitude: 59,
  longitude: 24,
  phone: "+372",
  phone_e164: "+372555",
  languages: ["en"],
  details: {} as AdminProfileLite["details"],
};

const friend: AdminProfileLite = {
  ...parent,
  id: "friend-1",
  display_name: "Friend",
  role: "pet_friend",
  active_mode: "pet_friend",
};

const auth: AdminAuthUser[] = [
  { id: "parent-1", email: "parent@example.com", emailConfirmed: true, lastSignInAt: "2026-09-01T00:00:00.000Z", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "friend-1", email: "friend@example.com", emailConfirmed: true, lastSignInAt: "2026-09-02T00:00:00.000Z", createdAt: "2026-01-02T00:00:00.000Z" },
];

const pets: AdminPetLite[] = [{ id: "pet-1", owner_id: "parent-1", name: "Bulma" }];
const requests: AdminRequestLite[] = [
  {
    id: "req-1",
    pet_id: "pet-1",
    pet_parent_id: "parent-1",
    pet_friend_id: "friend-1",
    sender_id: "friend-1",
    receiver_id: "parent-1",
    status: "accepted",
    created_at: "2026-09-06T15:32:00.000Z",
    updated_at: "2026-09-07T06:20:00.000Z",
  },
];
const conversations: AdminConversationLite[] = [{ id: "conv-1", request_id: "req-1", created_at: "2026-09-06T15:40:00.000Z" }];
const messages: AdminMessageLite[] = [
  { id: "m1", conversation_id: "conv-1", sender_id: "friend-1", created_at: "2026-09-06T15:42:00.000Z" },
  { id: "m2", conversation_id: "conv-1", sender_id: "parent-1", created_at: "2026-09-06T15:43:00.000Z" },
];
const bookings: AdminBookingLite[] = [
  {
    id: "b1",
    request_id: "req-1",
    pet_id: "pet-1",
    pet_parent_id: "parent-1",
    pet_friend_id: "friend-1",
    status: "completed",
    created_at: "2026-09-08T10:10:00.000Z",
    start_date: "2026-09-08",
    end_date: "2026-09-10",
    completed_at: "2026-09-10T00:00:00.000Z",
  },
];
const matches: AdminMatchLite[] = [
  {
    id: "ms-1",
    pet_parent_id: "parent-1",
    pet_friend_id: "friend-1",
    pet_id: "pet-1",
    score: 80,
    reasons: ["Nearby"],
    status: "viewed",
    created_at: "2026-09-01T00:00:00.000Z",
    viewed_at: "2026-09-01T01:00:00.000Z",
    clicked_at: "2026-09-01T02:00:00.000Z",
    emailed_at: "2026-09-01T00:30:00.000Z",
  },
];

describe("admin funnel and aggregates", () => {
  it("derives completed booking as the last funnel stage", () => {
    expect(
      deriveAdminFunnelStage({
        emailConfirmed: true,
        roleChosen: true,
        profileComplete: true,
        wantsPets: true,
        petCount: 1,
        requestsSent: 1,
        requestsReceived: 0,
        pendingSent: false,
        messagesSent: 1,
        bookings: 1,
        completedBookings: 1,
      }),
    ).toBe("Completed booking");
  });

  it("aggregates user request, message, and booking counts", () => {
    const rows = buildAdminUserRows({
      profiles: [parent, friend],
      authUsers: auth,
      pets,
      requests,
      bookings,
      conversations,
      messages,
      matches,
      memberships: [{ user_id: "parent-1", role: "pet_parent", status: "active", plan_id: "3-month-owner", end_date: null }],
    });
    const friendRow = rows.find((r) => r.id === "friend-1")!;
    const parentRow = rows.find((r) => r.id === "parent-1")!;
    expect(friendRow.requestsSent).toBe(1);
    expect(parentRow.requestsReceived).toBe(1);
    expect(friendRow.messagesSent).toBe(1);
    expect(parentRow.bookings).toBe(1);
    expect(parentRow.completedBookings).toBe(1);
    expect(parentRow.membershipStatus).toContain("active");
  });

  it("filters users by name/email search", () => {
    const rows = buildAdminUserRows({
      profiles: [parent, friend],
      authUsers: auth,
      pets,
      requests,
      bookings,
      conversations,
      messages,
      matches,
      memberships: [],
    });
    expect(filterAdminUserRows(rows, { q: "parent@" }).map((r) => r.id)).toEqual(["parent-1"]);
  });

  it("counts relationship messages without needing message bodies", () => {
    expect(countMessagesByConversation(messages).get("conv-1")).toBe(2);
    const rel = buildRelationshipRows({
      profiles: [parent, friend],
      pets,
      requests,
      bookings,
      conversations,
      messages,
    });
    expect(rel).toHaveLength(1);
    expect(rel[0].messageCount).toBe(2);
    expect(rel[0].interactionLevel).toBe("Very High");
    expect(JSON.stringify(rel)).not.toMatch(/"body"/);
  });

  it("aggregates bookings and match conversions", () => {
    const rows = buildAdminUserRows({
      profiles: [parent, friend],
      authUsers: auth,
      pets,
      requests,
      bookings,
      conversations,
      messages,
      matches,
      memberships: [],
    });
    const overview = overviewFromUserRows(rows, { requests, messages, conversations, bookings, matches, now: new Date("2026-09-06T00:00:00.000Z") });
    expect(overview.completedBookings).toBe(1);
    const attr = matchAttribution({ matches, requests, bookings });
    expect(attr.summary.withLaterRequest).toBe(1);
    expect(attr.summary.withLaterBooking).toBe(1);
    expect(attr.summary.withLaterCompletedBooking).toBe(1);
    const rates = matchConversionRates({
      generated: 1,
      viewed: 1,
      clicked: 1,
      withLaterRequest: 1,
      withLaterBooking: 1,
      withLaterCompletedBooking: 1,
    });
    expect(rates.requestConversion).toBe(100);
  });
});

describe("activity tracking", () => {
  it("does not duplicate page views on rerender", () => {
    expect(
      shouldRecordPageView({ pathname: "/requests", analyticsConsent: true, alreadyRecorded: true }),
    ).toBe(false);
    expect(
      shouldRecordPageView({ pathname: "/requests", analyticsConsent: true, alreadyRecorded: false }),
    ).toBe(true);
    expect(
      shouldRecordPageView({ pathname: "/requests", analyticsConsent: false, alreadyRecorded: false }),
    ).toBe(false);
  });

  it("swallows activity write failures", async () => {
    const supabase = {
      from: () => ({
        insert: async () => {
          throw new Error("db down");
        },
      }),
    };
    await expect(
      trackActivity(supabase, { userId: "u1", eventType: "message_sent" }),
    ).resolves.toEqual({ ok: false });
  });

  it("does not break a primary action when tracking fails", async () => {
    async function sendFakeMessage() {
      const result = { id: "m1" };
      await trackActivity(
        { from: () => ({ insert: async () => ({ error: { message: "fail" } }) }) },
        { userId: "u1", eventType: "message_sent" },
      );
      return result;
    }
    await expect(sendFakeMessage()).resolves.toEqual({ id: "m1" });
  });
});

describe("admin security sources", () => {
  it("does not let clients grant admin_users rows", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/20260906220000_admin_and_activity.sql"), "utf8");
    expect(sql).toContain("create table if not exists public.admin_users");
    expect(sql).toContain("enable row level security");
    expect(sql).not.toMatch(/policy[\s\S]*admin_users[\s\S]*insert/i);
    expect(sql).not.toMatch(/on public\.admin_users[\s\S]*for insert/i);
  });

  it("never selects message bodies in admin queries", () => {
    const queries = readFileSync(join(process.cwd(), "src/lib/admin/queries.ts"), "utf8");
    expect(queries).toContain('.from("messages").select("id, conversation_id, sender_id, created_at")');
    expect(queries).not.toMatch(/from\("messages"\)\.select\([^)]*body/);
    expect(queries).not.toMatch(/from\("requests"\)[\s\S]*message,/);
  });

  it("middleware and layout require auth for /admin", () => {
    const middleware = readFileSync(join(process.cwd(), "src/middleware.ts"), "utf8");
    expect(middleware).toContain('pathname === "/admin"');
    expect(middleware).toContain('"/admin/:path*"');
    const layout = readFileSync(join(process.cwd(), "src/app/admin/layout.tsx"), "utf8");
    expect(layout).toContain("requireAdminPage");
  });
});

vi.mock("@/lib/admin/auth", () => ({
  getAdminSession: vi.fn(),
}));

vi.mock("@/lib/admin/queries", () => ({
  loadAdminCatalog: vi.fn(async () => ({
    profiles: [],
    authUsers: [],
    pets: [],
    requests: [],
    bookings: [],
    conversations: [],
    messages: [],
    matches: [],
    memberships: [],
    favorites: [],
    notifications: [],
  })),
}));

describe("admin API authorization", () => {
  it("returns 401 for anonymous admin API access", async () => {
    const { getAdminSession } = await import("@/lib/admin/auth");
    vi.mocked(getAdminSession).mockResolvedValue({ ok: false, status: 401 });
    const { GET } = await import("@/app/api/admin/users/route");
    const res = await GET(new Request("https://example.com/api/admin/users"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for a normal authenticated user", async () => {
    const { getAdminSession } = await import("@/lib/admin/auth");
    vi.mocked(getAdminSession).mockResolvedValue({ ok: false, status: 403 });
    const { GET } = await import("@/app/api/admin/users/route");
    const res = await GET(new Request("https://example.com/api/admin/users"));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(JSON.stringify(json)).not.toMatch(/body|access_token|service_role/);
  });

  it("allows an approved admin", async () => {
    const { getAdminSession } = await import("@/lib/admin/auth");
    vi.mocked(getAdminSession).mockResolvedValue({ ok: true, userId: "admin-1" });
    const { GET } = await import("@/app/api/admin/users/route");
    const res = await GET(new Request("https://example.com/api/admin/users"));
    expect(res.status).toBe(200);
  });
});
