import Link from "next/link";
import { AdminShell, AdminTable } from "@/components/admin/AdminUi";
import { AnalyticsLineChart, AnalyticsPanel, KpiChange } from "@/components/admin/AnalyticsCharts";
import {
  ANALYTICS_CHART_LABELS,
  ANALYTICS_CHART_METRICS,
  ANALYTICS_RANGE_LABELS,
  ANALYTICS_RANGES,
} from "@/lib/admin/analytics";
import { analyticsQueryFromSearch, buildAnalyticsDashboardDto } from "@/lib/admin/analytics-load";

const KPI_ORDER = [
  { key: "uniqueActiveUsers", label: "Unique Active Users" },
  { key: "pageViews", label: "Page Views" },
  { key: "newSignups", label: "New Signups" },
  { key: "requestsSent", label: "Requests Sent" },
  { key: "messagesSent", label: "Messages Sent" },
  { key: "bookingsCreated", label: "Bookings Created" },
  { key: "completedBookings", label: "Completed Bookings" },
  { key: "matchInteractions", label: "Match Interactions" },
] as const;

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; metric?: string }>;
}) {
  const sp = await searchParams;
  const { range, metric } = analyticsQueryFromSearch(sp);
  const data = await buildAnalyticsDashboardDto({ range, metric });

  if (!data) {
    return (
      <AdminShell title="Activity Analytics" pathname="/admin/analytics">
        <p className="text-sm text-muted">Service role is not configured.</p>
      </AdminShell>
    );
  }

  const hrefFor = (next: { range?: string; metric?: string }) => {
    const params = new URLSearchParams();
    params.set("range", next.range ?? range);
    params.set("metric", next.metric ?? metric);
    return `/admin/analytics?${params.toString()}`;
  };

  return (
    <AdminShell
      title="Activity Analytics"
      pathname="/admin/analytics"
      description="Canonical tables power requests, messages, bookings, and signups. Page views and retention need user_activity_events after tracking is live — older dates are not invented."
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <div className="flex flex-wrap gap-2">
          {ANALYTICS_RANGES.map((r) => (
            <Link
              key={r}
              href={hrefFor({ range: r })}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                range === r ? "bg-[#2E6B3F] text-white" : "border border-[#E5E2D8] bg-[#F8F6F1] text-[#2E6B3F]"
              }`}
            >
              {ANALYTICS_RANGE_LABELS[r]}
            </Link>
          ))}
        </div>
      </div>

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
        {KPI_ORDER.map((card) => {
          const kpi = data.kpis[card.key];
          return (
            <div key={card.key} className="min-w-[11rem] rounded-[20px] bg-[#173322] p-4 text-white sm:min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">{card.label}</p>
              <p className="mt-1 font-heading text-3xl">{kpi.current}</p>
              <KpiChange label={kpi.label} direction={kpi.direction} />
              <p className="mt-1 text-[11px] text-white/40">prev {kpi.previous}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <AnalyticsPanel title="Daily activity">
          <div className="mb-3 flex flex-wrap gap-2">
            {ANALYTICS_CHART_METRICS.map((m) => (
              <Link
                key={m}
                href={hrefFor({ metric: m })}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  metric === m ? "bg-[#C3E8D2] text-[#173322]" : "bg-white/10 text-white/80"
                }`}
              >
                {ANALYTICS_CHART_LABELS[m]}
              </Link>
            ))}
          </div>
          <AnalyticsLineChart points={data.series} />
          <p className="mt-2 text-xs text-white/45">
            {data.window.grain === "hour" ? "Hourly (UTC) for today." : "Daily totals."} Active users union canonical + tracking events without double-counting a user in the same bucket.
          </p>
        </AnalyticsPanel>
        <AnalyticsPanel title="Activity today">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-white/60">Users active</dt><dd>{data.today.uniqueActiveUsers}</dd></div>
            <div className="flex justify-between"><dt className="text-white/60">Requests</dt><dd>{data.today.requestsSent}</dd></div>
            <div className="flex justify-between"><dt className="text-white/60">Messages</dt><dd>{data.today.messagesSent}</dd></div>
            <div className="flex justify-between"><dt className="text-white/60">Bookings</dt><dd>{data.today.bookingsCreated}</dd></div>
            <div className="flex justify-between"><dt className="text-white/60">New users</dt><dd>{data.today.newSignups}</dd></div>
          </dl>
          <p className="mt-4 text-xs text-white/45">
            Last meaningful action: {data.today.lastAction ? data.today.lastAction.slice(0, 16).replace("T", " ") : "—"}
          </p>
          <p className="mt-3 text-xs text-white/45">
            DAU {data.dau.daily} · 7-day avg {data.dau.avg7}
            {data.dau.active30d != null ? ` · 30-day active ${data.dau.active30d}` : ""}
          </p>
        </AnalyticsPanel>
      </div>

      <div className="mt-6">
        <AnalyticsPanel title="Activity overview" hint="Canonical counts by day. Profile completions only from tracking events.">
          <AdminTable
            empty="No days in range."
            headers={[
              "Date",
              "Active users",
              "New users",
              "Profile completions",
              "Pets created",
              "Requests sent",
              "Messages sent",
              "Bookings created",
              "Bookings completed",
              "Matches viewed",
              "Matches clicked",
            ]}
            rows={data.daily.map((row) => [
              row.date,
              String(row.activeUsers),
              String(row.newUsers),
              String(row.profileCompletions),
              String(row.petsCreated),
              String(row.requestsSent),
              String(row.messagesSent),
              String(row.bookingsCreated),
              String(row.bookingsCompleted),
              String(row.matchesViewed),
              String(row.matchesClicked),
            ])}
          />
        </AnalyticsPanel>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <AnalyticsPanel
          title="Top pages"
          hint={
            data.pageViewsAvailable
              ? "From user_activity_events page_view (analytics consent)."
              : "Historical page views only exist after activity tracking. Nothing is invented for earlier dates."
          }
        >
          {data.topPages.length === 0 ? (
            <p className="text-sm text-white/60">No page views in this range.</p>
          ) : (
            <AdminTable
              empty="No page views."
              headers={["Page", "Views", "Unique users", "% traffic"]}
              rows={data.topPages.map((p) => [p.page, String(p.views), String(p.uniqueUsers), `${p.percent}%`])}
            />
          )}
        </AnalyticsPanel>
        <AnalyticsPanel title="Marketplace activity" hint="Requests, messages, bookings, and matches from canonical tables — not duplicated from activity events.">
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(data.marketplace).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2 rounded-xl bg-white/5 px-3 py-2">
                <dt className="text-white/60">{k.replace(/[A-Z]/g, (ch) => ` ${ch.toLowerCase()}`)}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </AnalyticsPanel>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <AnalyticsPanel title="Funnel" hint="Current database snapshot, not limited to the date range.">
          {data.funnel.largestDropoff ? (
            <p className="mb-3 rounded-xl bg-white/10 px-3 py-2 text-sm">
              Largest drop-off: {data.funnel.largestDropoff.from} → {data.funnel.largestDropoff.to} ({data.funnel.largestDropoff.conversion}% conversion)
            </p>
          ) : null}
          <ol className="space-y-2 text-sm">
            {data.funnel.rows.map((step) => (
              <li key={step.step} className="flex items-center justify-between gap-2">
                <span>{step.step}</span>
                <span className="text-white/60">
                  {step.count} · {step.fromPrev}% prev · {step.fromSignup}% signup
                </span>
              </li>
            ))}
          </ol>
        </AnalyticsPanel>
        <AnalyticsPanel title="Most active users">
          <AdminTable
            empty="No user activity in this range."
            headers={["Name", "Email", "Role", "Last active", "Pages", "Listings", "Requests", "Messages", "Bookings", "Matches", "Total"]}
            rows={data.leaderboard.map((u) => [
              <Link key={u.userId} href={`/admin/users/${u.userId}`} className="font-semibold text-[#2E6B3F]">
                {u.name}
              </Link>,
              u.email ?? "—",
              u.role,
              u.lastActive?.slice(0, 16).replace("T", " ") ?? "—",
              String(u.pagesViewed),
              String(u.listingsViewed),
              String(u.requests),
              String(u.messages),
              String(u.bookings),
              String(u.matchInteractions),
              String(u.total),
            ])}
          />
        </AnalyticsPanel>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <AnalyticsPanel title="Most active relationships" hint="Very High = completed booking. High = booking. Medium = messages. Low = request only. Very Low = conversation only.">
          <AdminTable
            empty="No pairs with activity in this range."
            headers={["Pet Parent", "Pet Friend", "Requests", "Messages", "Bookings", "Completed", "Last", "Level"]}
            rows={data.relationships.map((r) => [
              r.petParentName,
              r.petFriendName,
              String(r.requests),
              String(r.messages),
              String(r.bookings),
              String(r.completedBookings),
              r.lastInteraction?.slice(0, 16).replace("T", " ") ?? "—",
              r.activityLevel,
            ])}
          />
        </AnalyticsPanel>
        <AnalyticsPanel title="Top events" hint="From user_activity_events only. Canonical request/message/booking totals are in Marketplace, not duplicated here.">
          {data.topEvents.length === 0 ? (
            <p className="text-sm text-white/60">No tracked events in this range.</p>
          ) : (
            <AdminTable
              empty="No events."
              headers={["Event", "Users", "Total", "%"]}
              rows={data.topEvents.map((e) => [e.event, String(e.users), String(e.total), `${e.percent}%`])}
            />
          )}
        </AnalyticsPanel>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <AnalyticsPanel title="Returning users">
          {data.retention.available ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-white/60">Users with tracking events</dt><dd>{data.retention.users}</dd></div>
              <div className="flex justify-between"><dt className="text-white/60">Active only once</dt><dd>{data.retention.activeOnlyOnce}</dd></div>
              <div className="flex justify-between"><dt className="text-white/60">Active on multiple days</dt><dd>{data.retention.activeMultipleDays}</dd></div>
              <div className="flex justify-between"><dt className="text-white/60">1 day</dt><dd>{data.retention.buckets.one}</dd></div>
              <div className="flex justify-between"><dt className="text-white/60">2–3 days</dt><dd>{data.retention.buckets.twoToThree}</dd></div>
              <div className="flex justify-between"><dt className="text-white/60">4–7 days</dt><dd>{data.retention.buckets.fourToSeven}</dd></div>
            </dl>
          ) : (
            <p className="text-sm text-white/60">{data.retention.reason}</p>
          )}
        </AnalyticsPanel>
        <AnalyticsPanel title="Devices & referrers">
          <p className="text-sm text-white/60">{data.deviceNote}</p>
          <p className="mt-2 text-sm text-white/60">{data.utmNote}</p>
        </AnalyticsPanel>
      </div>

      <div className="mt-6">
        <AnalyticsPanel title="Recent activity" hint="No message bodies, addresses, tokens, or payment details.">
          <ol className="space-y-2 text-sm">
            {data.recent.map((item) => (
              <li key={`${item.at}-${item.label}`} className="flex gap-3">
                <span className="shrink-0 font-medium text-white/70">{item.at.slice(11, 16) || item.at.slice(0, 16)}</span>
                <span>{item.label}</span>
              </li>
            ))}
          </ol>
        </AnalyticsPanel>
      </div>
    </AdminShell>
  );
}
