import { describe, expect, it, vi } from "vitest";
import type { AdminBookingLite } from "@/lib/admin/aggregates";
import {
  bookingConversion,
  bookingDurationDays,
  bookingKpiCounts,
  bookingsPayloadIsUnsafe,
  completionRate,
  durationStats,
  filterBookingRows,
  kpiChangeOrAllTime,
  parseBookingsRange,
  periodPointChange,
  resolveBookingsWindow,
  statusBreakdown,
  topFriends,
  topParents,
  topPets,
} from "@/lib/admin/bookings-analytics";

const now = new Date("2026-09-08T12:00:00.000Z");

function booking(overrides: Partial<AdminBookingLite> = {}): AdminBookingLite {
  return {
    id: "b1",
    request_id: "r1",
    pet_id: "pet-1",
    pet_parent_id: "p1",
    pet_friend_id: "f1",
    status: "upcoming",
    created_at: "2026-09-06T10:00:00.000Z",
    start_date: "2026-09-10",
    end_date: "2026-09-12",
    completed_at: null,
    cancelled_at: null,
    ...overrides,
  };
}

describe("bookings analytics windows", () => {
  it("defaults range to 30 days", () => {
    expect(parseBookingsRange(undefined)).toBe("30d");
    expect(parseBookingsRange("nope")).toBe("30d");
  });

  it("filters created_at into the selected window", () => {
    const window = resolveBookingsWindow("7d", now);
    const rows = [
      booking({ id: "in", created_at: "2026-09-06T10:00:00.000Z" }),
      booking({ id: "out", created_at: "2026-08-01T10:00:00.000Z" }),
    ];
    const counts = bookingKpiCounts(rows, window.start, window.end);
    expect(counts.created).toBe(1);
  });

  it("does not compare percentages for all time", () => {
    expect(kpiChangeOrAllTime(8, 3, false).label).toBe("All time");
    expect(kpiChangeOrAllTime(5, 0, true).label).toBe("New");
  });
});

describe("status, completion, conversion", () => {
  it("breaks down stored status without deriving from dates", () => {
    const rows = [
      booking({ id: "1", status: "upcoming" }),
      booking({ id: "2", status: "completed", completed_at: "2026-09-07T00:00:00.000Z" }),
      booking({ id: "3", status: "cancelled", cancelled_at: "2026-09-07T00:00:00.000Z" }),
      booking({ id: "4", status: "upcoming" }),
    ];
    const breakdown = statusBreakdown(rows);
    expect(breakdown.rows.find((r) => r.status === "upcoming")?.count).toBe(2);
    expect(breakdown.rows.find((r) => r.status === "completed")?.percent).toBe(25);
  });

  it("computes completion rate and percentage-point change", () => {
    expect(completionRate(1, 8)).toBe(12.5);
    expect(completionRate(0, 0)).toBe(0);
    expect(periodPointChange(12.5, 16.6, true).label).toBe("-4.1 pp");
    expect(periodPointChange(12.5, 0, true).label).toBe("New");
  });

  it("converts unique parent/friend/pet triples, not message volume", () => {
    const result = bookingConversion({
      start: new Date("2026-09-01T00:00:00.000Z"),
      end: new Date("2026-09-08T12:00:00.000Z"),
      requests: [
        {
          id: "r1",
          pet_id: "pet-1",
          pet_parent_id: "p1",
          pet_friend_id: "f1",
          status: "accepted",
          created_at: "2026-09-05T00:00:00.000Z",
        },
        {
          id: "r2",
          pet_id: "pet-1",
          pet_parent_id: "p1",
          pet_friend_id: "f1",
          status: "pending",
          created_at: "2026-09-05T01:00:00.000Z",
        },
      ],
      bookings: [booking({ created_at: "2026-09-06T00:00:00.000Z", status: "completed" })],
    });
    expect(result.requests).toBe(1);
    expect(result.accepted).toBe(1);
    expect(result.bookings).toBe(1);
    expect(result.requestToBooking).toBe(100);
    expect(result.bookingToCompleted).toBe(100);
  });
});

