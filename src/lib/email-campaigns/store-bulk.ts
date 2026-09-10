import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { campaignLanguageFromPreferredLocale, type CampaignLanguage } from "@/lib/email-campaigns/locale";
import { trackedLinksFromTemplateConfig } from "@/lib/email-campaigns/events";
import { mergeSeptemberTemplateConfig } from "@/lib/email-campaigns/template-config";
import { hasMarketingEmailConsent, normalizeMarketingEmail } from "@/lib/email-campaigns/marketing-consent";
import {
  deriveBulkCampaignStatus,
  isSendLeaseActive,
  type SendMode,
  selectSendableRecipientIds,
} from "@/lib/email-campaigns/send-queue";
import { addCampaignRecipientWithTokens, type CampaignDetailDto, type NewRecipientInput } from "@/lib/email-campaigns/store";
import { resolveDuplicateRecipientImport } from "@/lib/email-campaigns/recipient-upsert";

type AdminDb = NonNullable<ReturnType<typeof createAdminClient>>;

function db(): AdminDb | null {
  return createAdminClient();
}

export async function loadMarketingConsentMap(emails: string[]): Promise<Map<string, { newsletterSubscribed: boolean; unsubscribed: boolean }>> {
  const admin = db();
  const map = new Map<string, { newsletterSubscribed: boolean; unsubscribed: boolean }>();
  const unique = [...new Set(emails.map(normalizeMarketingEmail).filter(Boolean))];
  for (const email of unique) {
    map.set(email, { newsletterSubscribed: false, unsubscribed: false });
  }
  if (!admin || unique.length === 0) return map;

  const { data: news } = await admin.from("newsletter_subscribers").select("email").in("email", unique);
  for (const row of news ?? []) {
    const email = normalizeMarketingEmail(String(row.email));
    const current = map.get(email) ?? { newsletterSubscribed: false, unsubscribed: false };
    map.set(email, { ...current, newsletterSubscribed: true });
  }
  const unsub = await admin.from("email_marketing_unsubscribes").select("email").in("email", unique);
  if (!unsub.error) {
    for (const row of unsub.data ?? []) {
      const email = normalizeMarketingEmail(String(row.email));
      const current = map.get(email) ?? { newsletterSubscribed: false, unsubscribed: false };
      map.set(email, { ...current, unsubscribed: true });
    }
  }
  return map;
}

export async function isEmailUnsubscribed(email: string): Promise<boolean> {
  const map = await loadMarketingConsentMap([email]);
  return map.get(normalizeMarketingEmail(email))?.unsubscribed === true;
}

export async function recordMarketingUnsubscribe(email: string): Promise<boolean> {
  const admin = db();
  if (!admin) return false;
  const normalized = normalizeMarketingEmail(email);
  const { error } = await admin.from("email_marketing_unsubscribes").upsert({
    email: normalized,
    unsubscribed_at: new Date().toISOString(),
    source: "campaign_link",
  });
  return !error;
}

export async function findRecipientByUnsubscribeToken(token: string) {
  const admin = db();
  if (!admin) return null;
  const { data, error } = await admin
    .from("email_campaign_recipients")
    .select("id, email, language")
    .eq("unsubscribe_token", token)
    .maybeSingle();
  if (error || !data) return null;
  return { id: data.id as string, email: data.email as string, language: data.language as string };
}

export type RegisteredAudienceRow = {
  userId: string;
  email: string;
  displayName: string;
  language: CampaignLanguage;
  consented: boolean;
};

