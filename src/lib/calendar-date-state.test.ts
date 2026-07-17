import { describe, expect, it } from "vitest";
import { resolveCalendarDay } from "@/lib/calendar-date-state";

const labels = {
  pastUnavailable: "Past",
  pastCompleted: "Completed",
  booked: "Booked",
  alreadyBooked: "Already booked",
  pendingRequest: "Pending",
  notAvailable: "Not available",
  available: "Available",
  selected: "Selected",
  iso: "2026-07-20",
};

describe("resolveCalendarDay request-select", () => {
  const base = {
    iso: "2026-07-20",
    today: "2026-07-17",
    slices: [],
    mode: "request-select" as const,
    isSelected: false,
    isAvailable: true,
    blockingBooked: false,
    blockingPending: false,
  };

  it("allows selecting friend-available dates with no pet blocks", () => {
    const resolved = resolveCalendarDay(base, { ...labels, iso: base.iso }, { visibility: "public" });
    expect(resolved.canSelect).toBe(true);
    expect(resolved.visual).toBe("available");
  });

  it("blocks booked pet dates even when friend is available", () => {
    const resolved = resolveCalendarDay(
      { ...base, blockingBooked: true },
      { ...labels, iso: base.iso },
      { visibility: "public" },
    );
    expect(resolved.canSelect).toBe(false);
    expect(resolved.visual).toBe("future-booked");
  });

  it("blocks pending pet dates even when friend is available", () => {
    const resolved = resolveCalendarDay(
      { ...base, blockingPending: true },
      { ...labels, iso: base.iso },
      { visibility: "public" },
    );
    expect(resolved.canSelect).toBe(false);
    expect(resolved.visual).toBe("future-pending");
  });

  it("blocks dates outside friend availability", () => {
    const resolved = resolveCalendarDay(
      { ...base, isAvailable: false },
      { ...labels, iso: base.iso },
      { visibility: "public" },
    );
    expect(resolved.canSelect).toBe(false);
    expect(resolved.visual).toBe("unavailable");
  });

  it("requires friend availability and no pet blocks for selection", () => {
    const resolved = resolveCalendarDay(
      { ...base, isAvailable: false, blockingBooked: true, blockingPending: true },
      { ...labels, iso: base.iso },
      { visibility: "public" },
    );
    expect(resolved.canSelect).toBe(false);
  });
});
