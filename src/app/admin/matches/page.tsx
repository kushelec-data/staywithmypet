import { AdminCard, AdminShell, AdminTable } from "@/components/admin/AdminUi";
import { matchAttribution } from "@/lib/admin/aggregates";
import { matchConversionRates } from "@/lib/admin/metrics";
import { loadAdminCatalog } from "@/lib/admin/queries";

export default async function AdminMatchesPage() {
  const catalog = await loadAdminCatalog();
  if (!catalog) {
    return <AdminShell title="Matches" pathname="/admin/matches"><p>Unavailable.</p></AdminShell>;
  }
  const names = new Map(catalog.profiles.map((p) => [p.id, p.display_name]));
  const pets = new Map(catalog.pets.map((p) => [p.id, p.name]));
  const { rows, summary } = matchAttribution(catalog);
  const rates = matchConversionRates({
    generated: summary.generated,
    viewed: summary.viewed,
    clicked: summary.clicked,
    withLaterRequest: summary.withLaterRequest,
    withLaterBooking: summary.withLaterBooking,
    withLaterCompletedBooking: summary.withLaterCompletedBooking,
  });

  return (
    <AdminShell
      title="Matchmaking"
      pathname="/admin/matches"
      description="Attribution is same parent + friend + pet with a later request/booking timestamp. Not claimed if timestamps cannot support it."
    >
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Generated", summary.generated],
          ["Users receiving", summary.usersReceiving],
          ["View rate", `${rates.viewRate}%`],
          ["Click rate", `${rates.clickRate}%`],
          ["Request conversion", `${rates.requestConversion}%`],
          ["Booking conversion", `${rates.bookingConversion}%`],
          ["Completed conversion", `${rates.completedBookingConversion}%`],
        ].map(([k, v]) => (
          <AdminCard key={k}>
            <p className="text-xs uppercase text-muted">{k}</p>
            <p className="font-heading text-xl">{v}</p>
          </AdminCard>
        ))}
      </div>
      <AdminTable
        empty="No match_suggestions rows."
        headers={[
          "Pet Parent",
          "Pet",
          "Pet Friend",
          "Score",
          "Reasons",
          "Created",
          "Viewed",
          "Clicked",
          "Dismissed",
          "Emailed",
          "Request after",
          "Booking after",
          "Completed after",
        ]}
        rows={rows.map((m) => [
          names.get(m.pet_parent_id) ?? m.pet_parent_id,
          pets.get(m.pet_id) ?? m.pet_id,
          names.get(m.pet_friend_id) ?? m.pet_friend_id,
          String(m.score),
          Array.isArray(m.reasons) ? m.reasons.join("; ") : "—",
          m.created_at.slice(0, 16).replace("T", " "),
          m.viewed ? "yes" : "no",
          m.clicked ? "yes" : "no",
          m.dismissed ? "yes" : "no",
          m.emailed ? "yes" : "no",
          m.requestAfter ? "yes" : "no",
          m.bookingAfter ? "yes" : "no",
          m.completedAfter ? "yes" : "no",
        ])}
      />
    </AdminShell>
  );
}
