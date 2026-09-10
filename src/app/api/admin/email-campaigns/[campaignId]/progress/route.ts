import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/require-api";
import { CAMPAIGN_FROM_HEADER } from "@/lib/email-campaigns/from";
import { jsonLooksLikeSecretDump } from "@/lib/email-campaigns/dto";
import { progressFromRecipientRows } from "@/lib/email-campaigns/send-queue";
import { getCampaignDetail } from "@/lib/email-campaigns/store";
import { attachRecipientConsent } from "@/lib/email-campaigns/store-bulk";
import { campaignConsentSummary } from "@/lib/email-campaigns/consent-summary";

type RouteContext = { params: Promise<{ campaignId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const gate = await requireAdminApi();
  if (gate.response) return gate.response;

  const { campaignId } = await context.params;
  const detail = await getCampaignDetail(campaignId);
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const withConsent = await attachRecipientConsent(detail);
  const progress = progressFromRecipientRows(
    withConsent.recipients.map((row) => ({
      language: row.language,
      status: row.status,
      first_opened_at: row.openedAt,
      first_clicked_at: row.clickedAt ?? null,
    })),
  );
  const consent = campaignConsentSummary(
    withConsent.recipients.map((row) => ({ status: row.status, consented: row.consented === true })),
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
    consent: { missingConsent: consent.blocked, eligible: consent.eligible, warning: consent.warning },
    bulkSendEnabled: consent.blocked === 0,
  };
  if (jsonLooksLikeSecretDump(payload)) {
    return NextResponse.json({ error: "Refusing to return secrets." }, { status: 500 });
  }
    return NextResponse.json(payload);
}
