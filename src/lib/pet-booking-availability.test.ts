import { describe, expect, it, vi } from "vitest";
import {
  DATES_UNAVAILABLE_CODE,
  expandBookingCareDates,
  expandRequestCareDates,
  findUnavailableSelectedDates,
  PetDatesUnavailableError,
  assertSelectedDatesNotBlocked,
} from "@/lib/pet-booking-availability";

describe("expandRequestCareDates", () => {
  it("preserves non-contiguous requested dates", () => {
    expect(
      expandRequestCareDates({
        requested_dates: ["2026-07-16", "2026-07-18", "2026-07-20"],
        date_from: "2026-07-16",
        date_to: "2026-07-20",
      }),
    ).toEqual(["2026-07-16", "2026-07-18", "2026-07-20"]);
  });

  it("falls back to date_from/date_to when requested_dates is empty", () => {
    expect(
      expandRequestCareDates({
        requested_dates: [],
        date_from: "2026-07-16",
        date_to: "2026-07-17",
      }),
    ).toEqual(["2026-07-16", "2026-07-17"]);
  });
});

describe("expandBookingCareDates", () => {
  it("uses requested_dates from joined request when present", () => {
    expect(
      expandBookingCareDates({
        start_date: "2026-07-16",
        end_date: "2026-07-29",
        status: "upcoming",
        requests: { requested_dates: ["2026-07-16", "2026-07-18", "2026-07-20"] },
      }),
    ).toEqual(["2026-07-16", "2026-07-18", "2026-07-20"]);
  });

  it("expands continuous range when requested_dates missing", () => {
    expect(
      expandBookingCareDates({
        start_date: "2026-07-16",
        end_date: "2026-07-18",
        status: "active",
        requests: null,
      }),
    ).toEqual(["2026-07-16", "2026-07-17", "2026-07-18"]);
  });
});

describe("findUnavailableSelectedDates", () => {
  const booked = new Set(["2026-07-16", "2026-07-17"]);
  const pending = new Set(["2026-07-20", "2026-07-21"]);

  it("flags booked dates before pending", () => {
    expect(
      findUnavailableSelectedDates(
        ["2026-07-16", "2026-07-20"],
        booked,
        pending,
      ),
    ).toEqual({ unavailableDates: ["2026-07-16"], reason: "booked" });
  });

  it("flags pending when no booked overlap", () => {
    expect(
      findUnavailableSelectedDates(["2026-07-20", "2026-07-22"], booked, pending),
    ).toEqual({ unavailableDates: ["2026-07-20"], reason: "pending" });
  });

  it("returns empty when all dates are free", () => {
    expect(
      findUnavailableSelectedDates(["2026-07-22", "2026-07-23"], booked, pending),
    ).toEqual({ unavailableDates: [], reason: null });
  });
});

describe("assertSelectedDatesNotBlocked", () => {
  it("rejects when a selected date overlaps an active booking", async () => {
    const client = {
      from: vi.fn((table: string) => {
        if (table === "bookings") {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  lte: () => ({
                    gte: async () => ({
                      data: [
                        {
                          start_date: "2026-07-16",
                          end_date: "2026-07-18",
                          status: "upcoming",
                          requests: { requested_dates: ["2026-07-17"] },
                        },
                      ],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "requests") {
          return {
            select: () => ({
              eq: () => ({
                eq: async () => ({ data: [], error: null }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    };

    await expect(
      assertSelectedDatesNotBlocked(client as never, "pet-1", [
        "2026-07-17",
        "2026-07-22",
      ]),
    ).rejects.toMatchObject({
      code: DATES_UNAVAILABLE_CODE,
      unavailableDates: ["2026-07-17"],
      reason: "booked",
    });
  });

  it("rejects when a selected date overlaps a pending request", async () => {
    const client = {
      from: vi.fn((table: string) => {
        if (table === "bookings") {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  lte: () => ({
                    gte: async () => ({ data: [], error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "requests") {
          return {
            select: () => ({
              eq: () => ({
                eq: async () => ({
                  data: [
                    {
                      id: "req-1",
                      requested_dates: ["2026-07-27", "2026-07-28"],
                      date_from: "2026-07-27",
                      date_to: "2026-07-28",
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    };

    await expect(
      assertSelectedDatesNotBlocked(client as never, "pet-1", ["2026-07-28"]),
    ).rejects.toBeInstanceOf(PetDatesUnavailableError);
  });

  it("allows dates when bookings are cancelled and no pending overlap", async () => {
    const client = {
      from: vi.fn((table: string) => {
        if (table === "bookings") {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  lte: () => ({
                    gte: async () => ({ data: [], error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "requests") {
          return {
            select: () => ({
              eq: () => ({
                eq: async () => ({ data: [], error: null }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    };

    await expect(
      assertSelectedDatesNotBlocked(client as never, "pet-1", ["2026-07-28"]),
    ).resolves.toBeUndefined();
  });
});
