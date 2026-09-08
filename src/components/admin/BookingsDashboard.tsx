import Link from "next/link";
import type { ReactNode } from "react";
import { AnalyticsLineChart, AnalyticsPanel, KpiChange } from "@/components/admin/AnalyticsCharts";
import { AdminPager } from "@/components/admin/AdminUi";
import {
  BOOKINGS_CHART_LABELS,
  BOOKINGS_CHART_METRICS,
  BOOKINGS_RANGE_LABELS,
  BOOKINGS_RANGES,
  formatAdminDate,
  type BookingsChartMetric,
  type BookingsRange,
} from "@/lib/admin/bookings-analytics";

export type BookingsDashboardData = NonNullable<
  Awaited<ReturnType<typeof import("@/lib/admin/bookings-load").buildBookingsDashboardDto>>
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

function Panel({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-[20px] border border-[#E5E2D8] bg-[#F8F6F1] p-4 shadow-[0_8px_24px_rgba(23,51,34,0.04)]">
      <h2 className="font-heading text-base font-semibold">{title}</h2>
      {hint ? <p className="mt-0.5 text-[11px] text-muted">{hint}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    upcoming: "bg-[#DDEEDF] text-[#2E6B3F]",
    active: "bg-[#C3E8D2] text-[#173322]",
    completed: "bg-[#E8F0E4] text-[#3D5A40]",
    cancelled: "bg-[#F3E6E4] text-[#8A3B3B]",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${styles[status] ?? "bg-[#EEE] text-muted"}`}>
      {status}
    </span>
  );
}

function hrefFor(
  range: BookingsRange,
  metric: BookingsChartMetric,
  extra: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();
  params.set("range", range);
  params.set("metric", metric);
  for (const [k, v] of Object.entries(extra)) {
    if (v) params.set(k, v);
  }
  return `/admin/bookings?${params.toString()}`;
}

export function BookingsRangeControls({
  range,
  metric,
  periodLabel,
}: {
  range: BookingsRange;
  metric: BookingsChartMetric;
  periodLabel: string;
}) {
  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        {BOOKINGS_RANGES.map((r) => (
          <Link
            key={r}
            href={hrefFor(r, metric, {})}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              range === r ? "bg-[#2E6B3F] text-white" : "border border-[#E5E2D8] bg-[#F8F6F1] text-[#2E6B3F]"
            }`}
          >
            {BOOKINGS_RANGE_LABELS[r]}
          </Link>
        ))}
      </div>
      <p className="text-[11px] text-muted">{periodLabel}</p>
    </div>
  );
}

