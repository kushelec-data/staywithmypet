import { AdminCard, AdminTable } from "@/components/admin/AdminUi";
import type { CampaignOverviewStats, LinkClickRow } from "@/lib/email-campaigns/analytics";

export function EmailCampaignOverview({
  overview,
  links,
}: {
  overview: CampaignOverviewStats;
  links: LinkClickRow[];
}) {
  return (
    <>
      <AdminCard>
        <h2 className="font-heading text-lg font-semibold">Campaign overview</h2>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <p>Recipients: {overview.recipients}</p>
          <p>Sent: {overview.sent}</p>
          <p>Opened: {overview.opened}</p>
          <p>Clicked: {overview.clicked}</p>
          <p>Failed: {overview.failed}</p>
          <p>Unsubscribed: {overview.unsubscribed}</p>
          <p>Open rate: {overview.openRate}%</p>
          <p>Click rate: {overview.clickRate}%</p>
        </div>
        <div className="mt-4 text-sm">
          <p className="font-semibold">Language</p>
          <p>English: {overview.english}</p>
          <p>Estonian: {overview.estonian}</p>
        </div>
      </AdminCard>
      <AdminCard>
        <h2 className="font-heading text-lg font-semibold">Top clicked links</h2>
        <div className="mt-3">
          <AdminTable
            headers={["Link", "Type", "Label", "Clicks", "Unique clicks"]}
            empty="No clicks yet."
            rows={links.map((row) => [row.label, row.type, row.label, String(row.clicks), String(row.uniqueClicks)])}
          />
        </div>
      </AdminCard>
    </>
  );
}