describe("duration and ranking", () => {
  it("does not guess duration when dates are missing", () => {
    expect(bookingDurationDays(null, "2026-09-12")).toBeNull();
    expect(bookingDurationDays("2026-09-10", "2026-09-12")).toBe(2);
    expect(bookingDurationDays("2026-09-10", "2026-09-10")).toBe(0);
    const stats = durationStats([
      booking({ start_date: "2026-09-10", end_date: "2026-09-10" }),
      booking({ id: "x", start_date: null, end_date: null }),
    ]);
    expect(stats.sampleSize).toBe(1);
    expect(stats.buckets.same_day).toBe(1);
  });

  it("ranks top parents, friends, and pets", () => {
    const rows = [
      booking({ id: "a", pet_parent_id: "p1", pet_friend_id: "f1", pet_id: "pet-1" }),
      booking({ id: "b", pet_parent_id: "p1", pet_friend_id: "f2", pet_id: "pet-1", status: "completed" }),
      booking({ id: "c", pet_parent_id: "p2", pet_friend_id: "f1", pet_id: "pet-2" }),
    ];
    expect(topParents(rows)[0]?.id).toBe("p1");
    expect(topParents(rows)[0]?.bookings).toBe(2);
    expect(topFriends(rows)[0]?.id).toBe("f1");
    expect(topPets(rows)[0]?.id).toBe("pet-1");
    expect(topPets(rows)[0]?.completed).toBe(1);
  });

  it("filters table by name/email/pet without inventing dates", () => {
    const rows = filterBookingRows(
      [booking(), booking({ id: "b2", pet_id: "pet-2", created_at: "2026-08-01T00:00:00.000Z" })],
      { q: "denny", createdFrom: "2026-09-01" },
      new Map([["p1", "Gerly"], ["f1", "Kush"]]),
      new Map([["p1", "gerly@example.com"]]),
      new Map([["pet-1", "Denny"], ["pet-2", "Bulma"]]),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("b1");
  });
});

vi.mock("@/lib/admin/auth", () => ({
  getAdminSession: vi.fn(),
}));

vi.mock("@/lib/admin/bookings-load", () => ({
  bookingsQueryFromSearch: vi.fn(() => ({
    range: "30d",
    metric: "created",
    filters: { page: 1, sort: "created", dir: "desc" },
  })),
  buildBookingsDashboardDto: vi.fn(async () => ({
    kpis: { created: { current: 2 } },
    recent: [{ at: "2026-09-08T10:00:00.000Z", label: "Booking created: Gerly → Kush for Denny" }],
    table: { rows: [{ id: "b1", parent: "Gerly" }] },
  })),
}));

describe("admin bookings analytics API authorization", () => {
  it("returns 401 for anonymous access", async () => {
    const { getAdminSession } = await import("@/lib/admin/auth");
    vi.mocked(getAdminSession).mockResolvedValue({ ok: false, status: 401 });
    const { GET } = await import("@/app/api/admin/bookings-analytics/route");
    const res = await GET(new Request("https://example.com/api/admin/bookings-analytics"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for a normal authenticated user", async () => {
    const { getAdminSession } = await import("@/lib/admin/auth");
    vi.mocked(getAdminSession).mockResolvedValue({ ok: false, status: 403 });
    const { GET } = await import("@/app/api/admin/bookings-analytics/route");
    const res = await GET(new Request("https://example.com/api/admin/bookings-analytics"));
    expect(res.status).toBe(403);
  });

  it("allows an approved admin and omits message bodies", async () => {
    const { getAdminSession } = await import("@/lib/admin/auth");
    vi.mocked(getAdminSession).mockResolvedValue({ ok: true, userId: "admin-1" });
    const { GET } = await import("@/app/api/admin/bookings-analytics/route");
    const res = await GET(new Request("https://example.com/api/admin/bookings-analytics?view=recent-activity"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(bookingsPayloadIsUnsafe(json)).toBe(false);
    expect(JSON.stringify(json)).not.toMatch(/"body"/);
  });
});
