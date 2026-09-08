import { loadAdminCatalog, loadActivityEventsInRange } from "@/lib/admin/queries";
import { buildAdminUserRows } from "@/lib/admin/aggregates";
import {
  dailySeries,
  enumerateBuckets,
  kpiTotals,
  resolveAnalyticsWindow,
  type AnalyticsCanonicalFacts,
} from "@/lib/admin/analytics";
import {
  availabilityHealth,
  classifyMembershipChannel,
  compactSignupFunnel,
  countByBucket,
  formatEuro,
  kpiWithChange,
  marketplaceHealthCounts,
  marketplacePairFunnel,
  matchmakingSnapshot,
  membershipAcquisitionSeries,
  membershipSnapshot,
  membershipsInWindow,
  needsAttentionItems,
  overviewActivityFeed,
  parseOverviewMetric,
  parseOverviewRange,
  recentAccessCodeMembers,
  recentPaidMembers,
  relativeTimeLabel,
  type OverviewChartMetric,
  type OverviewRange,
} from "@/lib/admin/overview";
import { parseProfileDetails, profileCalendarSelectedDates } from "@/lib/profile-details";

export function overviewQueryFromSearch(sp: { range?: string; metric?: string }) {
  return {
    range: parseOverviewRange(sp.range),
    metric: parseOverviewMetric(sp.metric),
  };
}

function chartSeries(
  facts: AnalyticsCanonicalFacts,
  window: ReturnType<typeof resolveAnalyticsWindow>,
  metric: OverviewChartMetric,
  memberships: Parameters<typeof membershipAcquisitionSeries>[0],
) {
  const buckets = enumerateBuckets(window);
  if (metric === "signups") {
    return countByBucket(
      facts.signups.map((s) => s.created_at),
      buckets,
      window.grain,
      window.start,
      window.end,
    );
  }
  if (metric === "payments") {
    return membershipAcquisitionSeries(memberships, buckets, window.grain, window.start, window.end).map((row) => ({
      bucket: row.bucket,
      value: row.paid,
    }));
  }
  return dailySeries(
    facts,
    window,
    metric === "active_users" || metric === "requests" || metric === "messages" || metric === "bookings"
      ? metric
      : "active_users",
  );
}

