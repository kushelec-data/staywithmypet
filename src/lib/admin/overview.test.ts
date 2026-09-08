import { describe, expect, it, vi } from "vitest";
import type { AdminMembershipLite } from "@/lib/admin/aggregates";
import {
  classifyMembershipChannel,
  compactSignupFunnel,
  kpiWithChange,
  maskAccessCode,
  marketplacePairFunnel,
  overviewActivityFeed,
  overviewPayloadIsUnsafe,
  paidRevenueEuros,
  parseOverviewRange,
  recentAccessCodeMembers,
  recentPaidMembers,
  sumPaidRevenue,
} from "@/lib/admin/overview";
import type { AdminUserRow } from "@/lib/admin/aggregates";

function membership(overrides: Partial<AdminMembershipLite> = {}): AdminMembershipLite {
  return {
    user_id: "u1",
    role: "pet_parent",
    status: "active",
    plan_id: "one-time-owner",
    end_date: "2026-12-01T00:00:00.000Z",
    start_date: "2026-09-06T10:00:00.000Z",
    source: "stripe_checkout",
    stripe_checkout_session_id: "cs_test_1",
    stripe_subscription_id: null,
    ...overrides,
  };
}

describe("admin overview membership classification", () => {
  it("classifies stripe source and ids as paid, access-code source as access_code", () => {
    expect(classifyMembershipChannel(membership())).toBe("paid");
    expect(classifyMembershipChannel(membership({ source: "stripe_subscription", stripe_checkout_session_id: null, stripe_subscription_id: "sub_1" }))).toBe("paid");
    expect(
      classifyMembershipChannel(
        membership({ source: "platform_access_code", stripe_checkout_session_id: null, stripe_subscription_id: null }),
      ),
    ).toBe("access_code");
    expect(
      classifyMembershipChannel(membership({ source: "test_code", stripe_checkout_session_id: null })),
    ).toBe("access_code");
    expect(
      classifyMembershipChannel(
        membership({ source: "manual", stripe_checkout_session_id: null, stripe_subscription_id: null }),
      ),
    ).toBe("manual");
  });

  it("does not invent access-code attribution when source and stripe ids are missing", () => {
    expect(
      classifyMembershipChannel(
        membership({ source: null, stripe_checkout_session_id: null, stripe_subscription_id: null }),
      ),
    ).toBe("unknown");
  });

  it("lists recent paid members without card or stripe customer fields", () => {
    const rows = recentPaidMembers(
      [
        membership({ user_id: "p1", start_date: "2026-09-07T00:00:00.000Z" }),
        membership({
          user_id: "a1",
          source: "platform_access_code",
          stripe_checkout_session_id: null,
          start_date: "2026-09-08T00:00:00.000Z",
        }),
      ],
      new Map([["p1", "Gerly"]]),
      new Map([["p1", "gerly@example.com"]]),
      5,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Gerly");
    expect(rows[0].paymentType).toBe("Paid / Stripe");
    expect(rows[0].amount).toBe("€18");
    expect(JSON.stringify(rows)).not.toMatch(/card|cvc|stripe_customer/i);
  });

  it("lists access-code members and does not invent a code when redemption is missing", () => {
    const rows = recentAccessCodeMembers(
      [
        membership({
          user_id: "k1",
          role: "pet_friend",
          source: "platform_access_code",
          stripe_checkout_session_id: null,
          plan_id: "3-month-friend",
        }),
      ],
      [],
      new Map([["k1", "Kush"]]),
      new Map([["k1", "kush@example.com"]]),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].accessCodeDisplay).toBe("Access code");
    expect(rows[0].paymentType).toBe("Access code");
  });

  it("masks stored access codes", () => {
    expect(maskAccessCode("WELCOME123")).toBe("WELCOME***");
    expect(maskAccessCode("STAYTEST3M")).toBe("STAYTES***");
    const rows = recentAccessCodeMembers(
      [membership({ user_id: "k1", role: "pet_friend", source: "platform_access_code", stripe_checkout_session_id: null })],
      [{ user_id: "k1", membership_role: "pet_friend", plan_id: "3-month-friend", redeemed_at: "2026-09-06T00:00:00.000Z", code_normalized: "WELCOME123" }],
      new Map([["k1", "Kush"]]),
      new Map([["k1", "kush@example.com"]]),
    );
    expect(rows[0].accessCodeDisplay).toBe("WELCOME***");
    expect(JSON.stringify(rows)).not.toContain("WELCOME123");
  });
});

