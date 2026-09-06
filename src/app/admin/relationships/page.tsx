import { AdminShell, AdminTable } from "@/components/admin/AdminUi";
import { buildRelationshipRows } from "@/lib/admin/aggregates";
import { INTERACTION_LEVEL_HELP } from "@/lib/admin/metrics";
import { loadAdminCatalog } from "@/lib/admin/queries";

export default async function AdminRelationshipsPage() {
  const catalog = await loadAdminCatalog();
  if (!catalog) {
    return <AdminShell title="Relationships" pathname="/admin/relationships"><p>Unavailable.</p></AdminShell>;
  }
  const rows = buildRelationshipRows(catalog);
  return (
    <AdminShell
      title="Relationships"
      pathname="/admin/relationships"
      description={INTERACTION_LEVEL_HELP}
    >
      <AdminTable
        empty="No parent–friend pairs yet."
        headers={[
          "Pet Parent",
          "Pet Friend",
          "Pets",
          "Requests",
          "Accepted",
          "Declined/cancelled",
          "Conversations",
          "Messages",
          "Bookings",
          "Completed",
          "First",
          "Last",
          "Level",
        ]}
        rows={rows.map((row) => [
          row.petParentName,
          row.petFriendName,
          row.petsInvolved.join(", ") || "—",
          String(row.requests),
          String(row.acceptedRequests),
          String(row.declinedOrCancelled),
          String(row.conversations),
          String(row.messageCount),
          String(row.bookings),
          String(row.completedBookings),
          row.firstInteraction?.slice(0, 16).replace("T", " ") ?? "—",
          row.lastInteraction?.slice(0, 16).replace("T", " ") ?? "—",
          row.interactionLevel,
        ])}
      />
    </AdminShell>
  );
}
