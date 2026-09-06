import { AdminCard, AdminShell } from "@/components/admin/AdminUi";
import {
  buildAdminUserRows,
  funnelCounts,
  overviewFromUserRows,
} from "@/lib/admin/aggregates";
import { loadAdminCatalog } from "@/lib/admin/queries";
import { INTERACTION_LEVEL_HELP } from "@/lib/admin/metrics";

export default async function AdminOverviewPage() {
  const catalog = await loadAdminCatalog();
  if (!catalog) {
    return (
      <AdminShell title="Admin" pathname="/admin" description="Service role is not configured on this server.">
        <p className="text-sm text-muted">Cannot load admin data.</p>
      </AdminShell>
    );
  }
  const users = buildAdminUserRows(catalog);
  const overview = overviewFromUserRows(users, catalog);
  const funnel = funnelCounts(users, catalog.authUsers);
  const cards: Array<[string, number]> = [
    ["Total users", overview.totalUsers],
    ["New users 7d", overview.newUsers7d],
    ["New users 30d", overview.newUsers30d],
    ["Role not chosen", overview.roleNotChosen],
    ["Profile incomplete", overview.profileIncomplete],
    ["Ready users", overview.readyUsers],
    ["Requests", overview.requests],
    ["Pending requests", overview.pendingRequests],
    ["Messages", overview.messages],
    ["Conversations", overview.conversations],
    ["Bookings", overview.bookings],
    ["Active bookings", overview.activeBookings],
    ["Completed bookings", overview.completedBookings],
    ["Match suggestions", overview.matchSuggestions],
  ];

  return (
    <AdminShell
      title="Admin overview"
      pathname="/admin"
      description="Counts from canonical tables. Historical page views are not available until activity tracking is deployed."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <AdminCard key={label}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
            <p className="mt-1 font-heading text-2xl text-foreground">{value}</p>
          </AdminCard>
        ))}
      </div>
      <h2 className="mt-10 font-heading text-xl font-semibold">Funnel</h2>
      <p className="mt-1 text-sm text-muted">Unique users at each stage. Percent of signed-up users.</p>
      <ol className="mt-4 space-y-2">
        {funnel.map((step) => (
          <li key={step.step} className="flex items-center justify-between rounded-xl border border-[#E5E2D8] bg-[#F8F6F1] px-4 py-3">
            <span className="font-medium">{step.step}</span>
            <span className="text-sm text-muted">
              {step.count} · {step.percent}%
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-xs text-muted" title={INTERACTION_LEVEL_HELP}>
        Stuck stages on user rows are derived from existing records (email, role, profile, requests, chat, bookings). They are not psychological diagnoses.
      </p>
    </AdminShell>
  );
}
