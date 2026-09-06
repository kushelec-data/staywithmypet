import { AdminShell, AdminTable } from "@/components/admin/AdminUi";
import { countMessagesByConversation } from "@/lib/admin/metrics";
import { loadAdminCatalog } from "@/lib/admin/queries";

export default async function AdminConversationsPage() {
  const catalog = await loadAdminCatalog();
  if (!catalog) {
    return <AdminShell title="Conversations" pathname="/admin/conversations"><p>Unavailable.</p></AdminShell>;
  }
  const names = new Map(catalog.profiles.map((p) => [p.id, p.display_name]));
  const reqById = new Map(catalog.requests.map((r) => [r.id, r]));
  const counts = countMessagesByConversation(catalog.messages);
  const firstLast = new Map<string, { first: string; last: string }>();
  for (const msg of catalog.messages) {
    const cur = firstLast.get(msg.conversation_id);
    if (!cur) firstLast.set(msg.conversation_id, { first: msg.created_at, last: msg.created_at });
    else {
      if (msg.created_at < cur.first) cur.first = msg.created_at;
      if (msg.created_at > cur.last) cur.last = msg.created_at;
    }
  }
  const bookingByRequest = new Set(catalog.bookings.map((b) => b.request_id).filter(Boolean) as string[]);

  return (
    <AdminShell title="Conversations" pathname="/admin/conversations" description="Message counts and timestamps only. Bodies are never loaded.">
      <AdminTable
        empty="No conversations."
        headers={["Pet Parent", "Pet Friend", "Request", "Messages", "First message", "Last message", "Booking"]}
        rows={catalog.conversations.map((conv) => {
          const req = reqById.get(conv.request_id);
          const fl = firstLast.get(conv.id);
          return [
            req ? names.get(req.pet_parent_id) ?? req.pet_parent_id : "—",
            req ? names.get(req.pet_friend_id) ?? req.pet_friend_id : "—",
            conv.request_id.slice(0, 8),
            String(counts.get(conv.id) ?? 0),
            fl?.first.slice(0, 16).replace("T", " ") ?? "—",
            fl?.last.slice(0, 16).replace("T", " ") ?? "—",
            req && bookingByRequest.has(req.id) ? "yes" : "no",
          ];
        })}
      />
    </AdminShell>
  );
}
