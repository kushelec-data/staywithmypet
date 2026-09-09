import "server-only";

import { personalizeCampaignHtml } from "@/lib/email-campaigns/personalize";
import { sendCampaignSmtpEmail, CAMPAIGN_BATCH_PAUSE_MS, CAMPAIGN_BATCH_SIZE } from "@/lib/email-campaigns/smtp";
import {
  loadRecipientForSend,
  markCampaignStatus,
  recordSendResult,
  remintClickTokensIfInvalid,
} from "@/lib/email-campaigns/store";
import { htmlContainsBrokenCampaignTracking, requireCampaignEmailOrigin } from "@/lib/email-campaigns/public-base";
import { planRecipientSend, selectCampaignContent, type RecipientSendPlan } from "@/lib/email-campaigns/locale";

export { CAMPAIGN_BATCH_PAUSE_MS, CAMPAIGN_BATCH_SIZE, planRecipientSend };
export type { RecipientSendPlan };

function smtpFailureReason(result: { ok: false; reason: string; detail?: string }): string {
  const detail = result.detail?.replace(/\bpass(word)?=[^,\s]+/gi, "password=[redacted]") ?? "";
  if (!detail) return result.reason;
  return `${result.reason}:${detail.slice(0, 180)}`;
}

export async function sendToRecipient(recipientId: string): Promise<{
  ok: boolean;
  reason?: string;
  email?: string;
  smtpCalled: boolean;
  plan?: RecipientSendPlan;
}> {
  let packed = await loadRecipientForSend(recipientId);
  if (!packed) return { ok: false, reason: "recipient_not_found", smtpCalled: false };

  if (!packed.destinationsOk.ok) {
    const reminted = await remintClickTokensIfInvalid(recipientId);
    if (reminted) packed = await loadRecipientForSend(recipientId);
  }
  if (!packed) return { ok: false, reason: "recipient_not_found", smtpCalled: false };

  const plan = planRecipientSend({
    email: packed.recipient.email as string,
    language: packed.recipient.language as string,
    subjectEn: packed.campaign.subject_en as string,
    subjectEt: packed.campaign.subject_et as string,
    htmlEn: packed.campaign.html_en as string,
    htmlEt: packed.campaign.html_et as string,
    linkKeys: packed.clickRows.map((row) => row.link_key),
    destinationsOk: packed.destinationsOk.ok,
  });

  const origin = requireCampaignEmailOrigin();
  if (!origin.ok) {
    await recordSendResult({
      campaignId: packed.campaign.id as string,
      recipientId,
      ok: false,
      reason: origin.reason,
    });
    return { ok: false, reason: origin.reason, email: plan.email, smtpCalled: false, plan };
  }

  if (!packed.destinationsOk.ok) {
    await recordSendResult({
      campaignId: packed.campaign.id as string,
      recipientId,
      ok: false,
      reason: `destination_mismatch:${packed.destinationsOk.errors.join(",")}`,
    });
    return { ok: false, reason: "destination_mismatch", email: plan.email, smtpCalled: false, plan };
  }

  const selected = selectCampaignContent(packed.recipient.language as string, {
    subjectEn: packed.campaign.subject_en as string,
    subjectEt: packed.campaign.subject_et as string,
    htmlEn: packed.campaign.html_en as string,
    htmlEt: packed.campaign.html_et as string,
  });
  const { html, text } = personalizeCampaignHtml({
    htmlEn: packed.campaign.html_en as string,
    htmlEt: packed.campaign.html_et as string,
    language: packed.recipient.language as string,
    openToken: packed.recipient.open_token as string,
    clickTokens: packed.clickTokens,
    origin: origin.origin,
  });
  const expectedMarker = selected.template === "ET" ? "VAATA SÜNDMUST" : "VIEW EVENT";
  const wrongMarker = selected.template === "ET" ? "VIEW EVENT" : "VAATA SÜNDMUST";
  if (htmlContainsBrokenCampaignTracking(html) || !html.includes(expectedMarker) || html.includes(wrongMarker)) {
    const reason = htmlContainsBrokenCampaignTracking(html) ? "ephemeral_tracking_url" : "template_mismatch";
    await recordSendResult({
      campaignId: packed.campaign.id as string,
      recipientId,
      ok: false,
      reason,
    });
    return { ok: false, reason, email: plan.email, smtpCalled: false, plan };
  }
  const result = await sendCampaignSmtpEmail({
    to: packed.recipient.email as string,
    subject: selected.subject,
    html,
    text,
  });

  await recordSendResult({
    campaignId: packed.campaign.id as string,
    recipientId,
    ok: result.ok,
    reason: result.ok ? undefined : smtpFailureReason(result),
  });
  return result.ok
    ? { ok: true, email: plan.email, smtpCalled: true, plan }
    : { ok: false, reason: smtpFailureReason(result), email: plan.email, smtpCalled: true, plan };
}

export async function sendTestCampaign(campaignId: string, recipientIds: string[]): Promise<{
  ok: boolean;
  sent: number;
  failed: number;
  failures: Array<{ email?: string; reason: string }>;
  blocked?: string;
}> {
  const first = recipientIds[0] ? await loadRecipientForSend(recipientIds[0]) : null;
  const status = first?.campaign.status as string | undefined;
  if (status === "sending") {
    return {
      ok: false,
      sent: 0,
      failed: 0,
      failures: [],
      blocked: "Campaign is currently sending. Wait for that run to finish before sending a test.",
    };
  }

  let sent = 0;
  let failed = 0;
  const failures: Array<{ email?: string; reason: string }> = [];
  for (const id of recipientIds) {
    const result = await sendToRecipient(id);
    if (result.ok) sent += 1;
    else {
      failed += 1;
      failures.push({ email: result.email, reason: result.reason ?? "send_failed" });
    }
  }
  await markCampaignStatus(campaignId, sent > 0 ? "test_sent" : status === "test_sent" ? "test_sent" : "draft");
  return { ok: sent > 0, sent, failed, failures };
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
