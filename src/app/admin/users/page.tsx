import Link from "next/link";
import { AdminPager, AdminShell, AdminTable } from "@/components/admin/AdminUi";
import {
  ADMIN_PAGE_SIZE,
  buildAdminUserRows,
  filterAdminUserRows,
  paginateRows,
  type AdminUserListFilters,
} from "@/lib/admin/aggregates";
import { loadAdminCatalog } from "@/lib/admin/queries";

function parseFilters(sp: Record<string, string | undefined>): AdminUserListFilters {
  const bool = (v?: string) => (v === "yes" ? true : v === "no" ? false : null);
  return {
    q: sp.q,
    role: (["pet_parent", "pet_friend", "both", "not_chosen"] as const).includes(sp.role as never)
      ? (sp.role as AdminUserListFilters["role"])
      : undefined,
    profileIncomplete: sp.incomplete === "yes" ? true : undefined,
    isPublic: bool(sp.public),
    hasRequests: bool(sp.requests),
    hasMessages: bool(sp.messages),
    hasBookings: bool(sp.bookings),
    hasMatches: bool(sp.matches),
    signupFrom: sp.signupFrom,
    signupTo: sp.signupTo,
    lastActiveFrom: sp.lastActiveFrom,
    lastActiveTo: sp.lastActiveTo,
  };
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const catalog = await loadAdminCatalog();
  if (!catalog) {
    return <AdminShell title="Users" pathname="/admin/users"><p>Unavailable.</p></AdminShell>;
  }
  const filters = parseFilters(sp);
  const all = filterAdminUserRows(buildAdminUserRows(catalog), filters);
  const page = Number(sp.page ?? "1") || 1;
  const { items, total } = paginateRows(all, page);

  return (
    <AdminShell title="Users" pathname="/admin/users" description="Search and filter StayWithMyPet accounts. Membership is from user_memberships.">
      <form className="mb-6 grid grid-cols-2 gap-3 text-sm md:grid-cols-4" method="get">
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Name or email" className="rounded-xl border border-[#E5E2D8] px-3 py-2" />
        <select name="role" defaultValue={sp.role ?? ""} className="rounded-xl border border-[#E5E2D8] px-3 py-2">
          <option value="">All roles</option>
          <option value="pet_parent">Pet Parent</option>
          <option value="pet_friend">Pet Friend</option>
          <option value="both">Both</option>
          <option value="not_chosen">Role not chosen</option>
        </select>
        <select name="incomplete" defaultValue={sp.incomplete ?? ""} className="rounded-xl border border-[#E5E2D8] px-3 py-2">
          <option value="">Profile any</option>
          <option value="yes">Profile incomplete</option>
        </select>
        <select name="public" defaultValue={sp.public ?? ""} className="rounded-xl border border-[#E5E2D8] px-3 py-2">
          <option value="">Public/private</option>
          <option value="yes">Public</option>
          <option value="no">Private</option>
        </select>
        <select name="requests" defaultValue={sp.requests ?? ""} className="rounded-xl border border-[#E5E2D8] px-3 py-2">
          <option value="">Requests</option>
          <option value="yes">Has requests</option>
          <option value="no">No requests</option>
        </select>
        <select name="messages" defaultValue={sp.messages ?? ""} className="rounded-xl border border-[#E5E2D8] px-3 py-2">
          <option value="">Messages</option>
          <option value="yes">Has messages</option>
          <option value="no">No messages</option>
        </select>
        <select name="bookings" defaultValue={sp.bookings ?? ""} className="rounded-xl border border-[#E5E2D8] px-3 py-2">
          <option value="">Bookings</option>
          <option value="yes">Has bookings</option>
          <option value="no">No bookings</option>
        </select>
        <select name="matches" defaultValue={sp.matches ?? ""} className="rounded-xl border border-[#E5E2D8] px-3 py-2">
          <option value="">Matches</option>
          <option value="yes">Has matches</option>
          <option value="no">No matches</option>
        </select>
        <label className="text-xs text-muted">Signup from<input type="date" name="signupFrom" defaultValue={sp.signupFrom ?? ""} className="mt-1 w-full rounded-xl border px-2 py-1" /></label>
        <label className="text-xs text-muted">Signup to<input type="date" name="signupTo" defaultValue={sp.signupTo ?? ""} className="mt-1 w-full rounded-xl border px-2 py-1" /></label>
        <label className="text-xs text-muted">Last active from<input type="date" name="lastActiveFrom" defaultValue={sp.lastActiveFrom ?? ""} className="mt-1 w-full rounded-xl border px-2 py-1" /></label>
        <label className="text-xs text-muted">Last active to<input type="date" name="lastActiveTo" defaultValue={sp.lastActiveTo ?? ""} className="mt-1 w-full rounded-xl border px-2 py-1" /></label>
        <button type="submit" className="rounded-full bg-[#2E6B3F] px-4 py-2 font-semibold text-white">Filter</button>
      </form>
      <AdminTable
        empty="No users match."
        headers={[
          "Name",
          "Email",
          "Signup",
          "Last login",
          "Role",
          "Mode",
          "Role chosen",
          "Public",
          "Completion",
          "Pets",
          "Membership",
          "Req sent",
          "Req recv",
          "Messages",
          "Chats",
          "Bookings",
          "Completed",
          "Matches",
          "Last activity",
          "Funnel stage",
        ]}
        rows={items.map((u) => [
          <Link key={u.id} href={`/admin/users/${u.id}`} className="font-semibold text-[#2E6B3F]">{u.name}</Link>,
          u.email ?? "—",
          u.signupDate?.slice(0, 10) ?? "—",
          u.lastLogin?.slice(0, 16).replace("T", " ") ?? "—",
          u.role,
          u.currentMode,
          u.roleChosen ? "yes" : "no",
          u.profilePublic ? "public" : "private",
          `${u.profileCompletion}%`,
          String(u.petCount),
          u.membershipStatus,
          String(u.requestsSent),
          String(u.requestsReceived),
          String(u.messagesSent),
          String(u.conversations),
          String(u.bookings),
          String(u.completedBookings),
          String(u.matchesReceived),
          u.lastMeaningfulActivity?.slice(0, 16).replace("T", " ") ?? "—",
          u.funnelStage,
        ])}
      />
      <AdminPager
        page={page}
        pageSize={ADMIN_PAGE_SIZE}
        total={total}
        href={(p) => {
          const params = new URLSearchParams();
          for (const [k, v] of Object.entries(sp)) {
            if (v && k !== "page") params.set(k, v);
          }
          params.set("page", String(p));
          return `/admin/users?${params.toString()}`;
        }}
      />
    </AdminShell>
  );
}
