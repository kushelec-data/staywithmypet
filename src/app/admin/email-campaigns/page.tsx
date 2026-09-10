import Link from "next/link";
import { AdminShell, AdminTable } from "@/components/admin/AdminUi";
import { EmailCampaignComposer } from "@/components/admin/EmailCampaignComposer";
import { listCampaignSummaries } from "@/lib/email-campaigns/store";
import { campaignStatusLabel, campaignWhenLabel } from "@/lib/email-campaigns/schedule";

export default async function AdminEmailCampaignsPage() {
  const campaigns = await listCampaignSummaries();

  return (
    <AdminShell
      title="Email campaigns"
      pathname="/admin/email-campaigns"
      description="Create a campaign, write EN/ET, upload a CSV, save, preview, send a test, then send now or schedule. Automatic scheduled sending currently runs once daily on the Hobby deployment."
    >
      <AdminTable
        headers={["Name", "Version", "Status", "Recipients", "Sent", "Opened", "Clicked", "Failed", "Scheduled / Sent at"]}
        empty={campaigns === null ? "Campaigns are unavailable right now." : "No campaigns yet."}
        rows={(campaigns ?? []).map((row) => [
          <Link key={row.id} href={`/admin/email-campaigns/${row.id}`} className="font-semibold text-[#2E6B3F]">
            {row.name}
          </Link>,
          row.version,
          campaignStatusLabel(row.status),
          String(row.recipients),
          String(row.sent),
          String(row.opened),
          String(row.clicked),
          String(row.failed),
          campaignWhenLabel({
            status: row.status,
            scheduledAt: row.scheduledAt,
            sentAt: row.sentAt,
            timezone: row.scheduledTimezone,
          }),
        ])}
      />
      <EmailCampaignComposer />
    </AdminShell>
  );
}
