import { loadAdminBookingsBundle } from "@/lib/admin/queries";
import {
  bookingActivityBars,
  bookingConversion,
  bookingDurationDays,
  bookingKpiCounts,
  bookingNeedsStatusWarning,
  bookingsPayloadIsUnsafe,
  bookingsSeries,
  completionRate,
  durationStats,
  filterBookingRows,
  formatAdminDate,
  formatHoursLabel,
  kpiChangeOrAllTime,
  paginateBookingRows,
  parseBookingsMetric,
  parseBookingsRange,
  periodPointChange,
  recentBookingActivity,
  resolveBookingsWindow,
  statusBreakdown,
  timeToBookingHours,
  topFriends,
  topPairs,
  topParents,
  topPets,
  upcomingSchedule,
  utcTodayIso,
  average,
  median,
  type BookingsChartMetric,
  type BookingsRange,
  type BookingsTableFilters,
} from "@/lib/admin/bookings-analytics";

export function bookingsQueryFromSearch(sp: {
  range?: string;
  metric?: string;
  q?: string;
  status?: string;
  parent?: string;
  friend?: string;
  pet?: string;
  createdFrom?: string;
  createdTo?: string;
  sort?: string;
  dir?: string;
  page?: string;
}) {
  const sort = sp.sort === "start" || sp.sort === "end" ? sp.sort : "created";
  const dir = sp.dir === "asc" ? "asc" : "desc";
  return {
    range: parseBookingsRange(sp.range),
    metric: parseBookingsMetric(sp.metric),
    filters: {
      q: sp.q,
      status: sp.status,
      parent: sp.parent,
      friend: sp.friend,
      pet: sp.pet,
      createdFrom: sp.createdFrom,
      createdTo: sp.createdTo,
      sort,
      dir,
      page: Number(sp.page ?? "1") || 1,
    } satisfies BookingsTableFilters,
  };
}

