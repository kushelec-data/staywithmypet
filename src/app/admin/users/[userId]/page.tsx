import { notFound } from "next/navigation";
import { AdminCard, AdminShell } from "@/components/admin/AdminUi";
import { buildAdminUserRows, buildUserTimeline } from "@/lib/admin/aggregates";
import { loadAdminCatalog } from "@/lib/admin/queries";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const catalog = await loadAdminCatalog();
  if (!catalog) notFound();
  const users = buildAdminUserRows(catalog);
  const user = users.find((u) => u.id === userId);
  if (!user) notFound();
  const timeline = buildUserTimeline({ userId, ...catalog });
  const pets = catalog.pets.filter((p) => p.owner_id === userId);
  const requests = catalog.requests.filter((r) => r.pet_parent_id === userId || r.pet_friend_id === userId);
  const conversations = catalog.conversations.filter((c) =>
    requests.some((r) => r.id === c.request_id),
  );
  const bookings = catalog.bookings.filter((b) => b.pet_parent_id === userId || b.pet_friend_id === userId);
  const matches = catalog.matches.filter((m) => m.pet_parent_id === userId || m.pet_friend_id === userId);
  const favorites = catalog.favorites.filter((f) => f.user_id === userId);
  const notifications = catalog.notifications.filter((n) => n.user_id === userId);

  return (
    <AdminShell title={user.name} pathname="/admin/users" description={`${user.email ?? "No email"} · ${user.role}`}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Signup", user.signupDate?.slice(0, 10) ?? "—"],
          ["Last login", user.lastLogin?.slice(0, 16).replace("T", " ") ?? "—"],
          ["Completion", `${user.profileCompletion}%`],
          ["Visibility", user.profilePublic ? "public" : "private"],
          ["Pets", String(user.petCount)],
          ["Membership", user.membershipStatus],
          ["Funnel", user.funnelStage],
          ["Mode", user.currentMode],
        ].map(([k, v]) => (
          <AdminCard key={k}>
            <p className="text-xs uppercase text-muted">{k}</p>
            <p className="mt-1 text-sm font-medium">{v}</p>
          </AdminCard>
        ))}
      </div>

      <section className="mt-8 space-y-6">
        <AdminCard>
          <h2 className="font-heading text-lg">Profile</h2>
          <p className="mt-2 text-sm text-muted">Role chosen: {user.roleChosen ? "yes" : "no"} · Marketplace ready: {user.marketplaceReady ? "yes" : "no"}</p>
        </AdminCard>
        <AdminCard>
          <h2 className="font-heading text-lg">Pets</h2>
          <ul className="mt-2 text-sm">{pets.length ? pets.map((p) => <li key={p.id}>{p.name}</li>) : <li>None</li>}</ul>
        </AdminCard>
        <AdminCard>
          <h2 className="font-heading text-lg">Requests</h2>
          <p className="mt-2 text-sm">{requests.length} (sent {user.requestsSent}, received {user.requestsReceived})</p>
        </AdminCard>
        <AdminCard>
          <h2 className="font-heading text-lg">Conversations</h2>
          <p className="mt-2 text-sm">{conversations.length}</p>
        </AdminCard>
        <AdminCard>
          <h2 className="font-heading text-lg">Messages count</h2>
          <p className="mt-2 text-sm">{user.messagesSent} sent. Message bodies are not shown.</p>
        </AdminCard>
        <AdminCard>
          <h2 className="font-heading text-lg">Bookings</h2>
          <p className="mt-2 text-sm">{bookings.length} ({user.completedBookings} completed)</p>
        </AdminCard>
        <AdminCard>
          <h2 className="font-heading text-lg">Matches</h2>
          <p className="mt-2 text-sm">{matches.length}</p>
        </AdminCard>
        <AdminCard>
          <h2 className="font-heading text-lg">Favourites</h2>
          <p className="mt-2 text-sm">{favorites.length}</p>
        </AdminCard>
        <AdminCard>
          <h2 className="font-heading text-lg">Notifications</h2>
          <p className="mt-2 text-sm">{notifications.length} (type + time only)</p>
        </AdminCard>
        <AdminCard>
          <h2 className="font-heading text-lg">Activity timeline</h2>
          <p className="mt-1 text-xs text-muted">Historical page/profile views: unavailable. Events below are reconstructed from canonical tables.</p>
          <ol className="mt-3 space-y-2 text-sm">
            {timeline.slice(0, 80).map((event) => (
              <li key={`${event.at}-${event.label}`}>
                <span className="font-medium">{event.at.slice(0, 16).replace("T", " ")}</span>
                <span className="ml-2 text-muted">{event.label}</span>
              </li>
            ))}
          </ol>
        </AdminCard>
      </section>
    </AdminShell>
  );
}
