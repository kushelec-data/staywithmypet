import Link from "next/link";
import type { ReactNode } from "react";
import { AnalyticsLineChart, AnalyticsPanel, KpiChange } from "@/components/admin/AnalyticsCharts";
import { AdminTable } from "@/components/admin/AdminUi";
import {
  OVERVIEW_CHART_LABELS,
  OVERVIEW_CHART_METRICS,
  OVERVIEW_RANGE_LABELS,
  OVERVIEW_RANGES,
  type OverviewChartMetric,
  type OverviewRange,
} from "@/lib/admin/overview";

export type OverviewDashboardData = NonNullable<
  Awaited<ReturnType<typeof import("@/lib/admin/overview-load").buildOverviewDashboardDto>>
>;

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 72;
  const h = 22;
  const max = Math.max(1, ...values);
  const denom = Math.max(1, values.length - 1);
  const d = values
    .map((v, i) => {
      const x = (i / denom) * w;
      const y = h - (v / max) * (h - 2) - 1;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-5 w-[4.5rem]" aria-hidden>
      <path d={d} fill="none" stroke="rgba(195,232,210,0.9)" strokeWidth={1.5} />
    </svg>
  );
}

function Panel({
  title,
  action,
  children,
  id,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="rounded-[20px] border border-[#E5E2D8] bg-[#F8F6F1] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-heading text-base font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function formatWhen(iso: string, grain: "hour" | "day") {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16).replace("T", " ");
  if (grain === "hour") {
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  }
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OverviewDashboard({
  data,
  range,
  metric,
}: {
  data: OverviewDashboardData;
  range: OverviewRange;
  metric: OverviewChartMetric;
}) {
  const hrefFor = (next: { range?: string; metric?: string }) => {
    const params = new URLSearchParams();
    params.set("range", next.range ?? range);
    params.set("metric", next.metric ?? metric);
    return `/admin?${params.toString()}`;
  };

  const kpis = [
    { key: "activeUsers", label: "Active users", extra: null as string | null },
    { key: "newUsers", label: "New users", extra: null },
    { key: "requests", label: "Requests", extra: null },
    { key: "messages", label: "Messages", extra: null },
    { key: "bookings", label: "Bookings", extra: null },
    { key: "paidMembers", label: "Paid members", extra: data.kpis.paidMembers.revenueLabel },
  ] as const;

  const paidShare = data.membership.paidMemberships;
  const accessShare = data.membership.accessCodeMemberships;
  const splitTotal = Math.max(1, paidShare + accessShare);
  const biggest = data.funnel.largestDropoff;
  const maxAcq = Math.max(1, ...data.acquisition.map((r) => r.paid + r.accessCode));

  return (
    <div className="space-y-4">
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 xl:grid-cols-6">
        {kpis.map((card) => {
          const kpi = data.kpis[card.key];
          return (
            <Link
              key={card.key}
              href={kpi.href}
              className="min-w-[10.5rem] rounded-[18px] bg-[#173322] p-3.5 text-white transition hover:bg-[#1d3d29] sm:min-w-0"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/55">{card.label}</p>
              <p className="mt-0.5 font-heading text-2xl leading-none">{kpi.current}</p>
              <KpiChange label={kpi.label} direction={kpi.direction} />
              {card.extra ? <p className="text-[11px] text-white/55">{card.extra}</p> : null}
              <Sparkline values={kpi.spark} />
            </Link>
          );
        })}
      </div>

      <AnalyticsPanel title="Marketplace activity">
        <div className="mb-3 flex flex-wrap gap-2">
          {OVERVIEW_CHART_METRICS.map((m) => (
            <Link
              key={m}
              href={hrefFor({ metric: m })}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                metric === m ? "bg-[#C3E8D2] text-[#173322]" : "bg-white/10 text-white/80"
              }`}
            >
              {OVERVIEW_CHART_LABELS[m]}
            </Link>
          ))}
        </div>
        <AnalyticsLineChart points={data.series} previousPoints={data.previousSeries} />
        <p className="mt-2 text-xs text-white/45">
          {data.window.grain === "hour" ? "Hourly (UTC) for today." : "Daily totals."} Dashed line is the previous period.
        </p>
      </AnalyticsPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel id="memberships" title="Memberships">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <div className="flex justify-between gap-2"><dt className="text-muted">Paid memberships</dt><dd>{data.membership.paidMemberships}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted">Access-code</dt><dd>{data.membership.accessCodeMemberships}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted">Active</dt><dd>{data.membership.activeMemberships}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted">New paid</dt><dd>{data.membership.newPaidThisPeriod}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted">New access-code</dt><dd>{data.membership.newAccessCodeThisPeriod}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted">Revenue</dt><dd>{data.membership.revenueLabel}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted">Subscriptions</dt><dd>{data.membership.activeSubscriptions}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted">One-time</dt><dd>{data.membership.oneTimePurchases}</dd></div>
          </dl>
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[11px] font-semibold uppercase tracking-wide text-muted">
              <span>Paid {paidShare}</span>
              <span>Access code {accessShare}</span>
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-[#E5E2D8]">
              <div className="bg-[#2E6B3F]" style={{ width: `${(paidShare / splitTotal) * 100}%` }} />
              <div className="bg-[#C3E8D2]" style={{ width: `${(accessShare / splitTotal) * 100}%` }} />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted">{data.membership.revenueNote}</p>
        </Panel>

        <Panel title="Marketplace health">
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between">
              <span>Profiles ready</span>
              <span className="font-semibold">
                {data.health.profilesReady} / {data.health.totalUsers}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span>Pending requests</span>
              <span className="font-semibold">{data.health.pendingRequests}</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Active conversations</span>
              <span className="font-semibold">{data.health.activeConversations}</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Active bookings</span>
              <span className="font-semibold">{data.health.activeBookings}</span>
            </li>
          </ul>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Recent paid members"
          action={
            <a href="#memberships" className="text-xs font-semibold text-[#2E6B3F]">
              View all →
            </a>
          }
        >
          <AdminTable
            empty="No paid memberships recorded."
            headers={["Name", "Email", "Role", "Plan", "Amount", "Payment type", "Activated", "Status"]}
            rows={data.recentPaid.map((row) => [
              row.name,
              row.email ?? "—",
              row.role,
              row.plan,
              row.amount ?? "—",
              row.paymentType,
              row.activated?.slice(0, 10) ?? "—",
              row.status,
            ])}
          />
        </Panel>
        <Panel title="Recent access code activations">
          <AdminTable
            empty="No access-code memberships with a stored source."
            headers={["Name", "Email", "Role", "Access code", "Activated", "Expiry / status"]}
            rows={data.recentAccessCode.map((row) => [
              row.name,
              row.email ?? "—",
              row.role,
              row.accessCodeDisplay ?? "Access code",
              row.activated?.slice(0, 10) ?? "—",
              `${row.expiry?.slice(0, 10) ?? "—"} · ${row.status}`,
            ])}
          />
          <p className="mt-2 text-[11px] text-muted">
            Code values appear only when a redemption row exists. Older rows with no source are not guessed as access-code.
          </p>
        </Panel>
      </div>

      <Panel title="Membership acquisition">
        <div className="flex h-28 items-end gap-1">
          {data.acquisition.map((row) => (
            <div key={row.bucket} className="flex min-w-0 flex-1 flex-col justify-end" title={`${row.bucket}: paid ${row.paid}, access ${row.accessCode}`}>
              <div className="flex h-24 flex-col justify-end overflow-hidden rounded-sm">
                <div className="bg-[#2E6B3F]" style={{ height: `${(row.paid / maxAcq) * 100}%` }} />
                <div className="bg-[#A7D4B4]" style={{ height: `${(row.accessCode / maxAcq) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted">Stacked by day (or hour for Today): paid vs access code.</p>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Funnel"
          action={
            <Link href="/admin/analytics" className="text-xs font-semibold text-[#2E6B3F]">
              View full funnel →
            </Link>
          }
        >
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
            {data.funnel.rows.map((step, i) => (
              <li key={step.step} className="flex items-center gap-2">
                <span className="rounded-lg border border-[#E5E2D8] bg-white px-2.5 py-1.5">
                  <span className="block text-[10px] uppercase text-muted">{step.step}</span>
                  <span className="font-heading text-lg leading-none">{step.count}</span>
                  {i > 0 ? <span className="ml-1 text-[10px] text-muted">{step.fromPrev}%</span> : null}
                </span>
                {i < data.funnel.rows.length - 1 ? <span className="text-muted">↓</span> : null}
              </li>
            ))}
          </ol>
          {biggest ? (
            <p className="mt-3 rounded-lg bg-[#F3E6E4] px-3 py-2 text-xs text-[#8A3B3B]">
              Biggest drop: {biggest.from} → {biggest.to} ({biggest.conversion}% conversion)
            </p>
          ) : null}
        </Panel>
        <Panel title="Needs attention">
          {data.attention.length === 0 ? (
            <p className="text-sm text-muted">No attention items right now.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.attention.map((item) => (
                <li key={item.key}>
                  <Link href={item.href} className="font-medium text-[#2E6B3F] hover:underline">
                    ⚠ {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="What happened today?"
          action={
            <Link href="/admin/activity" className="text-xs font-semibold text-[#2E6B3F]">
              View all activity →
            </Link>
          }
        >
          <ol className="space-y-2 text-sm">
            {data.activity.map((item) => (
              <li key={`${item.at}-${item.label}`} className="flex gap-3">
                <span className="w-12 shrink-0 text-xs text-muted">{formatWhen(item.at, "hour")}</span>
                <span>{item.label}</span>
              </li>
            ))}
          </ol>
        </Panel>
        <Panel
          title="Weekly matchmaking"
          action={
            <Link href="/admin/matches" className="text-xs font-semibold text-[#2E6B3F]">
              View matches →
            </Link>
          }
        >
          {data.matchmaking.hasProductionRun ? (
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Last run</dt><dd>{data.matchmaking.lastRun?.slice(0, 16).replace("T", " ")}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Suggestions</dt><dd>{data.matchmaking.suggestions}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Recipients</dt><dd>{data.matchmaking.recipients}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Viewed</dt><dd>{data.matchmaking.viewed}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Clicked</dt><dd>{data.matchmaking.clicked}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Requests from matches</dt><dd>{data.matchmaking.requestsFromMatches}</dd></div>
            </dl>
          ) : (
            <p className="text-sm text-muted">No production run yet</p>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Availability"
          action={
            <Link href="/admin/users?availability=expired" className="text-xs font-semibold text-[#2E6B3F]">
              Review availability →
            </Link>
          }
        >
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase text-muted">Friend calendars</p>
              <p>{data.availability.friends.future} active</p>
              <p>{data.availability.friends.expired} expired</p>
              <p>{data.availability.friends.missing} missing</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted">Pets</p>
              <p>{data.availability.pets.future} active</p>
              <p>{data.availability.pets.expired + data.availability.pets.missing} missing/expired</p>
            </div>
          </div>
        </Panel>
        <Panel title="Request → chat → booking">
          <ol className="flex flex-wrap items-center gap-2 text-sm">
            {data.pairFunnel.rows.map((step, i) => (
              <li key={step.step} className="flex items-center gap-2">
                <span className="rounded-lg bg-white px-2 py-1">
                  <span className="block text-[10px] uppercase text-muted">{step.step}</span>
                  <span className="font-heading text-lg">{step.count}</span>
                  {i > 0 ? <span className="ml-1 text-[10px] text-muted">{step.fromPrev}%</span> : null}
                </span>
                {i < data.pairFunnel.rows.length - 1 ? <span className="text-muted">→</span> : null}
              </li>
            ))}
          </ol>
          <p className="mt-2 text-[11px] text-muted">
            Percentages use unique parent/friend pairs. Raw messages this snapshot: {data.pairFunnel.rawMessages} (volume, not a funnel population).
          </p>
        </Panel>
      </div>
    </div>
  );
}

export function OverviewRangeControls({
  range,
  metric,
  refreshedLabel,
}: {
  range: OverviewRange;
  metric: OverviewChartMetric;
  refreshedLabel: string;
}) {
  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        {OVERVIEW_RANGES.map((r) => (
          <Link
            key={r}
            href={`/admin?range=${r}&metric=${metric}`}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              range === r ? "bg-[#2E6B3F] text-white" : "border border-[#E5E2D8] bg-[#F8F6F1] text-[#2E6B3F]"
            }`}
          >
            {OVERVIEW_RANGE_LABELS[r]}
          </Link>
        ))}
      </div>
      <p className="text-[11px] text-muted">{refreshedLabel}</p>
    </div>
  );
}
