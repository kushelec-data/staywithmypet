import "server-only";

import { randomUUID } from "node:crypto";
import { personalizeCampaignHtml } from "@/lib/email-campaigns/personalize";
import { sendCampaignSmtpEmail } from "@/lib/email-campaigns/smtp";
import { campaignBatchConfig, chunkIds } from "@/lib/email-campaigns/batch-config";
import {
  ensureUnsubscribeToken,
  loadRecipientForSend,
  markCampaignStatus,
  recordSendResult,
  remintClickTokensIfInvalid,
} from "@/lib/email-campaigns/store";
import { htmlContainsBrokenCampaignTracking, requireCampaignEmailOrigin } from "@/lib/email-campaigns/public-base";
import { planRecipientSend, selectCampaignContent, type RecipientSendPlan } from "@/lib/email-campaigns/locale";
import {
  countSentByTemplate,
  parseSendLanguageMode,
  type SendLanguageMode,
  resolveSendLanguage,
} from "@/lib/email-campaigns/send-language";
import { hasMarketingEmailConsent } from "@/lib/email-campaigns/marketing-consent";
import { runSequentialSends, type SendMode } from "@/lib/email-campaigns/send-queue";
import {
  claimCampaignSendLease,
  claimRecipientForSend,
  finalizeBulkCampaignStatus,
  loadMarketingConsentMap,
  refreshCampaignSendLease,
  releaseCampaignSendLease,
  resetStaleSendingRecipients,
  sendableRecipientIds,
} from "@/lib/email-campaigns/store-bulk";

export { campaignBatchConfig };
export { planRecipientSend };
export type { RecipientSendPlan };

function smtpFailureReason(result: { ok: false; reason: string; detail?: string }): string {
  const detail = result.detail?.replace(/\bpass(word)?=[^,\s]+/gi, "password=[redacted]") ?? "";
  if (!detail) return result.reason;
  return `${result.reason}:${detail.slice(0, 180)}`;
}

