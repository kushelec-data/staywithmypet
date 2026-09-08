import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminUi";
import { loadAdminBookingsBundle } from "@/lib/admin/queries";
import { bookingDurationDays, bookingNeedsStatusWarning, formatAdminDate, utcTodayIso } from "@/lib/admin/bookings-analytics";

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const bundle = await loadAdminBookingsBundle();
  if (!bundle) {
    return (
      <AdminShell title="Booking" pathname="/admin/bookings">
        <p className="text-sm text-muted">Unavailable.</p>
      </AdminShell>
    );
  }
  const booking = bundle.bookings.find((b) => b.id === bookingId);
  if (!booking) notFound();

  const names = new Map(bundle.profiles.map((p) => [p.id, p.display_name]));
  const pets = new Map(bundle.pets.map((p) => [p.id, p.name]));
  const conv = booking.request_id
    ? bundle.conversations.find((c) => c.request_id === booking.request_id)
    : undefined;
  const request = booking.request_id ? bundle.requests.find((r) => r.id === booking.request_id) : undefined;
  const warning = bookingNeedsStatusWarning(booking, utcTodayIso());

  return (
    <AdminShell
      title="Booking detail"
      pathname="/admin/bookings"
      description="Canonical booking row. No message bodies."
    >
      <p className="mb-4 text-sm">
        <Link href="/admin/bookings" className="font-semibold text-[#2E6B3F]">
          ← Bookings
        </Link>
      </p>
      <dl className="grid gap-3 rounded-[20px] border border-[#E5E2D8] bg-[#F8F6F1] p-5 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase text-muted">Booking ID</dt>
          <dd className="break-all font-medium">{booking.id}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-muted">Status</dt>
          <dd className="capitalize">{booking.status}</dd>
          {warning ? <p className="mt-1 text-xs text-[#8A3B3B]">Status may need update</p> : null}
        </div>
        <div>
          <dt className="text-xs uppercase text-muted">Parent</dt>
          <dd>
            <Link href={`/admin/users/${booking.pet_parent_id}`} className="font-semibold text-[#2E6B3F]">
              {names.get(booking.pet_parent_id) ?? booking.pet_parent_id}
            </Link>
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-muted">Friend</dt>
          <dd>
            <Link href={`/admin/users/${booking.pet_friend_id}`} className="font-semibold text-[#2E6B3F]">
              {names.get(booking.pet_friend_id) ?? booking.pet_friend_id}
            </Link>
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-muted">Pet</dt>
          <dd>{pets.get(booking.pet_id) ?? booking.pet_id}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-muted">Created</dt>
          <dd>{formatAdminDate(booking.created_at)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-muted">Start</dt>
          <dd>{formatAdminDate(booking.start_date)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-muted">End</dt>
          <dd>{formatAdminDate(booking.end_date)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-muted">Duration</dt>
          <dd>{bookingDurationDays(booking.start_date, booking.end_date) ?? "—"} days</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-muted">Completed at</dt>
          <dd>{formatAdminDate(booking.completed_at)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-muted">Request linked</dt>
          <dd>{request ? request.id : "no"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-muted">Conversation linked</dt>
          <dd>{conv ? "yes" : "no"}</dd>
        </div>
      </dl>
    </AdminShell>
  );
}
