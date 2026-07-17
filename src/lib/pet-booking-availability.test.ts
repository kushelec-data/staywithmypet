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

describe("sparse booking overlap (DB acceptance parity)", () => {
  const sparseBookingDates = [
    "2026-07-16",
    "2026-07-17",
    "2026-07-18",
    "2026-07-20",
    "2026-07-21",
    "2026-07-22",
    "2026-07-27",
    "2026-07-28",
    "2026-07-29",
  ];

  function activeBookingDates(
    row: {
      start_date: string;
      end_date: string;
      status: "upcoming" | "active" | "completed" | "cancelled";
      requests: { requested_dates: string[] } | null;
    },
  ): Set<string> {
    if (row.status === "cancelled" || row.status === "completed") {
      return new Set();
    }
    return new Set(expandBookingCareDates(row));
  }

  function incomingConflict(
    selectedDates: string[],
    bookings: Array<{
      start_date: string;
      end_date: string;
      status: "upcoming" | "active" | "completed" | "cancelled";
      requests: { requested_dates: string[] } | null;
    }>,
  ) {
    const booked = new Set<string>();
    for (const booking of bookings) {
      for (const iso of activeBookingDates(booking)) {
        booked.add(iso);
      }
    }
    return findUnavailableSelectedDates(selectedDates, booked, new Set());
  }

  const sparseUpcomingBooking = {
    start_date: "2026-07-16",
    end_date: "2026-07-29",
    status: "upcoming" as const,
    requests: { requested_dates: sparseBookingDates },
  };

  it("allows July 23 when existing booking is sparse (gap day)", () => {
    expect(incomingConflict(["2026-07-23"], [sparseUpcomingBooking])).toEqual({
      unavailableDates: [],
      reason: null,
    });
  });

  it("rejects July 22 when it is in the sparse booking", () => {
    expect(incomingConflict(["2026-07-22"], [sparseUpcomingBooking])).toEqual({
      unavailableDates: ["2026-07-22"],
      reason: "booked",
    });
  });

  it("blocks every day in a continuous legacy booking range", () => {
    const legacyBooking = {
      start_date: "2026-07-16",
      end_date: "2026-07-18",
      status: "active" as const,
      requests: null,
    };

    expect(incomingConflict(["2026-07-17"], [legacyBooking])).toEqual({
      unavailableDates: ["2026-07-17"],
      reason: "booked",
    });
    expect(incomingConflict(["2026-07-19"], [legacyBooking])).toEqual({
      unavailableDates: [],
      reason: null,
    });
  });

  it("does not block dates when the only booking is cancelled", () => {
    const cancelledBooking = {
      start_date: "2026-07-16",
      end_date: "2026-07-29",
      status: "cancelled" as const,
      requests: { requested_dates: sparseBookingDates },
    };

    expect(incomingConflict(["2026-07-22", "2026-07-23"], [cancelledBooking])).toEqual({
      unavailableDates: [],
      reason: null,
    });
  });

  it("allows a single-day request on a free sparse gap", () => {
    expect(
      expandRequestCareDates({
        requested_dates: ["2026-07-23"],
        date_from: "2026-07-23",
        date_to: "2026-07-23",
      }),
    ).toEqual(["2026-07-23"]);

    expect(incomingConflict(["2026-07-23"], [sparseUpcomingBooking])).toEqual({
      unavailableDates: [],
      reason: null,
    });
  });
});

describe("restore pet availability (cancel parity)", () => {
  const sparseBookingDates = [
    "2026-07-16",
    "2026-07-17",
    "2026-07-18",
    "2026-07-20",
    "2026-07-21",
    "2026-07-22",
    "2026-07-27",
    "2026-07-28",
    "2026-07-29",
  ];

  /** Mirrors restore_pet_availability_for_booking(p_pet_id, p_dates date[]). */
  function restoreAvailability(current: string[], careDates: string[]): string[] {
    const restore = [...new Set(careDates)].sort();
    return [...new Set([...current, ...restore])].sort();
  }

  it("cancelling a sparse booking restores only its selected dates", () => {
    const afterBlock = ["2026-07-19", "2026-07-23", "2026-07-24", "2026-07-25", "2026-07-26"];
    const restored = restoreAvailability(afterBlock, sparseBookingDates);

    expect(restored).toEqual([
      "2026-07-16",
      "2026-07-17",
      "2026-07-18",
      "2026-07-19",
      "2026-07-20",
      "2026-07-21",
      "2026-07-22",
      "2026-07-23",
      "2026-07-24",
      "2026-07-25",
      "2026-07-26",
      "2026-07-27",
      "2026-07-28",
      "2026-07-29",
    ]);
  });

  it("does not add gap dates that were never in the sparse booking", () => {
    const afterBlock = ["2026-07-19", "2026-07-23"];
    const restored = restoreAvailability(afterBlock, sparseBookingDates);

    expect(restored.includes("2026-07-25")).toBe(false);
    expect(restored.includes("2026-07-26")).toBe(false);
    expect(restored.filter((d) => d === "2026-07-19" || d === "2026-07-23")).toEqual([
      "2026-07-19",
      "2026-07-23",
    ]);
  });

  it("does not duplicate dates already in pets.availability_dates", () => {
    const current = ["2026-07-20", "2026-07-22", "2026-07-27"];
    const restored = restoreAvailability(current, ["2026-07-20", "2026-07-22", "2026-07-28"]);

    expect(restored).toEqual(["2026-07-20", "2026-07-22", "2026-07-27", "2026-07-28"]);
    expect(restored.length).toBe(new Set(restored).size);
  });

  it("restores the full continuous range for legacy bookings", () => {
    const legacyCareDates = expandBookingCareDates({
      start_date: "2026-07-16",
      end_date: "2026-07-18",
      status: "active",
      requests: null,
    });

    expect(legacyCareDates).toEqual(["2026-07-16", "2026-07-17", "2026-07-18"]);
    expect(restoreAvailability([], legacyCareDates)).toEqual([
      "2026-07-16",
      "2026-07-17",
      "2026-07-18",
    ]);
  });
});