export async function sendToRecipient(
  recipientId: string,
  options?: {
    skipIfAlreadySent?: boolean;
    enforceMarketingConsent?: boolean;
    sendLanguageMode?: SendLanguageMode;
  },
): Promise<{
  ok: boolean;
  reason?: string;
  email?: string;
  smtpCalled: boolean;
  skipped?: boolean;
  plan?: RecipientSendPlan;
}> {
  let packed = await loadRecipientForSend(recipientId);
  if (!packed) return { ok: false, reason: "recipient_not_found", smtpCalled: false };

  if (options?.skipIfAlreadySent && packed.recipient.status === "sent") {
    return {
      ok: true,
      skipped: true,
      reason: "already_sent",
      email: packed.recipient.email as string,
      smtpCalled: false,
    };
  }

  if (options?.enforceMarketingConsent) {
    const consent = await loadMarketingConsentMap([packed.recipient.email as string]);
    const key = String(packed.recipient.email).trim().toLowerCase();
    const entry = consent.get(key) ?? { newsletterSubscribed: false, unsubscribed: false };
    if (!hasMarketingEmailConsent({ email: packed.recipient.email as string, ...entry })) {
      await recordSendResult({
        campaignId: packed.campaign.id as string,
        recipientId,
        ok: false,
        reason: "marketing_consent_missing",
      });
      return {
        ok: false,
        reason: "marketing_consent_missing",
        email: packed.recipient.email as string,
        smtpCalled: false,
      };
    }
  }

  if (!packed.destinationsOk.ok) {
    const reminted = await remintClickTokensIfInvalid(recipientId);
    if (reminted) packed = await loadRecipientForSend(recipientId);
  }
  if (!packed) return { ok: false, reason: "recipient_not_found", smtpCalled: false };

  const sendLanguage = resolveSendLanguage(options?.sendLanguageMode ?? "automatic", packed.recipient.language as string);
  const plan = planRecipientSend({
    email: packed.recipient.email as string,
    language: sendLanguage,
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

  const selected = selectCampaignContent(sendLanguage, {
    subjectEn: packed.campaign.subject_en as string,
    subjectEt: packed.campaign.subject_et as string,
    htmlEn: packed.campaign.html_en as string,
    htmlEt: packed.campaign.html_et as string,
  });
  const unsubscribeToken =
    (packed.recipient.unsubscribe_token as string | null | undefined) ?? (await ensureUnsubscribeToken(recipientId));
  const { html, text } = personalizeCampaignHtml({
    htmlEn: packed.campaign.html_en as string,
    htmlEt: packed.campaign.html_et as string,
    language: sendLanguage,
    openToken: packed.recipient.open_token as string,
    clickTokens: packed.clickTokens,
    origin: origin.origin,
    unsubscribeToken,
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

export async function sendTestCampaign(
  campaignId: string,
  recipientIds: string[],
  sendLanguageMode: SendLanguageMode = "automatic",
): Promise<{
  ok: boolean;
  sent: number;
  failed: number;
  sentEstonian: number;
  sentEnglish: number;
  sendLanguageMode: SendLanguageMode;
  deliveries: Array<{ email?: string; language?: string; subject?: string; template?: "ET" | "EN" }>;
  failures: Array<{ email?: string; reason: string }>;
  blocked?: string;
}> {
  const mode = parseSendLanguageMode(sendLanguageMode);
  const first = recipientIds[0] ? await loadRecipientForSend(recipientIds[0]) : null;
  const status = first?.campaign.status as string | undefined;
  if (status === "sending") {
    return {
      ok: false,
      sent: 0,
      failed: 0,
      sentEstonian: 0,
      sentEnglish: 0,
      sendLanguageMode: mode,
      deliveries: [],
      failures: [],
      blocked: "Campaign is currently sending. Wait for that run to finish before sending a test.",
    };
  }

  let sent = 0;
  let failed = 0;
  const failures: Array<{ email?: string; reason: string }> = [];
  const deliveries: Array<{ email?: string; language?: string; subject?: string; template?: "ET" | "EN" }> = [];
  for (const id of recipientIds) {
    const result = await sendToRecipient(id, { sendLanguageMode: mode });
    if (result.ok) {
      sent += 1;
      deliveries.push({
        email: result.email,
        language: result.plan?.language,
        subject: result.plan?.subject,
        template: result.plan?.template,
      });
    } else {
      failed += 1;
      failures.push({ email: result.email, reason: result.reason ?? "send_failed" });
    }
  }
  const byLang = countSentByTemplate(deliveries.map((row) => row.template));
  await markCampaignStatus(campaignId, sent > 0 ? "test_sent" : status === "test_sent" ? "test_sent" : "draft");
  return { ok: sent > 0, sent, failed, ...byLang, sendLanguageMode: mode, deliveries, failures };
}

async function sendClaimedRecipient(recipientId: string, sendLanguageMode: SendLanguageMode): Promise<"sent" | "failed" | "skipped"> {
  const claim = await claimRecipientForSend(recipientId);
  if (claim === "skip_sent") return "skipped";
  if (claim === "missing") return "failed";
  const result = await sendToRecipient(recipientId, {
    skipIfAlreadySent: true,
    enforceMarketingConsent: true,
    sendLanguageMode,
  });
  if (result.skipped) return "skipped";
  return result.ok ? "sent" : "failed";
}

export async function sendCampaignNextBatch(input: {
  campaignId: string;
  mode: SendMode;
  confirm: boolean;
  continueExisting?: boolean;
  leaseId?: string;
  sendLanguageMode?: SendLanguageMode;
}): Promise<{
  ok: boolean;
  blocked?: string;
  leaseId?: string;
  done: boolean;
  delayMs: number;
  batchSize: number;
  remaining: number;
  sent: number;
  failed: number;
  skipped: number;
  campaignStatus?: string;
}> {
  const config = campaignBatchConfig();
  if (!input.confirm && !input.continueExisting) {
    return { ok: false, blocked: "Bulk send requires explicit confirmation.", done: true, delayMs: config.delayMs, batchSize: config.size, remaining: 0, sent: 0, failed: 0, skipped: 0 };
  }

  const leaseId = input.leaseId ?? randomUUID();
  if (!input.continueExisting) {
    const claimed = await claimCampaignSendLease(input.campaignId, leaseId);
    if (!claimed.ok) {
      return { ok: false, blocked: claimed.reason, done: true, delayMs: config.delayMs, batchSize: config.size, remaining: 0, sent: 0, failed: 0, skipped: 0 };
    }
    if (input.mode === "resume") {
      await resetStaleSendingRecipients(input.campaignId);
    }
  } else {
    const claimed = await claimCampaignSendLease(input.campaignId, leaseId);
    if (!claimed.ok) {
      return { ok: false, blocked: claimed.reason, done: true, delayMs: config.delayMs, batchSize: config.size, remaining: 0, sent: 0, failed: 0, skipped: 0 };
    }
  }

  await refreshCampaignSendLease(input.campaignId, leaseId);
  const ids = await sendableRecipientIds(input.campaignId, input.mode);
  if (ids.length === 0) {
    const campaignStatus = await finalizeBulkCampaignStatus(input.campaignId);
    await releaseCampaignSendLease(input.campaignId, leaseId);
    return { ok: true, leaseId, done: true, delayMs: config.delayMs, batchSize: config.size, remaining: 0, sent: 0, failed: 0, skipped: 0, campaignStatus };
  }

  const sendLanguageMode = parseSendLanguageMode(input.sendLanguageMode);
  const batch = chunkIds(ids, config.size)[0] ?? [];
  const stats = await runSequentialSends(batch, (id) => sendClaimedRecipient(id, sendLanguageMode));
  const remainingIds = await sendableRecipientIds(input.campaignId, input.mode);
  if (remainingIds.length === 0) {
    const campaignStatus = await finalizeBulkCampaignStatus(input.campaignId);
    await releaseCampaignSendLease(input.campaignId, leaseId);
    return { ok: true, leaseId, done: true, delayMs: config.delayMs, batchSize: config.size, remaining: 0, ...stats, campaignStatus };
  }

  await refreshCampaignSendLease(input.campaignId, leaseId);
  return {
    ok: true,
    leaseId,
    done: false,
    delayMs: config.delayMs,
    batchSize: config.size,
    remaining: remainingIds.length,
    ...stats,
    campaignStatus: "sending",
  };
}

export async function sendCampaignBatched(campaignId: string, recipientIds: string[]): Promise<void> {
  const config = campaignBatchConfig();
  for (const batch of chunkIds(recipientIds, config.size)) {
    await runSequentialSends(batch, async (id) => {
      const result = await sendToRecipient(id, { skipIfAlreadySent: true });
      if (result.skipped) return "skipped";
      return result.ok ? "sent" : "failed";
    });
  }
  await finalizeBulkCampaignStatus(campaignId);
}