export async function listRegisteredCampaignAudience(): Promise<{
  all: RegisteredAudienceRow[];
  estonian: number;
  english: number;
  consented: number;
} | null> {
  const admin = db();
  if (!admin) return null;
  const rows: RegisteredAudienceRow[] = [];
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) break;
    const batch = data.users ?? [];
    for (const user of batch) {
      const email = user.email?.trim().toLowerCase();
      if (!email) continue;
      const bannedUntil = (user as { banned_until?: string | null }).banned_until;
      if (bannedUntil && Date.parse(bannedUntil) > Date.now()) continue;
      const meta = user.user_metadata as Record<string, unknown> | undefined;
      const stored = typeof meta?.swmp_locale === "string" ? meta.swmp_locale : typeof meta?.locale === "string" ? meta.locale : null;
      rows.push({
        userId: user.id,
        email,
        displayName: email,
        language: campaignLanguageFromPreferredLocale(stored),
        consented: false,
      });
    }
    if (batch.length < 1000) break;
    page += 1;
  }
  const ids = rows.map((row) => row.userId);
  if (ids.length > 0) {
    const { data: profiles } = await admin.from("profiles").select("id, display_name").in("id", ids);
    const names = new Map((profiles ?? []).map((row) => [row.id as string, String(row.display_name ?? "").trim()]));
    for (const row of rows) {
      row.displayName = names.get(row.userId) || row.email;
    }
  }
  const consent = await loadMarketingConsentMap(rows.map((row) => row.email));
  for (const row of rows) {
    const entry = consent.get(row.email) ?? { newsletterSubscribed: false, unsubscribed: false };
    row.consented = hasMarketingEmailConsent({ email: row.email, ...entry });
  }
  return {
    all: rows,
    estonian: rows.filter((row) => row.language === "et").length,
    english: rows.filter((row) => row.language !== "et").length,
    consented: rows.filter((row) => row.consented).length,
  };
}

export function recipientsForRegisteredFilter(
  rows: RegisteredAudienceRow[],
  filter: "all" | "et" | "en",
): RegisteredAudienceRow[] {
  if (filter === "et") return rows.filter((row) => row.language === "et");
  if (filter === "en") return rows.filter((row) => row.language !== "et");
  return rows;
}

export async function addRecipientsToExistingCampaign(
  campaignId: string,
  recipients: NewRecipientInput[],
): Promise<{ added: number; skipped: number; error?: string }> {
  const admin = db();
  if (!admin) return { added: 0, skipped: 0, error: "Unavailable" };
  const { data: campaign } = await admin.from("email_campaigns").select("id, status, template_config").eq("id", campaignId).maybeSingle();
  if (!campaign) return { added: 0, skipped: 0, error: "Not found" };
  if (!["draft", "test_sent", "partially_sent", "failed"].includes(String(campaign.status))) {
    return { added: 0, skipped: 0, error: "Recipients can only be added while the campaign is not sending." };
  }
  const links = trackedLinksFromTemplateConfig(mergeSeptemberTemplateConfig(campaign.template_config));
  let added = 0;
  let skipped = 0;
  for (const recipient of recipients) {
    const email = normalizeMarketingEmail(recipient.email);
    const { data: existing } = await admin
      .from("email_campaign_recipients")
      .select("id, status")
      .eq("campaign_id", campaignId)
      .eq("email", email)
      .maybeSingle();
    const action = resolveDuplicateRecipientImport(existing ? { status: String(existing.status) } : null);
    if (action === "skip_sent") {
      skipped += 1;
      continue;
    }
    if (action === "update_language" && existing) {
      const { error } = await admin
        .from("email_campaign_recipients")
        .update({
          language: recipient.language ?? "en",
          display_name: recipient.displayName,
          user_id: recipient.userId ?? null,
        })
        .eq("id", existing.id)
        .neq("status", "sent");
      if (error) skipped += 1;
      else added += 1;
      continue;
    }
    try {
      await addCampaignRecipientWithTokens(admin, campaignId, { ...recipient, email }, links);
      added += 1;
    } catch {
      skipped += 1;
    }
  }
  return { added, skipped };
}