describe("admin overview revenue and period comparison", () => {
  it("sums catalog prices for paid rows only", () => {
    const paid = membership({ plan_id: "3-month-owner" });
    const free = membership({ source: "platform_access_code", stripe_checkout_session_id: null, plan_id: "3-month-friend" });
    expect(paidRevenueEuros(paid)).toBe(79);
    expect(paidRevenueEuros(free)).toBe(0);
    expect(sumPaidRevenue([paid, free, membership({ plan_id: "unknown-plan" })]).euros).toBe(79);
    expect(sumPaidRevenue([paid, membership({ plan_id: "mystery" })]).unknownPlans).toBe(1);
  });

  it("handles zero previous period as New and 0%", () => {
    expect(kpiWithChange(4, 0).label).toBe("New");
    expect(kpiWithChange(0, 0).label).toBe("0%");
    expect(kpiWithChange(12, 10).label).toBe("+20%");
    expect(kpiWithChange(8, 10).direction).toBe("down");
  });

  it("defaults range to 7 days", () => {
    expect(parseOverviewRange(undefined)).toBe("7d");
    expect(parseOverviewRange("1d")).toBe("1d");
  });
});

describe("admin overview funnel and feed safety", () => {
  it("computes compact funnel drop-off", () => {
    const rows = [
      { roleChosen: true, marketplaceReady: true, requestsSent: 1, requestsReceived: 0, conversations: 1, bookings: 1, completedBookings: 1 },
      { roleChosen: true, marketplaceReady: false, requestsSent: 0, requestsReceived: 0, conversations: 0, bookings: 0, completedBookings: 0 },
      { roleChosen: false, marketplaceReady: false, requestsSent: 0, requestsReceived: 0, conversations: 0, bookings: 0, completedBookings: 0 },
    ].map((partial, i) => ({ id: `u${i}`, ...partial }) as AdminUserRow);
    const funnel = compactSignupFunnel(rows, []);
    expect(funnel.rows[0].count).toBe(3);
    expect(funnel.rows[1].count).toBe(2);
    expect(funnel.largestDropoff).not.toBeNull();
  });

  it("uses pair counts so message volume is not a conversion denominator", () => {
    const result = marketplacePairFunnel({
      requests: [
        {
          id: "r1",
          pet_id: "pet-1",
          pet_parent_id: "p1",
          pet_friend_id: "f1",
          status: "accepted",
          created_at: "2026-09-06T00:00:00.000Z",
          updated_at: "2026-09-06T00:00:00.000Z",
        },
      ],
      conversations: [{ id: "c1", request_id: "r1", created_at: "2026-09-06T01:00:00.000Z" }],
      messages: [
        { id: "m1", conversation_id: "c1", sender_id: "f1", created_at: "2026-09-06T02:00:00.000Z" },
        { id: "m2", conversation_id: "c1", sender_id: "p1", created_at: "2026-09-06T03:00:00.000Z" },
      ],
      bookings: [
        {
          id: "b1",
          request_id: "r1",
          pet_id: "pet-1",
          pet_parent_id: "p1",
          pet_friend_id: "f1",
          status: "completed",
          created_at: "2026-09-06T04:00:00.000Z",
          start_date: null,
          end_date: null,
          completed_at: "2026-09-07T00:00:00.000Z",
        },
      ],
    });
    expect(result.rawMessages).toBe(2);
    expect(result.rows.find((r) => r.step === "Pairs with messages")?.count).toBe(1);
    expect(result.rows.find((r) => r.step === "Completed booking pairs")?.count).toBe(1);
  });

  it("never includes message bodies in the activity feed", () => {
    const feed = overviewActivityFeed({
      profiles: [
        {
          id: "f1",
          display_name: "Aryeri",
          role: "pet_friend",
          active_mode: "pet_friend",
          role_chosen_at: "2026-01-01T00:00:00.000Z",
          is_public: true,
          created_at: "2026-09-08T09:00:00.000Z",
          avatar_url: null,
          bio: null,
          location: null,
          public_location: null,
          city: null,
          country: null,
          google_place_id: null,
          latitude: null,
          longitude: null,
          phone: null,
          phone_e164: null,
          languages: [],
          details: null,
        },
      ],
      authUsers: [{ id: "f1", email: "a@example.com", emailConfirmed: true, lastSignInAt: null, createdAt: "2026-09-08T09:00:00.000Z" }],
      pets: [{ id: "pet-1", owner_id: "p1", name: "Bulma" }],
      requests: [
        {
          id: "r1",
          pet_id: "pet-1",
          pet_parent_id: "p1",
          pet_friend_id: "f1",
          sender_id: "f1",
          receiver_id: "p1",
          status: "pending",
          created_at: "2026-09-08T11:42:00.000Z",
          updated_at: "2026-09-08T11:42:00.000Z",
        },
      ],
      messages: [{ id: "m1", conversation_id: "c1", sender_id: "f1", created_at: "2026-09-08T09:12:00.000Z" }],
      bookings: [],
      memberships: [],
      redemptions: [],
    });
    expect(feed.some((item) => item.label.includes("Aryeri sent a request"))).toBe(true);
    expect(JSON.stringify(feed)).not.toMatch(/"body"/);
    expect(overviewPayloadIsUnsafe(feed)).toBe(false);
  });
});

