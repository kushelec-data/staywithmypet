import { AdminShell, AdminTable } from "@/components/admin/AdminUi";
import { loadAdminCatalog } from "@/lib/admin/queries";
import { isRequestExpired } from "@/lib/request-validation";

const STATUSES = ["pending", "accepted", "declined", "cancelled", "completed", "expired"] as const;

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const catalog = await loadAdminCatalog();
  if (!catalog) {
    return <AdminShell title="Requests" pathname="/admin/requests"><p>Unavailable.</p></AdminShell>;
  }
  const names = new Map(catalog.profiles.map((p) => [p.id, p.display_name]));
  const pets = new Map(catalog.pets.map((p) => [p.id, p.name]));
  const convByRequest = new Set(catalog.conversations.map((c) => c.request_id));
  const bookingByRequest = new Set(catalog.bookings.map((b) => b.request_id).filter(Boolean));

  const rows = catalog.requests.filter((req) => {
    const expired = isRequestExpired({
      status: req.status as "pending",
      date_from: req.date_from ?? null,
      date_to: req.date_to ?? null,
      requested_dates: req.requested_dates ?? [],
    });
    const display = expired && req.status === "pending" ? "expired" : req.status;
    if (!status) return true;
    return display === status;
  });

  return (
    <AdminShell title="Requests" pathname="/admin/requests" description="Canonical request_status plus derived expired (past care dates). Request messages are not shown.">
      <form method="get" className="mb-4">
        <select name="status" defaultValue={status ?? ""} className="rounded-xl border px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button className="ml-2 rounded-full bg-[#2E6B3F] px-3 py-2 text-sm font-semibold text-white" type="submit">Filter</button>
      </form>
      <AdminTable
        empty="No requests."
        headers={["Pet Parent", "Pet Friend", "Pet", "Status", "Created", "Updated", "Conversation", "Booking"]}
        rows={rows.map((req) => {
          const expired = isRequestExpired({
            status: req.status as "pending",
            date_from: req.date_from ?? null,
            date_to: req.date_to ?? null,
            requested_dates: req.requested_dates ?? [],
          });
          const display = expired && req.status === "pending" ? "expired" : req.status;
          return [
            names.get(req.pet_parent_id) ?? req.pet_parent_id,
            names.get(req.pet_friend_id) ?? req.pet_friend_id,
            pets.get(req.pet_id) ?? req.pet_id,
            display,
            req.created_at.slice(0, 16).replace("T", " "),
            (req.updated_at ?? req.created_at).slice(0, 16).replace("T", " "),
            convByRequest.has(req.id) ? "yes" : "no",
            bookingByRequest.has(req.id) ? "yes" : "no",
          ];
        })}
      />
    </AdminShell>
  );
}
