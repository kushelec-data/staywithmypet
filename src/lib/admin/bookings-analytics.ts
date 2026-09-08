import { inWindow, periodChange, type PeriodChange } from "@/lib/admin/analytics";
import { ADMIN_PAGE_SIZE } from "@/lib/admin/aggregates";
import type { AdminBookingLite } from "@/lib/admin/aggregates";

export const BOOKINGS_RANGES = ["1d", "7d", "30d", "90d", "all"] as const;
export type BookingsRange = (typeof BOOKINGS_RANGES)[number];

export const BOOKINGS_RANGE_LABELS: Record<BookingsRange, string> = {
  "1d": "Today",
  "7d": "7 Days",
  "30d": "30 Days",
  "90d": "90 Days",
  all: "All Time",
};

export const BOOKINGS_CHART_METRICS = ["created", "upcoming", "active", "completed", "cancelled"] as const;
export type BookingsChartMetric = (typeof BOOKINGS_CHART_METRICS)[number];

export const BOOKINGS_CHART_LABELS: Record<BookingsChartMetric, string> = {
  created: "Created",
  upcoming: "Upcoming",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
};

export type BookingsGrain = "hour" | "day" | "week" | "month";

export type BookingsWindow = {
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
  grain: BookingsGrain;
  activityGrain: BookingsGrain;
  range: BookingsRange;
  compare: boolean;
};

export function parseBookingsRange(raw: string | null | undefined): BookingsRange {
  if (raw === "1d" || raw === "7d" || raw === "90d" || raw === "all") return raw;
  return "30d";
}

export function parseBookingsMetric(raw: string | null | undefined): BookingsChartMetric {
  if (BOOKINGS_CHART_METRICS.includes(raw as BookingsChartMetric)) return raw as BookingsChartMetric;
  return "created";
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUtcWeek(date: Date): Date {
  const day = startOfUtcDay(date);
  const weekday = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() - (weekday - 1));
  return day;
}

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function bookingsBucketKey(iso: string, grain: BookingsGrain): string {
  const d = new Date(iso);
  if (grain === "hour") {
    return `${d.toISOString().slice(0, 10)}T${String(d.getUTCHours()).padStart(2, "0")}`;
  }
  if (grain === "day") return d.toISOString().slice(0, 10);
  if (grain === "month") return d.toISOString().slice(0, 7);
  const weekStart = startOfUtcWeek(d);
  return weekStart.toISOString().slice(0, 10);
}