export async function buildOverviewDashboardDto(opts: {
  range: OverviewRange;
  metric: OverviewChartMetric;
  now?: Date;
}) {
  const now = opts.now ?? new Date();
  const [catalog, activity] = await Promise.all([loadAdminCatalog(), loadActivityEventsInRange()]);
  if (!catalog) return null;

  const window = resolveAnalyticsWindow(opts.range, now);
  const facts: AnalyticsCanonicalFacts = {
    signups: catalog.profiles.map((p) => ({
      id: p.id,
      created_at: catalog.authUsers.find((u) => u.id === p.id)?.createdAt ?? p.created_at,
    })),
    requests: catalog.requests,
    messages: catalog.messages,
    bookings: catalog.bookings,
    conversations: catalog.conversations,
    pets: catalog.pets,
    matches: catalog.matches,
    activity,
  };
  const current = kpiTotals(facts, window.start, window.end);
  const previous = kpiTotals(facts, window.previousStart, window.previousEnd);
  const users = buildAdminUserRows(catalog);
  const names = new Map(catalog.profiles.map((p) => [p.id, p.display_name]));
  const emails = new Map(catalog.authUsers.map((u) => [u.id, u.email]));
  const membership = membershipSnapshot(catalog.memberships, window.start, window.end, now);
  const prevMembership = membershipSnapshot(
    catalog.memberships,
    window.previousStart,
    window.previousEnd,
    now,
  );

  const buckets = enumerateBuckets(window);
  const acquisition = membershipAcquisitionSeries(
    catalog.memberships,
    buckets,
    window.grain,
    window.start,
    window.end,
  );
  const series = chartSeries(facts, window, opts.metric, catalog.memberships);
  const previousSeries = chartSeries(
    facts,
    { ...window, start: window.previousStart, end: window.previousEnd },
    opts.metric,
    catalog.memberships,
  );

  const friendDatesByUser = new Map<string, string[]>();
  for (const profile of catalog.profiles) {
    friendDatesByUser.set(profile.id, profileCalendarSelectedDates(parseProfileDetails(profile.details)));
  }
  const availability = availabilityHealth({
    profiles: catalog.profiles,
    pets: catalog.pets,
    friendDatesByUser,
    todayIso: now.toISOString().slice(0, 10),
  });

  const periodPaidUsers = new Set(
    membershipsInWindow(catalog.memberships, window.start, window.end)
      .filter((row) => classifyMembershipChannel(row) === "paid")
      .map((row) => row.user_id),
  );
  const prevPaidUsers = new Set(
    membershipsInWindow(catalog.memberships, window.previousStart, window.previousEnd)
      .filter((row) => classifyMembershipChannel(row) === "paid")
      .map((row) => row.user_id),
  );

  const generatedAt = now.toISOString();
  return {
    range: opts.range,
    metric: opts.metric,
    generatedAt,
    refreshedLabel: relativeTimeLabel(generatedAt, now),
    window: {
      start: window.start.toISOString(),
      end: window.end.toISOString(),
      grain: window.grain,
    },
    kpis: {
      activeUsers: {
        ...kpiWithChange(current.uniqueActiveUsers, previous.uniqueActiveUsers),
        href: "/admin/users",
        spark: dailySeries(facts, window, "active_users").map((p) => p.value),
      },
      newUsers: {
        ...kpiWithChange(current.newSignups, previous.newSignups),
        href: "/admin/users",
        spark: countByBucket(
          facts.signups.map((s) => s.created_at),
          buckets,
          window.grain,
          window.start,
          window.end,
        ).map((p) => p.value),
      },
      requests: {
        ...kpiWithChange(current.requestsSent, previous.requestsSent),
        href: "/admin/requests",
        spark: dailySeries(facts, window, "requests").map((p) => p.value),
      },
      messages: {
        ...kpiWithChange(current.messagesSent, previous.messagesSent),
        href: "/admin/conversations",
        spark: dailySeries(facts, window, "messages").map((p) => p.value),
      },
      bookings: {
        ...kpiWithChange(current.bookingsCreated, previous.bookingsCreated),
        href: "/admin/bookings",
        spark: dailySeries(facts, window, "bookings").map((p) => p.value),
      },
      paidMembers: {
        ...kpiWithChange(periodPaidUsers.size, prevPaidUsers.size),
        href: "#memberships",
        spark: acquisition.map((row) => row.paid),
        revenueLabel: formatEuro(membership.revenueThisPeriod),
      },
    },
    series,
    previousSeries,
    membership: {
      ...membership,
      revenueLabel: formatEuro(membership.revenueThisPeriod),
      revenueNote:
        membership.unknownPaidPlansThisPeriod > 0
          ? `Catalog list prices on paid activations. ${membership.unknownPaidPlansThisPeriod} paid row(s) excluded (unknown plan).`
          : "Catalog list prices on paid activations this period. Not Stripe settlement.",
    },
    acquisition,
    recentPaid: recentPaidMembers(catalog.memberships, names, emails),
    recentAccessCode: recentAccessCodeMembers(
      catalog.memberships,
      catalog.accessCodeRedemptions,
      names,
      emails,
    ),
    funnel: compactSignupFunnel(users, catalog.authUsers),
    pairFunnel: marketplacePairFunnel(catalog),
    health: marketplaceHealthCounts({
      rows: users,
      requests: catalog.requests,
      conversations: catalog.conversations,
      messages: catalog.messages,
      bookings: catalog.bookings,
    }),
    attention: needsAttentionItems({
      rows: users,
      requests: catalog.requests,
      availability,
      now,
    }),
    availability,
    matchmaking: matchmakingSnapshot(catalog),
    activity: overviewActivityFeed({
      profiles: catalog.profiles,
      authUsers: catalog.authUsers,
      pets: catalog.pets,
      requests: catalog.requests,
      messages: catalog.messages,
      bookings: catalog.bookings,
      memberships: catalog.memberships,
      redemptions: catalog.accessCodeRedemptions,
    }),
  };
}
