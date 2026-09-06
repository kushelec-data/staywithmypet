import { AdminPager, AdminShell, AdminTable } from "@/components/admin/AdminUi";
import { ADMIN_PAGE_SIZE, paginateRows } from "@/lib/admin/aggregates";
import { loadActivityEvents, loadAdminCatalog } from "@/lib/admin/queries";

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Number(sp.page ?? "1") || 1;
  const catalog = await loadAdminCatalog();
  const names = new Map((catalog?.profiles ?? []).map((p) => [p.id, p.display_name]));
  const { items, total } = await loadActivityEvents(page, ADMIN_PAGE_SIZE);

  return (
    <AdminShell
      title="Activity"
      pathname="/admin/activity"
      description="Future first-party events (page views and product actions) appear here after tracking is live. Historical reconstructions stay on other admin pages. Page views require analytics cookie consent."
    >
      <AdminTable
        empty="No tracked events yet. Canonical history is on Users, Requests, Conversations, and Bookings."
        headers={["When", "User", "Event", "Entity", "Path"]}
        rows={items.map((row) => [
          String(row.created_at).slice(0, 16).replace("T", " "),
          names.get(String(row.user_id)) ?? String(row.user_id ?? "—"),
          String(row.event_type),
          row.entity_type ? `${row.entity_type}:${String(row.entity_id ?? "").slice(0, 8)}` : "—",
          String(row.page_path ?? "—"),
        ])}
      />
      <AdminPager page={page} pageSize={ADMIN_PAGE_SIZE} total={total} href={(p) => `/admin/activity?page=${p}`} />
    </AdminShell>
  );
}