export function enumerateBookingsBuckets(window: Pick<BookingsWindow, "start" | "end" | "grain">): string[] {
  const keys: string[] = [];
  if (window.grain === "hour") {
    const cursor = new Date(window.start);
    cursor.setUTCMinutes(0, 0, 0);
    while (cursor.getTime() < window.end.getTime()) {
      keys.push(bookingsBucketKey(cursor.toISOString(), "hour"));
      cursor.setUTCHours(cursor.getUTCHours() + 1);
    }
    return keys.length ? keys : [bookingsBucketKey(window.start.toISOString(), "hour")];
  }
  if (window.grain === "week") {
    const cursor = startOfUtcWeek(window.start);
    while (cursor.getTime() < window.end.getTime()) {
      keys.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 7);
    }
    return keys.length ? keys : [startOfUtcWeek(window.start).toISOString().slice(0, 10)];
  }
  if (window.grain === "month") {
    const cursor = startOfUtcMonth(window.start);
    while (cursor.getTime() < window.end.getTime()) {
      keys.push(cursor.toISOString().slice(0, 7));
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    return keys.length ? keys : [startOfUtcMonth(window.start).toISOString().slice(0, 7)];
  }
  const cursor = startOfUtcDay(window.start);
  const last = startOfUtcDay(new Date(window.end.getTime() - 1));
  while (cursor.getTime() <= last.getTime()) {
    keys.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}

export function resolveBookingsWindow(
  range: BookingsRange,
  now = new Date(),
  earliestIso?: string | null,
): BookingsWindow {
  const end = now;
  if (range === "all") {
    const earliest = earliestIso ? new Date(earliestIso) : startOfUtcDay(now);
    const start = Number.isNaN(earliest.getTime()) ? startOfUtcDay(now) : startOfUtcDay(earliest);
    const spanDays = Math.max(1, (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    const grain: BookingsGrain = spanDays > 400 ? "month" : "week";
    return {
      start,
      end,
      previousStart: start,
      previousEnd: start,
      grain,
      activityGrain: grain === "month" ? "month" : "week",
      range,
      compare: false,
    };
  }
  if (range === "1d") {
    const start = startOfUtcDay(now);
    const ms = end.getTime() - start.getTime() || 24 * 60 * 60 * 1000;
    return {
      start,
      end,
      previousStart: new Date(start.getTime() - ms),
      previousEnd: start,
      grain: "hour",
      activityGrain: "hour",
      range,
      compare: true,
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
    activityGrain: range === "90d" ? "week" : "day",
    range,
    compare: true,
  };
}

export function kpiChangeOrAllTime(current: number, previous: number, compare: boolean): PeriodChange {
  if (!compare) return { current, previous: current, label: "All time", direction: "flat" };
  return periodChange(current, previous);
}

export function completionRate(completed: number, created: number): number {
  if (created === 0) return 0;
  return Math.round((completed / created) * 1000) / 10;
}

export function periodPointChange(current: number, previous: number, compare: boolean): PeriodChange {
  if (!compare) return { current, previous: current, label: "All time", direction: "flat" };
  if (previous === 0 && current > 0) return { current, previous, label: "New", direction: "new" };
  if (previous === 0 && current === 0) return { current, previous, label: "0 pp", direction: "flat" };
  const pp = Math.round((current - previous) * 10) / 10;
  if (pp > 0) return { current, previous, label: `+${pp} pp`, direction: "up" };
  if (pp < 0) return { current, previous, label: `${pp} pp`, direction: "down" };
  return { current, previous, label: "0 pp", direction: "flat" };
}

export type BookingRequestLite = {
  id: string;
  pet_id: string;
  pet_parent_id: string;
  pet_friend_id: string;
  status: string;
  created_at: string;
};

export function bookingsCreatedInWindow(bookings: AdminBookingLite[], start: Date, end: Date): AdminBookingLite[] {
  return bookings.filter((b) => inWindow(b.created_at, start, end));
}

export function bookingKpiCounts(bookings: AdminBookingLite[], start: Date, end: Date) {
  const createdRows = bookingsCreatedInWindow(bookings, start, end);
  return {
    created: createdRows.length,
    upcoming: createdRows.filter((b) => b.status === "upcoming").length,
    active: createdRows.filter((b) => b.status === "active").length,
    completed: createdRows.filter((b) => b.status === "completed").length,
    cancelled: createdRows.filter((b) => b.status === "cancelled").length,
  };
}

export function statusBreakdown(bookings: AdminBookingLite[]) {
  const counts = {
    upcoming: bookings.filter((b) => b.status === "upcoming").length,
    active: bookings.filter((b) => b.status === "active").length,
    completed: bookings.filter((b) => b.status === "completed").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  };
  const total = Math.max(1, bookings.length);
  const pct = (n: number) => Math.round((n / total) * 1000) / 10;
  return {
    total: bookings.length,
    rows: [
      { status: "upcoming" as const, count: counts.upcoming, percent: pct(counts.upcoming) },
      { status: "active" as const, count: counts.active, percent: pct(counts.active) },
      { status: "completed" as const, count: counts.completed, percent: pct(counts.completed) },
      { status: "cancelled" as const, count: counts.cancelled, percent: pct(counts.cancelled) },
    ],
  };
}

function triple(parentId: string, friendId: string, petId: string) {
  return `${parentId}:${friendId}:${petId}`;
}

export function bookingConversion(input: {
  requests: BookingRequestLite[];
  bookings: AdminBookingLite[];
  start: Date;
  end: Date;
}) {
  const reqs = input.requests.filter((r) => inWindow(r.created_at, input.start, input.end));
  const requestTriples = new Set(reqs.map((r) => triple(r.pet_parent_id, r.pet_friend_id, r.pet_id)));
  const acceptedTriples = new Set(
    reqs
      .filter((r) => r.status === "accepted" || r.status === "completed")
      .map((r) => triple(r.pet_parent_id, r.pet_friend_id, r.pet_id)),
  );
  const periodBookings = bookingsCreatedInWindow(input.bookings, input.start, input.end);
  const bookingTriples = new Set(periodBookings.map((b) => triple(b.pet_parent_id, b.pet_friend_id, b.pet_id)));
  const completedTriples = new Set(
    periodBookings.filter((b) => b.status === "completed").map((b) => triple(b.pet_parent_id, b.pet_friend_id, b.pet_id)),
  );
  const requestCount = requestTriples.size;
  const acceptedCount = acceptedTriples.size;
  const bookingCount = bookingTriples.size;
  const completedCount = completedTriples.size;
  const pct = (num: number, den: number) => (den === 0 ? 0 : Math.round((num / den) * 1000) / 10);
  return {
    requests: requestCount,
    accepted: acceptedCount,
    bookings: bookingCount,
    completed: completedCount,
    requestToBooking: pct(bookingCount, requestCount),
    bookingToCompleted: pct(completedCount, bookingCount),
  };
}

export function parseBookingDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00.000Z`);
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function bookingDurationDays(start: string | null | undefined, end: string | null | undefined): number | null {
  const s = parseBookingDate(start);
  const e = parseBookingDate(end);
  if (!s || !e) return null;
  const days = Math.round((e.getTime() - s.getTime()) / (24 * 60 * 60 * 1000));
  if (days < 0) return null;
  return days;
}

export function durationBucket(days: number): "same_day" | "1_2" | "3_7" | "7_plus" {
  if (days === 0) return "same_day";
  if (days <= 2) return "1_2";
  if (days <= 7) return "3_7";
  return "7_plus";
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return Math.round(((sorted[mid - 1]! + sorted[mid]!) / 2) * 10) / 10;
  return sorted[mid]!;
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((s, n) => s + n, 0) / values.length) * 10) / 10;
}

export function timeToBookingHours(
  bookings: AdminBookingLite[],
  requests: BookingRequestLite[],
): number[] {
  const byId = new Map(requests.map((r) => [r.id, r]));
  const hours: number[] = [];
  for (const booking of bookings) {
    if (!booking.request_id) continue;
    const req = byId.get(booking.request_id);
    if (!req) continue;
    const delta = new Date(booking.created_at).getTime() - new Date(req.created_at).getTime();
    if (!Number.isFinite(delta) || delta < 0) continue;
    hours.push(delta / (60 * 60 * 1000));
  }
  return hours;
}

export function durationStats(bookings: AdminBookingLite[]) {
  const days = bookings
    .map((b) => bookingDurationDays(b.start_date, b.end_date))
    .filter((n): n is number => n != null);
  const buckets = { same_day: 0, "1_2": 0, "3_7": 0, "7_plus": 0 };
  for (const d of days) buckets[durationBucket(d)] += 1;
  return {
    sampleSize: days.length,
    averageDays: average(days),
    medianDays: median(days),
    buckets,
  };
}

export function countByBucket(
  timestamps: Array<string | null | undefined>,
  buckets: string[],
  grain: BookingsGrain,
  start: Date,
  end: Date,
): Array<{ bucket: string; value: number }> {
  const values = new Map(buckets.map((b) => [b, 0]));
  for (const iso of timestamps) {
    if (!iso || !inWindow(iso, start, end)) continue;
    const key = bookingsBucketKey(iso, grain);
    if (values.has(key)) values.set(key, (values.get(key) ?? 0) + 1);
  }
  return buckets.map((bucket) => ({ bucket, value: values.get(bucket) ?? 0 }));
}

export function bookingsSeries(
  bookings: AdminBookingLite[],
  window: BookingsWindow,
  metric: BookingsChartMetric,
): Array<{ bucket: string; value: number }> {
  const buckets = enumerateBookingsBuckets(window);
  const created = bookingsCreatedInWindow(bookings, window.start, window.end);
  if (metric === "created") {
    return countByBucket(
      bookings.map((b) => b.created_at),
      buckets,
      window.grain,
      window.start,
      window.end,
    );
  }
  if (metric === "completed") {
    return countByBucket(
      bookings.map((b) => b.completed_at),
      buckets,
      window.grain,
      window.start,
      window.end,
    );
  }
  if (metric === "cancelled") {
    return countByBucket(
      bookings.map((b) => b.cancelled_at),
      buckets,
      window.grain,
      window.start,
      window.end,
    );
  }
  const subset = created.filter((b) => b.status === metric);
  return countByBucket(
    subset.map((b) => b.created_at),
    buckets,
    window.grain,
    window.start,
    window.end,
  );
}

export function bookingActivityBars(
  bookings: AdminBookingLite[],
  window: BookingsWindow,
): Array<{ bucket: string; created: number; completed: number; cancelled: number }> {
  const grainWindow = { ...window, grain: window.activityGrain };
  const buckets = enumerateBookingsBuckets(grainWindow);
  const created = countByBucket(
    bookings.map((b) => b.created_at),
    buckets,
    window.activityGrain,
    window.start,
    window.end,
  );
  const completed = countByBucket(
    bookings.map((b) => b.completed_at),
    buckets,
    window.activityGrain,
    window.start,
    window.end,
  );
  const cancelled = countByBucket(
    bookings.map((b) => b.cancelled_at),
    buckets,
    window.activityGrain,
    window.start,
    window.end,
  );
  return buckets.map((bucket, i) => ({
    bucket,
    created: created[i]?.value ?? 0,
    completed: completed[i]?.value ?? 0,
    cancelled: cancelled[i]?.value ?? 0,
  }));
}

export function utcTodayIso(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function bookingNeedsStatusWarning(booking: AdminBookingLite, todayIso: string): boolean {
  if (booking.status !== "upcoming" && booking.status !== "active") return false;
  if (!booking.end_date) return false;
  return booking.end_date < todayIso;
}

export function upcomingSchedule(bookings: AdminBookingLite[], todayIso: string, limit = 14): AdminBookingLite[] {
  return bookings
    .filter((b) => b.status === "upcoming" || b.status === "active")
    .filter((b) => b.start_date && b.start_date >= todayIso)
    .sort((a, b) => (a.start_date ?? "").localeCompare(b.start_date ?? "") || a.created_at.localeCompare(b.created_at))
    .slice(0, limit);
}

export type RankedBookingParty = {
  id: string;
  bookings: number;
  completed: number;
  cancelled: number;
  lastBooking: string | null;
};

function rankBy(
  bookings: AdminBookingLite[],
  idOf: (b: AdminBookingLite) => string,
): RankedBookingParty[] {
  const map = new Map<string, RankedBookingParty>();
  for (const b of bookings) {
    const id = idOf(b);
    const row = map.get(id) ?? { id, bookings: 0, completed: 0, cancelled: 0, lastBooking: null };
    row.bookings += 1;
    if (b.status === "completed") row.completed += 1;
    if (b.status === "cancelled") row.cancelled += 1;
    if (!row.lastBooking || b.created_at > row.lastBooking) row.lastBooking = b.created_at;
    map.set(id, row);
  }
  return [...map.values()].sort((a, b) => b.bookings - a.bookings || (b.lastBooking ?? "").localeCompare(a.lastBooking ?? "")).slice(0, 5);
}

export function topParents(bookings: AdminBookingLite[]) {
  return rankBy(bookings, (b) => b.pet_parent_id);
}
export function topFriends(bookings: AdminBookingLite[]) {
  return rankBy(bookings, (b) => b.pet_friend_id);
}
export function topPets(bookings: AdminBookingLite[]) {
  return rankBy(bookings, (b) => b.pet_id);
}

export type BookingPairRank = {
  parentId: string;
  friendId: string;
  bookings: number;
  completed: number;
  cancelled: number;
  lastBooking: string | null;
};

export function topPairs(bookings: AdminBookingLite[]): BookingPairRank[] {
  const map = new Map<string, BookingPairRank>();
  for (const b of bookings) {
    const key = `${b.pet_parent_id}:${b.pet_friend_id}`;
    const row = map.get(key) ?? {
      parentId: b.pet_parent_id,
      friendId: b.pet_friend_id,
      bookings: 0,
      completed: 0,
      cancelled: 0,
      lastBooking: null,
    };
    row.bookings += 1;
    if (b.status === "completed") row.completed += 1;
    if (b.status === "cancelled") row.cancelled += 1;
    if (!row.lastBooking || b.created_at > row.lastBooking) row.lastBooking = b.created_at;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.bookings - a.bookings || (b.lastBooking ?? "").localeCompare(a.lastBooking ?? "")).slice(0, 5);
}

export type BookingFeedItem = { at: string; label: string };

export function recentBookingActivity(
  bookings: AdminBookingLite[],
  names: Map<string, string>,
  pets: Map<string, string>,
  limit = 12,
): BookingFeedItem[] {
  const name = (id: string) => names.get(id) ?? "Member";
  const pet = (id: string) => pets.get(id) ?? "pet";
  const items: BookingFeedItem[] = [];
  for (const b of bookings) {
    items.push({
      at: b.created_at,
      label: `Booking created: ${name(b.pet_parent_id)} → ${name(b.pet_friend_id)} for ${pet(b.pet_id)}`,
    });
    if (b.completed_at) {
      items.push({
        at: b.completed_at,
        label: `Booking completed: ${pet(b.pet_id)}`,
      });
    }
    if (b.cancelled_at) {
      items.push({
        at: b.cancelled_at,
        label: `Booking cancelled: ${name(b.pet_parent_id)} → ${name(b.pet_friend_id)}`,
      });
    }
  }
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

export type BookingsTableFilters = {
  q?: string;
  status?: string;
  parent?: string;
  friend?: string;
  pet?: string;
  createdFrom?: string;
  createdTo?: string;
  sort?: "created" | "start" | "end";
  dir?: "asc" | "desc";
  page?: number;
};

export function filterBookingRows(
  bookings: AdminBookingLite[],
  filters: BookingsTableFilters,
  names: Map<string, string>,
  emails: Map<string, string | null>,
  pets: Map<string, string>,
): AdminBookingLite[] {
  const q = filters.q?.trim().toLowerCase() ?? "";
  const parentQ = filters.parent?.trim().toLowerCase() ?? "";
  const friendQ = filters.friend?.trim().toLowerCase() ?? "";
  const petQ = filters.pet?.trim().toLowerCase() ?? "";
  let rows = bookings.filter((b) => {
    if (filters.status && b.status !== filters.status) return false;
    if (filters.createdFrom && b.created_at < filters.createdFrom) return false;
    if (filters.createdTo && b.created_at > `${filters.createdTo}T23:59:59.999Z`) return false;
    const parentName = names.get(b.pet_parent_id) ?? "";
    const friendName = names.get(b.pet_friend_id) ?? "";
    const petName = pets.get(b.pet_id) ?? "";
    const parentEmail = emails.get(b.pet_parent_id) ?? "";
    const friendEmail = emails.get(b.pet_friend_id) ?? "";
    if (parentQ && !parentName.toLowerCase().includes(parentQ) && !parentEmail.toLowerCase().includes(parentQ)) return false;
    if (friendQ && !friendName.toLowerCase().includes(friendQ) && !friendEmail.toLowerCase().includes(friendQ)) return false;
    if (petQ && !petName.toLowerCase().includes(petQ)) return false;
    if (q) {
      const hay = `${parentName} ${friendName} ${petName} ${parentEmail} ${friendEmail}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const sort = filters.sort ?? "created";
  const dir = filters.dir === "asc" ? 1 : -1;
  const key = (b: AdminBookingLite) =>
    sort === "start" ? b.start_date ?? "" : sort === "end" ? b.end_date ?? "" : b.created_at;
  rows = [...rows].sort((a, b) => dir * key(a).localeCompare(key(b)));
  return rows;
}

export function paginateBookingRows(rows: AdminBookingLite[], page: number, pageSize = ADMIN_PAGE_SIZE) {
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * pageSize;
  return { items: rows.slice(start, start + pageSize), total: rows.length, page: safePage, pageSize };
}

export function formatAdminDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const d = new Date(`${iso}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${time}`;
}

export function formatHoursLabel(hours: number | null): string | null {
  if (hours == null) return null;
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.floor(hours / 24);
  const rem = Math.round(hours % 24);
  return rem ? `${days}d ${rem}h` : `${days}d`;
}

export function bookingsPayloadIsUnsafe(payload: unknown): boolean {
  const text = JSON.stringify(payload);
  return ["\"body\"", "card_number", "cvc", "service_role", "password", "access_token", "sk_live", "phone_e164"].some((k) =>
    text.includes(k),
  );
}
