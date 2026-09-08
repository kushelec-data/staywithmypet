import { AdminShell } from "@/components/admin/AdminUi";
import { BookingsDashboard, BookingsRangeControls } from "@/components/admin/BookingsDashboard";
import { buildBookingsDashboardDto, bookingsQueryFromSearch } from "@/lib/admin/bookings-load";

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { range, metric, filters } = bookingsQueryFromSearch(sp);
  const data = await buildBookingsDashboardDto({ range, metric, filters });

  if (!data) {
    return (
      <AdminShell title="Bookings" pathname="/admin/bookings" description="Operational booking activity">
        <p className="text-sm text-muted">Service role is not configured.</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Bookings"
      pathname="/admin/bookings"
      description="Marketplace bookings created, completed, and upcoming"
      actions={<BookingsRangeControls range={range} metric={metric} periodLabel={data.periodLabel} />}
    >
      <BookingsDashboard data={data} range={range} metric={metric} filters={filters} />
    </AdminShell>
  );
}
