import Link from "next/link";
import { AdminCard, AdminShell, AdminTable } from "@/components/admin/AdminUi";
import { EmailCampaignComposer } from "@/components/admin/EmailCampaignComposer";
import { CAMPAIGN_FROM_HEADER } from "@/lib/email-campaigns/from";
import { OPEN_TRACKING_DISCLAIMER } from "@/lib/email-campaigns/dto";
import { listCampaignSummaries } from "@/lib/email-campaigns/store";

export default async function AdminEmailCampaignsPage() {
  const campaigns = await listCampaignSummaries();

  return (
    <AdminShell
      title="Email campaigns"
      pathname="/admin/email-campaigns"
      description="Create, test and send community email campaigns through SpaceMail."
      compact
    >
      <p className="text-sm text-muted">From: {CAMPAIGN_FROM_HEADER}</p>
      <p className="text-xs text-muted">{OPEN_TRACKING_DISCLAIMER}</p>
      <AdminTable
        headers={["Campaign", "Recipients", "Sent", "Opened", "Clicked", "Failed", "Created", "Status"]}
        empty={campaigns === null ? "Campaign data unavailable (admin database client missing)." : "No campaigns yet."}
        rows={(campaigns ?? []).map((row) => [
          <Link key={row.id} href={`/admin/email-campaigns/${row.id}`} className="font-semibold text-[#2E6B3F]">
            {row.name}
          </Link>,
          String(row.recipients),
          String(row.sent),
          String(row.opened),
          String(row.clicked),
          String(row.failed),
          new Date(row.createdAt).toLocaleString(),
          row.status,
        ])}
      />
      <EmailCampaignComposer />
      <AdminCard>
        <p className="text-sm text-muted">
          Bulk send is not automatic. Tune EMAIL_CAMPAIGN_BATCH_SIZE and EMAIL_CAMPAIGN_BATCH_DELAY_MS so sending stays comfortably below your mailbox hourly limit.
        </p>
      </AdminCard>
    </AdminShell>
  );
}
