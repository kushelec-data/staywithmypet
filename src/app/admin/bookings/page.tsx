import { AdminCard, AdminShell, AdminTable } from "@/components/admin/AdminUi";
import { loadAdminCatalog } from "@/lib/admin/queries";

export default async function AdminBookingsPage() {
  const catalog = await loadAdminCatalog();
  if (!catalog) {
    return <AdminShell title="Bookings" pathname="/admin/bookings"><p>Unavailable.</p></AdminShell>;
  }
  const names = new Map(catalog.profiles.map((p) => [p.id, p.display_name]));
  const pets = new Map(catalog.pets.map((p) => [p.id, p.name]));
  const summary = {
    upcoming: catalog.bookings.filter((b) => b.status === "upcoming").length,
    active: catalog.bookings.filter((b) => b.status === "active").length,
    completed: catalog.bookings.filter((b) => b.status === "completed").length,
    cancelled: catalog.bookings.filter((b) => b.status === "cancelled").length,
  };

  return (
    <AdminShell title="Bookings" pathname="/admin/bookings">
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.entries(summary).map(([k, v]) => (
          <AdminCard key={k}>
            <p className="text-xs uppercase text-muted">{k}</p>
            <p className="font-heading text-2xl">{v}</p>
          </AdminCard>
        ))}
      </div>
      <AdminTable
        empty="No bookings."
        headers={["Pet Parent", "Pet Friend", "Pet", "Status", "Created", "Start", "End", "Completed"]}
        rows={catalog.bookings.map((b) => [
          names.get(b.pet_parent_id) ?? b.pet_parent_id,
          names.get(b.pet_friend_id) ?? b.pet_friend_id,
          pets.get(b.pet_id) ?? b.pet_id,
          b.status,
          b.created_at.slice(0, 16).replace("T", " "),
          b.start_date ?? "—",
          b.end_date ?? "—",
          b.completed_at?.slice(0, 10) ?? "—",
        ])}
      />
    </AdminShell>
  );
}
