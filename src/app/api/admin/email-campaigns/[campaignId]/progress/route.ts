import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/require-api";
import { CAMPAIGN_FROM_HEADER } from "@/lib/email-campaigns/from";
import { jsonLooksLikeSecretDump } from "@/lib/email-campaigns/dto";
import { progressFromRecipientRows } from "@/lib/email-campaigns/send-queue";
import { getCampaignDetail } from "@/lib/email-campaigns/store";
import { attachRecipientConsent, listCampaignDeliveryRows } from "@/lib/email-campaigns/store-bulk";
import { bulkSendConsentGate } from "@/lib/email-campaigns/marketing-consent";

type RouteContext = { params: Promise<{ campaignId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const gate = await requireAdminApi();
  if (gate.response) return gate.response;

  const { campaignId } = await context.params;
  const detail = await getCampaignDetail(campaignId);
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const withConsent = await attachRecipientConsent(detail);
  const rows = await listCampaignDeliveryRows(campaignId);
  const progress = progressFromRecipientRows(
    withConsent.recipients.map((row) => ({
      language: row.language,
      status: row.status,
      first_opened_at: row.openedAt,
      first_clicked_at: row.clicked ? row.sentAt : null,
    })),
  );
  const pending = withConsent.recipients.filter((row) => row.status === "pending" || row.status === "sending");
  const gateConsent = bulkSendConsentGate(
    pending.map((row) => ({ email: row.email, consented: row.consented === true })),
  );
  const payload = {
    from: CAMPAIGN_FROM_HEADER,
    name: withConsent.name,
    status: withConsent.status,
    progress: {
      ...progress,
      opened: withConsent.summary.opened,
      clicked: withConsent.summary.uniqueClicks,
    },
    failures: withConsent.recipients
      .filter((row) => row.status === "failed")
      .map((row) => ({ email: row.email, reason: row.failureReason })),
    consent: gateConsent,
    bulkSendEnabled: gateConsent.allowed,
  };
  if (jsonLooksLikeSecretDump(payload)) {
    return NextResponse.json({ error: "Refusing to return secrets." }, { status: 500 });
  }
  void rows;
  return NextResponse.json(payload);
}