export async function removeDraftRecipient(campaignId: string, recipientId: string): Promise<{ ok: boolean; error?: string }> {
  const admin = db();
  if (!admin) return { ok: false, error: "Unavailable" };
  const { data: campaign } = await admin.from("email_campaigns").select("status").eq("id", campaignId).maybeSingle();
  if (!campaign) return { ok: false, error: "Not found" };
  if (String(campaign.status) !== "draft" && String(campaign.status) !== "test_sent") {
    return { ok: false, error: "Recipients can only be removed from a draft." };
  }
  const { data: recipient } = await admin
    .from("email_campaign_recipients")
    .select("id, status")
    .eq("id", recipientId)
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (!recipient || recipient.status === "sent") return { ok: false, error: "Cannot remove a sent recipient." };
  const { error } = await admin.from("email_campaign_recipients").delete().eq("id", recipientId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

const LEASE_MS = 10 * 60_000;

export async function claimCampaignSendLease(
  campaignId: string,
  leaseId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const admin = db();
  if (!admin) return { ok: false, reason: "Unavailable" };
  const now = Date.now();
  let row = await admin
    .from("email_campaigns")
    .select("id, status, send_lease_id, send_lease_until")
    .eq("id", campaignId)
    .maybeSingle();
  if (row.error) {
    return { ok: false, reason: "Campaign lock columns missing. Apply the bulk-send migration." };
  }
  const campaign = row.data;
  if (!campaign) return { ok: false, reason: "Not found" };
  const lock = {
    status: String(campaign.status),
    leaseId: (campaign.send_lease_id as string | null) ?? null,
    leaseUntil: (campaign.send_lease_until as string | null) ?? null,
    nowIso: new Date(now).toISOString(),
  };
  if (lock.leaseId !== leaseId) {
    if (isSendLeaseActive(lock)) {
      return { ok: false, reason: "Campaign is already sending." };
    }
    if (lock.status === "sent" || lock.status === "cancelled") {
      return { ok: false, reason: "This campaign has already finished." };
    }
  }
  const until = new Date(now + LEASE_MS).toISOString();
  const { data: updated, error } = await admin
    .from("email_campaigns")
    .update({ status: "sending", send_lease_id: leaseId, send_lease_until: until, updated_at: new Date().toISOString() })
    .eq("id", campaignId)
    .select("id, send_lease_id")
    .maybeSingle();
  if (error || !updated) {
    return { ok: false, reason: error?.message ?? "lock_failed" };
  }
  if (updated.send_lease_id && updated.send_lease_id !== leaseId) {
    return { ok: false, reason: "Campaign is already sending." };
  }
  return { ok: true };
}

export async function refreshCampaignSendLease(campaignId: string, leaseId: string): Promise<void> {
  const admin = db();
  if (!admin) return;
  await admin
    .from("email_campaigns")
    .update({ send_lease_until: new Date(Date.now() + LEASE_MS).toISOString(), updated_at: new Date().toISOString() })
    .eq("id", campaignId)
    .eq("send_lease_id", leaseId);
}

export async function releaseCampaignSendLease(campaignId: string, leaseId: string): Promise<void> {
  const admin = db();
  if (!admin) return;
  await admin
    .from("email_campaigns")
    .update({ send_lease_id: null, send_lease_until: null, updated_at: new Date().toISOString() })
    .eq("id", campaignId)
    .eq("send_lease_id", leaseId);
}

export async function resetStaleSendingRecipients(campaignId: string): Promise<void> {
  const admin = db();
  if (!admin) return;
  await admin.from("email_campaign_recipients").update({ status: "pending" }).eq("campaign_id", campaignId).eq("status", "sending");
}

export async function claimRecipientForSend(recipientId: string): Promise<"claimed" | "skip_sent" | "missing"> {
  const admin = db();
  if (!admin) return "missing";
  const { data: current } = await admin.from("email_campaign_recipients").select("id, status").eq("id", recipientId).maybeSingle();
  if (!current) return "missing";
  if (current.status === "sent") return "skip_sent";
  const { data: claimed } = await admin
    .from("email_campaign_recipients")
    .update({ status: "sending" })
    .eq("id", recipientId)
    .in("status", ["pending", "failed", "sending"])
    .select("id")
    .maybeSingle();
  return claimed ? "claimed" : "skip_sent";
}

export async function listCampaignDeliveryRows(campaignId: string) {
  const admin = db();
  if (!admin) return [];
  const { data } = await admin
    .from("email_campaign_recipients")
    .select("id, email, language, status, sent_at, failure_reason")
    .eq("campaign_id", campaignId);
  return data ?? [];
}

export async function sendableRecipientIds(campaignId: string, mode: SendMode): Promise<string[]> {
  const rows = await listCampaignDeliveryRows(campaignId);
  return selectSendableRecipientIds(
    rows.map((row) => ({ id: row.id as string, status: row.status as string })),
    mode,
  );
}

export async function finalizeBulkCampaignStatus(campaignId: string): Promise<string> {
  const admin = db();
  if (!admin) return "draft";
  const rows = await listCampaignDeliveryRows(campaignId);
  const counts = {
    pending: rows.filter((row) => row.status === "pending").length,
    sending: rows.filter((row) => row.status === "sending").length,
    sent: rows.filter((row) => row.status === "sent").length,
    failed: rows.filter((row) => row.status === "failed").length,
    leaseActive: false,
  };
  const status = deriveBulkCampaignStatus(counts);
  const patch: Record<string, unknown> = { status, send_lease_id: null, send_lease_until: null, updated_at: new Date().toISOString() };
  if (status === "sent") patch.sent_at = new Date().toISOString();
  await admin.from("email_campaigns").update(patch).eq("id", campaignId);
  return status;
}

export async function attachRecipientConsent(detail: CampaignDetailDto): Promise<CampaignDetailDto> {
  const consent = await loadMarketingConsentMap(detail.recipients.map((row) => row.email));
  return {
    ...detail,
    recipients: detail.recipients.map((row) => {
      const entry = consent.get(row.email.trim().toLowerCase()) ?? { newsletterSubscribed: false, unsubscribed: false };
      return {
        ...row,
        consented: hasMarketingEmailConsent({ email: row.email, ...entry }),
        unsubscribed: entry.unsubscribed,
      };
    }),
  };
}

export async function claimDueScheduledCampaigns(nowIso = new Date().toISOString()): Promise<Array<{ id: string; leaseId: string }>> {
  const admin = db();
  if (!admin) return [];
  const { data: due, error } = await admin
    .from("email_campaigns")
    .select("id, status, scheduled_at, send_lease_id, send_lease_until")
    .eq("status", "scheduled")
    .lte("scheduled_at", nowIso);
  if (error || !due?.length) return [];
  const claimed: Array<{ id: string; leaseId: string }> = [];
  const until = new Date(Date.now() + LEASE_MS).toISOString();
  for (const row of due) {
    const leaseId = crypto.randomUUID();
    const { data: updated } = await admin
      .from("email_campaigns")
      .update({
        status: "sending",
        send_lease_id: leaseId,
        send_lease_until: until,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .eq("status", "scheduled")
      .select("id, send_lease_id")
      .maybeSingle();
    if (updated?.send_lease_id === leaseId) {
      claimed.push({ id: String(updated.id), leaseId });
    }
  }
  return claimed;
}

export async function claimExpiredSendingCampaigns(): Promise<Array<{ id: string; leaseId: string }>> {
  const admin = db();
  if (!admin) return [];
  const nowIso = new Date().toISOString();
  const { data: rows, error } = await admin
    .from("email_campaigns")
    .select("id, status, send_lease_id, send_lease_until")
    .eq("status", "sending");
  if (error || !rows?.length) return [];
  const claimed: Array<{ id: string; leaseId: string }> = [];
  const until = new Date(Date.now() + LEASE_MS).toISOString();
  for (const row of rows) {
    const lock = {
      status: String(row.status),
      leaseId: (row.send_lease_id as string | null) ?? null,
      leaseUntil: (row.send_lease_until as string | null) ?? null,
      nowIso,
    };
    if (isSendLeaseActive(lock)) continue;
    const leaseId = crypto.randomUUID();
    const { data: updated } = await admin
      .from("email_campaigns")
      .update({
        send_lease_id: leaseId,
        send_lease_until: until,
        updated_at: nowIso,
      })
      .eq("id", row.id)
      .eq("status", "sending")
      .select("id, send_lease_id")
      .maybeSingle();
    if (updated?.send_lease_id === leaseId) claimed.push({ id: String(updated.id), leaseId });
  }
  return claimed;
}