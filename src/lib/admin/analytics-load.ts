import { loadAdminCatalog, loadActivityEventsInRange } from "@/lib/admin/queries";
import { buildAdminUserRows, buildRelationshipRows, funnelCounts } from "@/lib/admin/aggregates";
import {
  dauStats,
  dailyOverviewRows,
  dailySeries,
  funnelConversions,
  kpiTotals,
  marketplaceActivity,
  parseAnalyticsRange,
  parseChartMetric,
  periodChange,
  recentActivityFeed,
  resolveAnalyticsWindow,
  retentionFromActivity,
  topEvents,
  topPages,
  userLeaderboard,
  type AnalyticsCanonicalFacts,
  type AnalyticsChartMetric,
  type AnalyticsRange,
} from "@/lib/admin/analytics";

export async function buildAnalyticsDashboardDto(opts: {
  range: AnalyticsRange;
  metric: AnalyticsChartMetric;
  now?: Date;
}) {
  const catalog = await loadAdminCatalog();
  if (!catalog) return null;
  const activity = await loadActivityEventsInRange();
  const facts: AnalyticsCanonicalFacts = {
    signups: catalog.profiles.map((p) => ({ id: p.id, created_at: p.created_at })),
    requests: catalog.requests,
    messages: catalog.messages,
    bookings: catalog.bookings,
    conversations: catalog.conversations,
    pets: catalog.pets,
    matches: catalog.matches,
    activity,
  };
  const window = resolveAnalyticsWindow(opts.range, opts.now ?? new Date());
  const current = kpiTotals(facts, window.start, window.end);
  const previous = kpiTotals(facts, window.previousStart, window.previousEnd);
  const users = buildAdminUserRows(catalog);
  const funnelBase = funnelCounts(users, catalog.authUsers).map((step) => ({
    ...step,
    step:
      step.step === "Request"
        ? "Sent/received request"
        : step.step === "Conversation"
          ? "Messaged"
          : step.step === "Booking"
            ? "Booking created"
            : step.step === "Completed booking"
              ? "Booking completed"
              : step.step,
  }));
  const funnel = funnelConversions(funnelBase);
  const names = new Map(catalog.profiles.map((p) => [p.id, p.display_name]));
  const emails = new Map(catalog.authUsers.map((u) => [u.id, u.email]));
  const pets = new Map(catalog.pets.map((p) => [p.id, p.name]));
  const leaderboard = userLeaderboard(facts, window.start, window.end).map((row) => {
    const profile = catalog.profiles.find((p) => p.id === row.userId);
    return {
      ...row,
      name: profile?.display_name ?? row.userId,
      email: emails.get(row.userId) ?? null,
      role: profile?.role ?? "—",
    };
  });
  const relationships = buildRelationshipRows(catalog)
    .filter((r) => r.lastInteraction && r.lastInteraction >= window.start.toISOString())
    .slice(0, 20);
  const today = resolveAnalyticsWindow("1d", opts.now ?? new Date());
  const todayKpi = kpiTotals(facts, today.start, today.end);
  const pages = topPages(facts.activity, window.start, window.end);
  const trackingStarted = facts.activity.length > 0;

  return {
    range: opts.range,
    metric: opts.metric,
    window: {
      start: window.start.toISOString(),
      end: window.end.toISOString(),
      grain: window.grain,
    },
    kpis: {
      uniqueActiveUsers: periodChange(current.uniqueActiveUsers, previous.uniqueActiveUsers),
      pageViews: periodChange(current.pageViews, previous.pageViews),
      newSignups: periodChange(current.newSignups, previous.newSignups),
      requestsSent: periodChange(current.requestsSent, previous.requestsSent),
      messagesSent: periodChange(current.messagesSent, previous.messagesSent),
      bookingsCreated: periodChange(current.bookingsCreated, previous.bookingsCreated),
      completedBookings: periodChange(current.completedBookings, previous.completedBookings),
      matchInteractions: periodChange(current.matchInteractions, previous.matchInteractions),
    },
    series: dailySeries(facts, window, opts.metric),
    daily: dailyOverviewRows(facts, window),
    topPages: pages,
    pageViewsAvailable: trackingStarted,
    marketplace: marketplaceActivity(facts, window.start, window.end),
    dau: dauStats(facts, window),
    leaderboard,
    relationships: relationships.map((r) => ({
      petParentName: r.petParentName,
      petFriendName: r.petFriendName,
      petParentId: r.petParentId,
      petFriendId: r.petFriendId,
      requests: r.requests,
      messages: r.messageCount,
      bookings: r.bookings,
      completedBookings: r.completedBookings,
      lastInteraction: r.lastInteraction,
      activityLevel: r.interactionLevel,
    })),
    funnel,
    retention: retentionFromActivity(facts.activity, window.start, window.end),
    deviceNote: "Device/referrer analytics not currently recorded.",
    utmNote: "UTM and referrer metadata are not stored on user_activity_events.",
    today: {
      ...todayKpi,
      lastAction:
        recentActivityFeed(facts, names, pets, 1)[0]?.at ?? null,
    },
    topEvents: topEvents(facts.activity, window.start, window.end),
    recent: recentActivityFeed(facts, names, pets, 50),
  };
}

export function analyticsQueryFromSearch(sp: { range?: string; metric?: string }) {
  return {
    range: parseAnalyticsRange(sp.range),
    metric: parseChartMetric(sp.metric),
  };
}