vi.mock("@/lib/admin/auth", () => ({
  getAdminSession: vi.fn(),
}));

vi.mock("@/lib/admin/overview-load", () => ({
  overviewQueryFromSearch: vi.fn((sp: { range?: string; metric?: string }) => ({
    range: sp.range === "1d" ? "1d" : "7d",
    metric: "active_users",
  })),
  buildOverviewDashboardDto: vi.fn(async () => ({
    range: "7d",
    metric: "active_users",
    generatedAt: "2026-09-08T10:00:00.000Z",
    refreshedLabel: "Updated just now",
    window: { start: "", end: "", grain: "day" },
    kpis: {},
    series: [],
    previousSeries: [],
    membership: { paidMemberships: 1, accessCodeMemberships: 1, revenueLabel: "€18", revenueNote: "catalog" },
    acquisition: [],
    recentPaid: [{ name: "Gerly", email: "g@example.com", paymentType: "Paid / Stripe", amount: "€18" }],
    recentAccessCode: [{ name: "Kush", accessCodeDisplay: "STAYTES***" }],
    funnel: { rows: [], largestDropoff: null },
    pairFunnel: { rows: [], rawMessages: 0 },
    health: {},
    attention: [],
    availability: { friends: {}, pets: {} },
    matchmaking: { hasProductionRun: false },
    activity: [{ at: "2026-09-08T09:12:00.000Z", label: "Aryeri sent a message" }],
  })),
}));

describe("admin overview API authorization", () => {
  it("returns 401 for anonymous access", async () => {
    const { getAdminSession } = await import("@/lib/admin/auth");
    vi.mocked(getAdminSession).mockResolvedValue({ ok: false, status: 401 });
    const { GET } = await import("@/app/api/admin/overview/route");
    const res = await GET(new Request("https://example.com/api/admin/overview"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for a normal authenticated user", async () => {
    const { getAdminSession } = await import("@/lib/admin/auth");
    vi.mocked(getAdminSession).mockResolvedValue({ ok: false, status: 403 });
    const { GET } = await import("@/app/api/admin/overview/route");
    const res = await GET(new Request("https://example.com/api/admin/overview"));
    expect(res.status).toBe(403);
  });

  it("allows an approved admin and omits message bodies and payment secrets", async () => {
    const { getAdminSession } = await import("@/lib/admin/auth");
    vi.mocked(getAdminSession).mockResolvedValue({ ok: true, userId: "admin-1" });
    const { GET } = await import("@/app/api/admin/overview/route");
    const res = await GET(new Request("https://example.com/api/admin/overview"));
    expect(res.status).toBe(200);
    const json = await res.json();
    const text = JSON.stringify(json);
    expect(text).not.toMatch(/"body"/);
    expect(text).not.toMatch(/card_number|sk_live|password/);
    expect(json.activity[0].label).not.toMatch(/password|token/i);
  });
});
