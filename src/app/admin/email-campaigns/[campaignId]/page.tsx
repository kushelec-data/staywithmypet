import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminUi";
import { EmailCampaignDetailClient } from "@/components/admin/EmailCampaignDetailClient";
import { CAMPAIGN_FROM_HEADER } from "@/lib/email-campaigns/from";
import { getCampaignDetail, listCampaignClickEvents } from "@/lib/email-campaigns/store";
import { attachRecipientConsent } from "@/lib/email-campaigns/store-bulk";
import { topClickedLinks } from "@/lib/email-campaigns/analytics";
import { trackedLinksFromTemplateConfig } from "@/lib/email-campaigns/events";

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
      <AdminShell title="Email campaign" pathname="/admin/email-campaigns">
        <p>Campaign not found.</p>
        <Link href="/admin/email-campaigns" className="mt-3 inline-block font-semibold text-[#2E6B3F]">
          Back to campaigns
        </Link>
      </AdminShell>
    );
  }

  const clickEvents = await listCampaignClickEvents(detail.id);
  const links = topClickedLinks(
    clickEvents.map((row) => ({ linkKey: row.linkKey, recipientId: row.recipientId })),
    trackedLinksFromTemplateConfig(detail.templateConfig).map((item) => ({
      key: item.key,
      type: item.type,
      label: item.label,
    })),
  );

  return (
    <AdminShell
      title={detail.name}
      pathname="/admin/email-campaigns"
      description="Write, preview, send, or schedule this email, then view results."
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
        version={detail.version}
        language={detail.language}
        contentLocked={detail.contentLocked}
        scheduledAt={detail.scheduledAt}
        scheduledTimezone={detail.scheduledTimezone}
        sentAt={detail.sentAt}
        links={links}
        subjectEn={detail.subjectEn}
        subjectEt={detail.subjectEt}
        copy={{
          subjectEn: detail.subjectEn,
          subjectEt: detail.subjectEt,
          preheaderEn: detail.copy.preheaderEn,
          preheaderEt: detail.copy.preheaderEt,
          bodyBeforeEn: detail.copy.bodyBeforeEn,
          bodyAfterEn: detail.copy.bodyAfterEn,
          bodyBeforeEt: detail.copy.bodyBeforeEt,
          bodyAfterEt: detail.copy.bodyAfterEt,
        }}
      />
    </AdminShell>
  );
}
