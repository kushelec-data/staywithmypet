import { AdminShell } from "@/components/admin/AdminUi";
import { OverviewDashboard, OverviewRangeControls } from "@/components/admin/OverviewDashboard";
import { buildOverviewDashboardDto, overviewQueryFromSearch } from "@/lib/admin/overview-load";

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; metric?: string }>;
}) {
  const sp = await searchParams;
  const { range, metric } = overviewQueryFromSearch(sp);
  const data = await buildOverviewDashboardDto({ range, metric });

  if (!data) {
    return (
      <AdminShell title="Admin Overview" pathname="/admin" description="Marketplace health and activity">
        <p className="text-sm text-muted">Service role is not configured on this server.</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Admin Overview"
      pathname="/admin"
      description="Marketplace health and activity"
      actions={<OverviewRangeControls range={range} metric={metric} refreshedLabel={data.refreshedLabel} />}
    >
      <OverviewDashboard data={data} range={range} metric={metric} />
    </AdminShell>
  );
}