export function BookingsDashboard({
  data,
  range,
  metric,
  filters,
}: {
  data: BookingsDashboardData;
  range: BookingsRange;
  metric: BookingsChartMetric;
  filters: {
    q?: string;
    status?: string;
    parent?: string;
    friend?: string;
    pet?: string;
    createdFrom?: string;
    createdTo?: string;
    sort?: string;
    dir?: string;
    page?: number;
  };
}) {
  const keep = {
    q: filters.q,
    status: filters.status,
    parent: filters.parent,
    friend: filters.friend,
    pet: filters.pet,
    createdFrom: filters.createdFrom,
    createdTo: filters.createdTo,
    sort: filters.sort,
    dir: filters.dir,
  };
  const kpis = [
    { key: "created" as const, label: "Bookings created" },
    { key: "upcoming" as const, label: "Upcoming" },
    { key: "active" as const, label: "Active" },
    { key: "completed" as const, label: "Completed" },
    { key: "cancelled" as const, label: "Cancelled" },
  ];
  const maxBar = Math.max(1, ...data.activity.map((r) => r.created + r.completed + r.cancelled));
  const statusTotal = Math.max(1, data.status.total);
  const sortLink = (col: "created" | "start" | "end") => {
    const nextDir = filters.sort === col && filters.dir !== "asc" ? "asc" : "desc";
    return hrefFor(range, metric, { ...keep, sort: col, dir: nextDir, page: "1" });
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        KPI counts are bookings <span className="font-semibold">created</span> in {data.periodLabel}. Status uses the stored booking status.
      </p>

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 xl:grid-cols-6">
        {kpis.map((card) => {
          const kpi = data.kpis[card.key];
          return (
            <div key={card.key} className="min-w-[10.5rem] rounded-[18px] bg-[#173322] p-3.5 text-white shadow-sm sm:min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/55">{card.label}</p>
              <p className="mt-0.5 font-heading text-2xl leading-none">{kpi.current}</p>
              <KpiChange label={kpi.label} direction={kpi.direction} />
              <Sparkline values={kpi.spark} />
            </div>
          );
        })}
        <div className="min-w-[10.5rem] rounded-[18px] bg-[#173322] p-3.5 text-white shadow-sm sm:min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/55">Completion rate</p>
          <p className="mt-0.5 font-heading text-2xl leading-none">{data.kpis.completionRate.display}</p>
          <KpiChange label={data.kpis.completionRate.label} direction={data.kpis.completionRate.direction} />
          <p className="mt-2 text-[11px] text-white/45">Completed / created this period</p>
        </div>
      </div>

      <AnalyticsPanel title="Bookings over time" hint={`Current period solid · previous dashed · ${data.window.grain} buckets`}>
        <div className="mb-3 flex flex-wrap gap-2">
          {BOOKINGS_CHART_METRICS.map((m) => (
            <Link
              key={m}
              href={hrefFor(range, m, keep)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                metric === m ? "bg-[#C3E8D2] text-[#173322]" : "bg-white/10 text-white/80"
              }`}
            >
              {BOOKINGS_CHART_LABELS[m]}
            </Link>
          ))}
        </div>
        <AnalyticsLineChart points={data.series} previousPoints={data.previousSeries} />
      </AnalyticsPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Booking status" hint={`Of ${data.status.total} bookings created in this period`}>
          <div className="mb-3 h-2.5 overflow-hidden rounded-full bg-[#E5E2D8]">
            <div className="flex h-full">
              {data.status.rows.map((row) => (
                <div
                  key={row.status}
                  title={`${row.status} ${row.count}`}
                  className={
                    row.status === "upcoming"
                      ? "bg-[#2E6B3F]"
                      : row.status === "active"
                        ? "bg-[#7CB98A]"
                        : row.status === "completed"
                          ? "bg-[#C3E8D2]"
                          : "bg-[#E8B4B0]"
                  }
                  style={{ width: `${(row.count / statusTotal) * 100}%` }}
                />
              ))}
            </div>
          </div>
          <ul className="space-y-1.5 text-sm">
            {data.status.rows.map((row) => (
              <li key={row.status} className="flex items-center justify-between">
                <span className="capitalize">{row.status}</span>
                <span>
                  {row.count} — {row.percent}%
                </span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Booking conversion" hint="Unique parent / friend / pet relationships">
          <ol className="space-y-2 text-sm">
            {[
              ["Requests", data.conversion.requests],
              ["Accepted requests", data.conversion.accepted],
              ["Bookings", data.conversion.bookings],
              ["Completed bookings", data.conversion.completed],
            ].map(([label, count], i) => (
              <li key={String(label)}>
                <div className="flex justify-between">
                  <span>{label}</span>
                  <span className="font-heading text-lg leading-none">{count}</span>
                </div>
                {i < 3 ? <p className="text-center text-xs text-muted">↓</p> : null}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-muted">
            Request → booking {data.conversion.requestToBooking}% · Booking → completed {data.conversion.bookingToCompleted}%
          </p>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Booking activity" hint="Created / completed / cancelled by timestamp">
          <div className="flex h-32 items-end gap-1">
            {data.activity.map((row) => (
              <div key={row.bucket} className="flex min-w-0 flex-1 flex-col justify-end" title={`${row.bucket}`}>
                <div className="flex h-28 flex-col justify-end overflow-hidden rounded-sm">
                  <div className="bg-[#2E6B3F]" style={{ height: `${(row.created / maxBar) * 100}%` }} />
                  <div className="bg-[#7CB98A]" style={{ height: `${(row.completed / maxBar) * 100}%` }} />
                  <div className="bg-[#E8B4B0]" style={{ height: `${(row.cancelled / maxBar) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted">Green created · mint completed · rose cancelled</p>
        </Panel>
        <Panel title="Upcoming schedule" hint="Next 14 upcoming/active by start date">
          {data.schedule.length === 0 ? (
            <p className="text-sm text-muted">No upcoming bookings with a start date.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-[11px] uppercase text-muted">
                  <tr>
                    <th className="py-1 pr-3">Date</th>
                    <th className="py-1 pr-3">Pet</th>
                    <th className="py-1 pr-3">Parent</th>
                    <th className="py-1 pr-3">Friend</th>
                    <th className="py-1">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.schedule.map((row) => (
                    <tr key={row.id} className="border-t border-[#E5E2D8]">
                      <td className="py-1.5 pr-3">{formatAdminDate(row.start)}</td>
                      <td className="py-1.5 pr-3">{row.pet}</td>
                      <td className="py-1.5 pr-3">{row.parent}</td>
                      <td className="py-1.5 pr-3">{row.friend}</td>
                      <td className="py-1.5">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Panel title="Time to book" hint="Only rows with a linked request_id">
          <p className="text-sm">
            Avg {data.timing.avgLabel ?? "—"} · Median {data.timing.medianLabel ?? "—"}
          </p>
          <p className="mt-1 text-[11px] text-muted">{data.timing.sampleSize} bookings with a request timestamp</p>
        </Panel>
        <Panel title="Booking duration" hint="Only rows with start and end dates">
          <p className="text-sm">
            Avg {data.duration.averageLabel ?? "—"} · Median {data.duration.medianLabel ?? "—"}
          </p>
          <ul className="mt-2 grid grid-cols-2 gap-1 text-xs">
            <li>Same-day {data.duration.buckets.same_day}</li>
            <li>1–2 days {data.duration.buckets["1_2"]}</li>
            <li>3–7 days {data.duration.buckets["3_7"]}</li>
            <li>7+ days {data.duration.buckets["7_plus"]}</li>
          </ul>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Top Pet Parents by bookings">
          <RankTable
            rows={data.topParents.map((r) => ({
              href: `/admin/users/${r.id}`,
              name: r.name,
              bookings: r.bookings,
              completed: r.completed,
              cancelled: r.cancelled,
              last: r.lastBooking,
            }))}
          />
        </Panel>
        <Panel title="Top Pet Friends by bookings">
          <RankTable
            rows={data.topFriends.map((r) => ({
              href: `/admin/users/${r.id}`,
              name: r.name,
              bookings: r.bookings,
              completed: r.completed,
              cancelled: r.cancelled,
              last: r.lastBooking,
            }))}
          />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Most-booked pets">
          {data.topPets.length === 0 ? (
            <p className="text-sm text-muted">No pets in this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-[11px] uppercase text-muted">
                  <tr>
                    <th className="py-1 pr-3">Pet</th>
                    <th className="py-1 pr-3">Parent</th>
                    <th className="py-1 pr-3">Bookings</th>
                    <th className="py-1 pr-3">Completed</th>
                    <th className="py-1">Last booking</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topPets.map((row) => (
                    <tr key={row.id} className="border-t border-[#E5E2D8]">
                      <td className="py-1.5 pr-3">{row.name}</td>
                      <td className="py-1.5 pr-3">{row.parentName}</td>
                      <td className="py-1.5 pr-3">{row.bookings}</td>
                      <td className="py-1.5 pr-3">{row.completed}</td>
                      <td className="py-1.5">{formatAdminDate(row.lastBooking)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        <Panel title="Most active booking pairs">
          {data.topPairs.length === 0 ? (
            <p className="text-sm text-muted">No pairs in this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-[11px] uppercase text-muted">
                  <tr>
                    <th className="py-1 pr-3">Parent</th>
                    <th className="py-1 pr-3">Friend</th>
                    <th className="py-1 pr-3">Bookings</th>
                    <th className="py-1 pr-3">Completed</th>
                    <th className="py-1 pr-3">Cancelled</th>
                    <th className="py-1">Latest</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topPairs.map((row) => (
                    <tr key={`${row.parentId}:${row.friendId}`} className="border-t border-[#E5E2D8]">
                      <td className="py-1.5 pr-3">
                        <Link href={`/admin/users/${row.parentId}`} className="font-semibold text-[#2E6B3F]">
                          {row.parentName}
                        </Link>
                      </td>
                      <td className="py-1.5 pr-3">
                        <Link href={`/admin/users/${row.friendId}`} className="font-semibold text-[#2E6B3F]">
                          {row.friendName}
                        </Link>
                      </td>
                      <td className="py-1.5 pr-3">{row.bookings}</td>
                      <td className="py-1.5 pr-3">{row.completed}</td>
                      <td className="py-1.5 pr-3">{row.cancelled}</td>
                      <td className="py-1.5">{formatAdminDate(row.lastBooking)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Recent booking activity">
        {data.recent.length === 0 ? (
          <p className="text-sm text-muted">No booking events yet.</p>
        ) : (
          <ol className="space-y-2 text-sm">
            {data.recent.map((item) => (
              <li key={`${item.at}-${item.label}`} className="flex gap-3">
                <span className="w-28 shrink-0 text-xs text-muted">{formatAdminDate(item.at)}</span>
                <span>{item.label}</span>
              </li>
            ))}
          </ol>
        )}
      </Panel>

      <Panel title="Bookings table" hint="Click a row for details. Message bodies are never loaded.">
        <details className="mb-4 md:hidden">
          <summary className="cursor-pointer text-sm font-semibold text-[#2E6B3F]">Filters</summary>
          <FilterForm range={range} metric={metric} filters={filters} className="mt-3" />
        </details>
        <div className="mb-4 hidden md:block">
          <FilterForm range={range} metric={metric} filters={filters} />
        </div>
        {data.table.rows.length === 0 ? (
          <p className="text-sm text-muted">No bookings match.</p>
        ) : (
          <div className="overflow-x-auto rounded-[16px] border border-[#E5E2D8]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#DDEEDF] text-[11px] uppercase tracking-wide text-[#2E6B3F]">
                <tr>
                  <th className="px-3 py-2">Parent</th>
                  <th className="px-3 py-2">Friend</th>
                  <th className="px-3 py-2">Pet</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">
                    <Link href={sortLink("created")}>Created</Link>
                  </th>
                  <th className="px-3 py-2">
                    <Link href={sortLink("start")}>Start</Link>
                  </th>
                  <th className="px-3 py-2">
                    <Link href={sortLink("end")}>End</Link>
                  </th>
                  <th className="px-3 py-2">Duration</th>
                  <th className="px-3 py-2">Request</th>
                  <th className="px-3 py-2">Conversation</th>
                  <th className="px-3 py-2">Completed at</th>
                </tr>
              </thead>
              <tbody>
                {data.table.rows.map((row) => (
                  <tr key={row.id} className="border-t border-[#E5E2D8] bg-[#F8F6F1] hover:bg-white">
                    <td className="px-3 py-2">
                      <Link href={`/admin/bookings/${row.id}`} className="font-semibold text-[#2E6B3F]">
                        {row.parent}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/admin/bookings/${row.id}`}>{row.friend}</Link>
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/admin/bookings/${row.id}`}>{row.pet}</Link>
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={row.status} />
                      {row.staleWarning ? (
                        <p className="mt-1 text-[10px] text-[#8A3B3B]">Status may need update</p>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">{formatAdminDate(row.created)}</td>
                    <td className="whitespace-nowrap px-3 py-2">{formatAdminDate(row.start)}</td>
                    <td className="whitespace-nowrap px-3 py-2">{formatAdminDate(row.end)}</td>
                    <td className="px-3 py-2">{row.durationDays == null ? "—" : `${row.durationDays}d`}</td>
                    <td className="px-3 py-2">{row.requestId ? row.requestId.slice(0, 8) : "—"}</td>
                    <td className="px-3 py-2">{row.conversationId ? "yes" : "no"}</td>
                    <td className="whitespace-nowrap px-3 py-2">{formatAdminDate(row.completedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <AdminPager
          page={data.table.page}
          pageSize={data.table.pageSize}
          total={data.table.total}
          href={(p) => hrefFor(range, metric, { ...keep, page: String(p) })}
        />
      </Panel>
    </div>
  );
}

function RankTable({
  rows,
}: {
  rows: Array<{ href: string; name: string; bookings: number; completed: number; cancelled: number; last: string | null }>;
}) {
  if (rows.length === 0) return <p className="text-sm text-muted">None in this period.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="text-[11px] uppercase text-muted">
          <tr>
            <th className="py-1 pr-3">Name</th>
            <th className="py-1 pr-3">Bookings</th>
            <th className="py-1 pr-3">Completed</th>
            <th className="py-1 pr-3">Cancelled</th>
            <th className="py-1">Last booking</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.href} className="border-t border-[#E5E2D8]">
              <td className="py-1.5 pr-3">
                <Link href={row.href} className="font-semibold text-[#2E6B3F]">
                  {row.name}
                </Link>
              </td>
              <td className="py-1.5 pr-3">{row.bookings}</td>
              <td className="py-1.5 pr-3">{row.completed}</td>
              <td className="py-1.5 pr-3">{row.cancelled}</td>
              <td className="py-1.5">{formatAdminDate(row.last)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FilterForm({
  range,
  metric,
  filters,
  className = "",
}: {
  range: BookingsRange;
  metric: BookingsChartMetric;
  filters: {
    q?: string;
    status?: string;
    parent?: string;
    friend?: string;
    pet?: string;
    createdFrom?: string;
    createdTo?: string;
  };
  className?: string;
}) {
  return (
    <form method="get" className={`grid grid-cols-2 gap-2 text-sm md:grid-cols-4 lg:grid-cols-7 ${className}`}>
      <input type="hidden" name="range" value={range} />
      <input type="hidden" name="metric" value={metric} />
      <input name="q" defaultValue={filters.q ?? ""} placeholder="Search name/email/pet" className="rounded-xl border border-[#E5E2D8] px-3 py-2" />
      <select name="status" defaultValue={filters.status ?? ""} className="rounded-xl border border-[#E5E2D8] px-3 py-2">
        <option value="">All statuses</option>
        <option value="upcoming">Upcoming</option>
        <option value="active">Active</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
      <input name="parent" defaultValue={filters.parent ?? ""} placeholder="Parent" className="rounded-xl border border-[#E5E2D8] px-3 py-2" />
      <input name="friend" defaultValue={filters.friend ?? ""} placeholder="Friend" className="rounded-xl border border-[#E5E2D8] px-3 py-2" />
      <input name="pet" defaultValue={filters.pet ?? ""} placeholder="Pet" className="rounded-xl border border-[#E5E2D8] px-3 py-2" />
      <input type="date" name="createdFrom" defaultValue={filters.createdFrom ?? ""} className="rounded-xl border border-[#E5E2D8] px-3 py-2" />
      <input type="date" name="createdTo" defaultValue={filters.createdTo ?? ""} className="rounded-xl border border-[#E5E2D8] px-3 py-2" />
      <button type="submit" className="rounded-full bg-[#2E6B3F] px-4 py-2 font-semibold text-white">
        Filter
      </button>
    </form>
  );
}
