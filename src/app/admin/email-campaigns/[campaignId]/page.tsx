import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminUi";
import { EmailCampaignDetailClient } from "@/components/admin/EmailCampaignDetailClient";
import { CAMPAIGN_FROM_HEADER } from "@/lib/email-campaigns/from";
import { getCampaignDetail } from "@/lib/email-campaigns/store";
import { attachRecipientConsent } from "@/lib/email-campaigns/store-bulk";

export default async function AdminEmailCampaignDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const loaded = await getCampaignDetail(campaignId);
  const detail = loaded ? await attachRecipientConsent(loaded) : null;

  if (!detail) {
    return (
      <AdminShell title="Email campaign" pathname="/admin/email-campaigns" compact>
        <p>Campaign not found.</p>
        <Link href="/admin/email-campaigns" className="mt-3 inline-block font-semibold text-[#2E6B3F]">
          Back to campaigns
        </Link>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title={detail.name}
      pathname="/admin/email-campaigns"
      description="Recipient tracking for this campaign only. Open counts are approximate."
      compact
      actions={
        <Link href="/admin/email-campaigns" className="text-sm font-semibold text-[#2E6B3F]">
          All campaigns
        </Link>
      }
    >
      <EmailCampaignDetailClient
        campaignId={detail.id}
        name={detail.name}
        status={detail.status}
        from={CAMPAIGN_FROM_HEADER}
        summary={detail.summary}
        recipients={detail.recipients}
        htmlEn={detail.htmlEn}
        htmlEt={detail.htmlEt}
      />
    </AdminShell>
  );
}