export async function buildBookingsDashboardDto(opts: {
  range: BookingsRange;
  metric: BookingsChartMetric;
  filters: BookingsTableFilters;
  now?: Date;
}) {
  const bundle = await loadAdminBookingsBundle();
  if (!bundle) return null;
  const now = opts.now ?? new Date();
  const earliest = bundle.bookings.reduce((min, b) => (!min || b.created_at < min ? b.created_at : min), "");
  const window = resolveBookingsWindow(opts.range, now, earliest || null);
  const names = new Map(bundle.profiles.map((p) => [p.id, p.display_name]));
  const emails = new Map(bundle.authUsers.map((u) => [u.id, u.email]));
  const pets = new Map(bundle.pets.map((p) => [p.id, p.name]));
  const petOwners = new Map(bundle.pets.map((p) => [p.id, p.owner_id]));
  const convByRequest = new Map(bundle.conversations.map((c) => [c.request_id, c.id]));
  const current = bookingKpiCounts(bundle.bookings, window.start, window.end);
  const previous = bookingKpiCounts(bundle.bookings, window.previousStart, window.previousEnd);
  const currentRate = completionRate(current.completed, current.created);
  const previousRate = completionRate(previous.completed, previous.created);
  const createdRows = bundle.bookings.filter(
    (b) => b.created_at >= window.start.toISOString() && b.created_at < window.end.toISOString(),
  );
  const series = bookingsSeries(bundle.bookings, window, opts.metric);
  const previousSeries = window.compare
    ? bookingsSeries(
        bundle.bookings,
        { ...window, start: window.previousStart, end: window.previousEnd },
        opts.metric,
      )
    : [];
  const hours = timeToBookingHours(createdRows, bundle.requests);
  const durations = durationStats(createdRows);
  const todayIso = utcTodayIso(now);
  const withName = (row: { id: string; bookings: number; completed: number; cancelled: number; lastBooking: string | null }) => ({
    ...row,
    name: names.get(row.id) ?? row.id,
  });

  const filtered = filterBookingRows(bundle.bookings, opts.filters, names, emails, pets);
  const page = paginateBookingRows(filtered, opts.filters.page ?? 1);

  return {
    range: opts.range,
    metric: opts.metric,
    periodLabel: window.compare
      ? `${formatAdminDate(window.start.toISOString())} – ${formatAdminDate(window.end.toISOString())}`
      : "All time",
    window: {
      start: window.start.toISOString(),
      end: window.end.toISOString(),
      grain: window.grain,
      activityGrain: window.activityGrain,
      compare: window.compare,
    },
    kpis: {
      created: {
        ...kpiChangeOrAllTime(current.created, previous.created, window.compare),
        spark: bookingsSeries(bundle.bookings, window, "created").map((p) => p.value),
      },
      upcoming: {
        ...kpiChangeOrAllTime(current.upcoming, previous.upcoming, window.compare),
        spark: bookingsSeries(bundle.bookings, window, "upcoming").map((p) => p.value),
      },
      active: {
        ...kpiChangeOrAllTime(current.active, previous.active, window.compare),
        spark: bookingsSeries(bundle.bookings, window, "active").map((p) => p.value),
      },
      completed: {
        ...kpiChangeOrAllTime(current.completed, previous.completed, window.compare),
        spark: bookingsSeries(bundle.bookings, window, "completed").map((p) => p.value),
      },
      cancelled: {
        ...kpiChangeOrAllTime(current.cancelled, previous.cancelled, window.compare),
        spark: bookingsSeries(bundle.bookings, window, "cancelled").map((p) => p.value),
      },
      completionRate: {
        ...periodPointChange(currentRate, previousRate, window.compare),
        display: `${currentRate}%`,
      },
    },
    series,
    previousSeries,
    status: statusBreakdown(createdRows),
    conversion: bookingConversion({
      requests: bundle.requests,
      bookings: bundle.bookings,
      start: window.start,
      end: window.end,
    }),
    timing: {
      avgHours: average(hours),
      medianHours: median(hours),
      avgLabel: formatHoursLabel(average(hours)),
      medianLabel: formatHoursLabel(median(hours)),
      sampleSize: hours.length,
    },
    duration: {
      ...durations,
      averageLabel: durations.averageDays == null ? null : `${durations.averageDays}d`,
      medianLabel: durations.medianDays == null ? null : `${durations.medianDays}d`,
    },
    activity: bookingActivityBars(bundle.bookings, window),
    schedule: upcomingSchedule(bundle.bookings, todayIso).map((b) => ({
      id: b.id,
      start: b.start_date,
      pet: pets.get(b.pet_id) ?? "Pet",
      parent: names.get(b.pet_parent_id) ?? "Member",
      friend: names.get(b.pet_friend_id) ?? "Member",
      status: b.status,
    })),
    topParents: topParents(createdRows).map(withName),
    topFriends: topFriends(createdRows).map(withName),
    topPets: topPets(createdRows).map((row) => ({
      ...row,
      name: pets.get(row.id) ?? "Pet",
      parentName: names.get(petOwners.get(row.id) ?? "") ?? "Member",
    })),
    topPairs: topPairs(createdRows).map((row) => ({
      ...row,
      parentName: names.get(row.parentId) ?? "Member",
      friendName: names.get(row.friendId) ?? "Member",
    })),
    recent: recentBookingActivity(bundle.bookings, names, pets),
    table: {
      total: page.total,
      page: page.page,
      pageSize: page.pageSize,
      rows: page.items.map((b) => ({
        id: b.id,
        parentId: b.pet_parent_id,
        friendId: b.pet_friend_id,
        parent: names.get(b.pet_parent_id) ?? "Member",
        friend: names.get(b.pet_friend_id) ?? "Member",
        pet: pets.get(b.pet_id) ?? "Pet",
        status: b.status,
        created: b.created_at,
        start: b.start_date,
        end: b.end_date,
        durationDays: bookingDurationDays(b.start_date, b.end_date),
        requestId: b.request_id,
        conversationId: b.request_id ? convByRequest.get(b.request_id) ?? null : null,
        completedAt: b.completed_at,
        staleWarning: bookingNeedsStatusWarning(b, todayIso),
      })),
    },
  };
}

export function assertBookingsDtoSafe(data: unknown) {
  return !bookingsPayloadIsUnsafe(data);
}
