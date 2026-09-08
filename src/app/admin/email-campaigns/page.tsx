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
      description="Admin-only community emails via SpaceMail. Recipients are selected explicitly; nothing is sent until you confirm Send test."
    >
      <p className="mb-4 text-sm text-muted">From: {CAMPAIGN_FROM_HEADER}</p>
      <p className="mb-6 text-xs text-muted">{OPEN_TRACKING_DISCLAIMER}</p>
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
      <div className="mt-8">
        <EmailCampaignComposer />
      </div>
      <AdminCard className="mt-6">
        <p className="text-sm text-muted">
          Bulk send is not automatic. SpaceMail paid mailboxes are limited to 500 outgoing messages per hour (trial: 20/hour). Future large campaigns will send in batches of 10 with a pause so we stay under that cap.
        </p>
      </AdminCard>
    </AdminShell>
  );
}
