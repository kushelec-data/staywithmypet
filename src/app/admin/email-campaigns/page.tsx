import Link from "next/link";
import { AdminShell, AdminTable } from "@/components/admin/AdminUi";
import { EmailCampaignComposer } from "@/components/admin/EmailCampaignComposer";
import { listCampaignSummaries } from "@/lib/email-campaigns/store";

export default async function AdminEmailCampaignsPage() {
  const campaigns = await listCampaignSummaries();

  return (
    <AdminShell
      title="Email campaigns"
      pathname="/admin/email-campaigns"
      description="Write, preview, and send community emails."
    >
      <AdminTable
        headers={["Name", "Version", "Language", "Status", "Updated", "Sent", "Recipients"]}
        empty={campaigns === null ? "Campaigns are unavailable right now." : "No campaigns yet."}
        rows={(campaigns ?? []).map((row) => [
          <Link key={row.id} href={`/admin/email-campaigns/${row.id}`} className="font-semibold text-[#2E6B3F]">
            {row.name}
          </Link>,
          row.version,
          row.language,
          row.status,
          new Date(row.updatedAt).toLocaleString(),
          String(row.sent),
          String(row.recipients),
        ])}
      />
      <EmailCampaignComposer />
    </AdminShell>
  );
}
