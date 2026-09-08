import "server-only";

import { personalizeCampaignHtml } from "@/lib/email-campaigns/personalize";
import { sendCampaignSmtpEmail, CAMPAIGN_BATCH_PAUSE_MS, CAMPAIGN_BATCH_SIZE } from "@/lib/email-campaigns/smtp";
import {
  loadRecipientForSend,
  markCampaignStatus,
  recordSendResult,
} from "@/lib/email-campaigns/store";
import type { CampaignLanguage } from "@/lib/email-campaigns/locale";

export { CAMPAIGN_BATCH_PAUSE_MS, CAMPAIGN_BATCH_SIZE };

export async function sendToRecipient(recipientId: string): Promise<{ ok: boolean; reason?: string }> {
  const packed = await loadRecipientForSend(recipientId);
  if (!packed) return { ok: false, reason: "recipient_not_found" };

  const language = packed.recipient.language as CampaignLanguage;
  const { html, text } = personalizeCampaignHtml({
    htmlEn: packed.campaign.html_en as string,
    htmlEt: packed.campaign.html_et as string,
    language,
    openToken: packed.recipient.open_token as string,
    clickTokens: packed.clickTokens,
  });
  const subject = language === "et" ? (packed.campaign.subject_et as string) : (packed.campaign.subject_en as string);
  const result = await sendCampaignSmtpEmail({
    to: packed.recipient.email as string,
    subject,
    html,
    text,
  });

  await recordSendResult({
    campaignId: packed.campaign.id as string,
    recipientId,
    ok: result.ok,
    reason: result.ok ? undefined : result.reason,
  });
  return result.ok ? { ok: true } : { ok: false, reason: result.reason };
}

export async function sendTestCampaign(campaignId: string, recipientIds: string[]): Promise<{
  sent: number;
  failed: number;
}> {
  let sent = 0;
  let failed = 0;
  for (const id of recipientIds) {
    const result = await sendToRecipient(id);
    if (result.ok) sent += 1;
    else failed += 1;
  }
  await markCampaignStatus(campaignId, sent > 0 ? "test_sent" : "draft");
  return { sent, failed };
}

export async function sendCampaignBatched(campaignId: string, recipientIds: string[]): Promise<void> {
  await markCampaignStatus(campaignId, "sending");
  for (let i = 0; i < recipientIds.length; i += CAMPAIGN_BATCH_SIZE) {
    const batch = recipientIds.slice(i, i + CAMPAIGN_BATCH_SIZE);
    for (const id of batch) {
      await sendToRecipient(id);
    }
    if (i + CAMPAIGN_BATCH_SIZE < recipientIds.length) {
      await new Promise((resolve) => setTimeout(resolve, CAMPAIGN_BATCH_PAUSE_MS));
    }
  }
  await markCampaignStatus(campaignId, "sent");
}
