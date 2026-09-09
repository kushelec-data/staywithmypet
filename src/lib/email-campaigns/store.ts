import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { campaignLanguageFromPreferredLocale, type CampaignLanguage } from "@/lib/email-campaigns/locale";
import {
  DEFAULT_TEST_RECIPIENTS,
  ESTONIAN_TEST_RECIPIENTS,
  RESEND_TEST_RECIPIENTS,
  SEPTEMBER_ESTONIAN_CAMPAIGN_NAME,
  SEPTEMBER_SUBJECT_EN,
  SEPTEMBER_SUBJECT_ET,
  SEPTEMBER_TEMPLATE_KEY,
  trackedLinksFromTemplateConfig,
  type CampaignTrackedLink,
} from "@/lib/email-campaigns/events";
import { defaultSeptemberBodies } from "@/lib/email-campaigns/html";
import { campaignEmailAssetUrl } from "@/lib/email-campaigns/public-base";
import { createOpaqueToken } from "@/lib/email-campaigns/tokens";
import {
  applyClickTracking,
  applyOpenTracking,
  sendOutcomeUpdate,
  summarizeCampaignRecipients,
} from "@/lib/email-campaigns/tracking";
import { clickRedirectFromTokenRow, clickTokensMatchCatalog, isSafeCampaignDestination } from "@/lib/email-campaigns/destinations";
import { toRecipientDto, type CampaignEventDto, type CampaignListItemDto, type CampaignRecipientDto } from "@/lib/email-campaigns/dto";
import {
  mergeSeptemberTemplateConfig,
  type CampaignTemplateConfig,
} from "@/lib/email-campaigns/template-config";

type AdminDb = NonNullable<ReturnType<typeof createAdminClient>>;

function db(): AdminDb | null {
  return createAdminClient();
}

export type NewRecipientInput = {
  displayName: string;
  email: string;
  language?: CampaignLanguage;
  userId?: string | null;
};

export async function listCampaignSummaries(): Promise<CampaignListItemDto[] | null> {
  const admin = db();
  if (!admin) return null;

  const { data: campaigns, error } = await admin
    .from("email_campaigns")
    .select("id, name, status, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[email-campaigns] list", error.message);
    return null;
  }

  const ids = (campaigns ?? []).map((row) => row.id as string);
  if (ids.length === 0) return [];

  const { data: recipients } = await admin
    .from("email_campaign_recipients")
    .select("campaign_id, status, first_opened_at, first_clicked_at")
    .in("campaign_id", ids);

  const byCampaign = new Map<string, Array<{ status: string; first_opened_at: string | null; first_clicked_at: string | null }>>();
  for (const row of recipients ?? []) {
    const key = row.campaign_id as string;
    const list = byCampaign.get(key) ?? [];
    list.push({
      status: row.status as string,
      first_opened_at: row.first_opened_at as string | null,
      first_clicked_at: row.first_clicked_at as string | null,
    });
    byCampaign.set(key, list);
  }

  return (campaigns ?? []).map((campaign) => {
    const stats = summarizeCampaignRecipients(byCampaign.get(campaign.id as string) ?? []);
    return {
      id: campaign.id as string,
      name: campaign.name as string,
      status: campaign.status as string,
      recipients: stats.recipients,
      sent: stats.sent,
      opened: stats.opened,
      clicked: stats.uniqueClicks,
      failed: stats.failed,
      createdAt: campaign.created_at as string,
    };
  });
}

export type CampaignDetailDto = {
  id: string;
  name: string;
  status: string;
  subjectEn: string;
  subjectEt: string;
  htmlEn: string;
  htmlEt: string;
  createdAt: string;
  summary: ReturnType<typeof summarizeCampaignRecipients>;
  recipients: CampaignRecipientDto[];
};

export async function getCampaignDetail(campaignId: string): Promise<CampaignDetailDto | null> {
  const admin = db();
  if (!admin) return null;

  const { data: campaign, error } = await admin
    .from("email_campaigns")
    .select("id, name, status, subject_en, subject_et, html_en, html_et, created_at")
    .eq("id", campaignId)
    .maybeSingle();
  if (error || !campaign) return null;

  const { data: recipients } = await admin
    .from("email_campaign_recipients")
    .select(
      "id, display_name, email, language, status, sent_at, first_opened_at, first_clicked_at, last_opened_at, last_clicked_at, last_clicked_link_key, failure_reason",
    )
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true });

  const rows = recipients ?? [];
  return {
    id: campaign.id as string,
    name: campaign.name as string,
    status: campaign.status as string,
    subjectEn: campaign.subject_en as string,
    subjectEt: campaign.subject_et as string,
    htmlEn: campaign.html_en as string,
    htmlEt: campaign.html_et as string,
    createdAt: campaign.created_at as string,
    summary: summarizeCampaignRecipients(rows as Array<{ status: string; first_opened_at: string | null; first_clicked_at: string | null }>),
    recipients: rows.map((row) => toRecipientDto(row as Parameters<typeof toRecipientDto>[0])),
  };
}

export async function getRecipientActivity(
  campaignId: string,
  recipientId: string,
): Promise<{ recipient: CampaignRecipientDto; events: CampaignEventDto[] } | null> {
  const admin = db();
  if (!admin) return null;

  const { data: recipient } = await admin
    .from("email_campaign_recipients")
    .select(
      "id, campaign_id, display_name, email, language, status, sent_at, first_opened_at, first_clicked_at, last_opened_at, last_clicked_at, last_clicked_link_key, failure_reason",
    )
    .eq("id", recipientId)
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (!recipient) return null;

  let eventsQuery: { data: Array<Record<string, unknown>> | null; error: { message: string } | null };
  eventsQuery = await admin
    .from("email_campaign_events")
    .select("id, event_type, link_key, link_type, link_label, created_at")
    .eq("recipient_id", recipientId)
    .order("created_at", { ascending: true });
  if (eventsQuery.error) {
    eventsQuery = await admin
      .from("email_campaign_events")
      .select("id, event_type, link_key, created_at")
      .eq("recipient_id", recipientId)
      .order("created_at", { ascending: true });
  }
  const events = eventsQuery.data;

  return {
    recipient: toRecipientDto(recipient as Parameters<typeof toRecipientDto>[0]),
    events: (events ?? []).map((event) => ({
      id: String(event.id),
      type: String(event.event_type),
      at: String(event.created_at),
      linkKey: (event.link_key as string | null) ?? null,
      linkType: (event.link_type as string | null) ?? null,
      linkLabel: (event.link_label as string | null) ?? null,
    })),
  };
}

async function insertRecipientWithTokens(
  admin: AdminDb,
  campaignId: string,
  recipient: NewRecipientInput,
  trackedLinks: CampaignTrackedLink[],
) {
  const language = recipient.language ?? "en";
  const openToken = createOpaqueToken();
  const { data: inserted, error } = await admin
    .from("email_campaign_recipients")
    .insert({
      campaign_id: campaignId,
      user_id: recipient.userId ?? null,
      display_name: recipient.displayName.trim(),
      email: recipient.email.trim().toLowerCase(),
      language,
      open_token: openToken,
    })
    .select("id")
    .single();
  if (error || !inserted) throw new Error(error?.message ?? "recipient_insert_failed");

  const clickRows = trackedLinks.map((link) => ({
    token: createOpaqueToken(),
    recipient_id: inserted.id as string,
    link_key: link.key,
    link_type: link.type,
    label: link.label,
    destination_url: link.destinationUrl,
  }));
  const { error: clickError } = await admin.from("email_campaign_click_tokens").insert(clickRows);
  if (clickError) {
    const fallback = clickRows.map(({ link_type: _t, label: _l, ...row }) => row);
    const retry = await admin.from("email_campaign_click_tokens").insert(fallback);
    if (retry.error) throw new Error(retry.error.message);
  }
  return inserted.id as string;
}

export async function createCampaign(input: {
  name: string;
  subjectEn: string;
  subjectEt: string;
  htmlEn: string;
  htmlEt: string;
  createdBy: string;
  recipients: NewRecipientInput[];
  templateKey?: string;
  templateConfig?: CampaignTemplateConfig;
}): Promise<{ id: string } | { error: string }> {
  const admin = db();
  if (!admin) return { error: "Unavailable" };
  if (input.recipients.length === 0) return { error: "Select at least one recipient" };

  const templateConfig = mergeSeptemberTemplateConfig(input.templateConfig);
  for (const sponsor of templateConfig.sponsors) {
    if (sponsor.destinationUrl && !isSafeCampaignDestination(sponsor.destinationUrl)) {
      return { error: `Unsafe sponsor URL for ${sponsor.label}` };
    }
  }
  const trackedLinks = trackedLinksFromTemplateConfig(templateConfig);

  const payload: Record<string, unknown> = {
    name: input.name.trim(),
    subject_en: input.subjectEn,
    subject_et: input.subjectEt,
    html_en: input.htmlEn,
    html_et: input.htmlEt,
    template_key: input.templateKey ?? null,
    created_by: input.createdBy,
    status: "draft",
    template_config: templateConfig,
  };

  let campaignInsert = await admin.from("email_campaigns").insert(payload).select("id").single();
  if (campaignInsert.error && /template_config/i.test(campaignInsert.error.message)) {
    const { template_config: _omit, ...withoutConfig } = payload;
    void _omit;
    campaignInsert = await admin.from("email_campaigns").insert(withoutConfig).select("id").single();
  }
  const { data: campaign, error } = campaignInsert;
  if (error || !campaign) return { error: error?.message ?? "create_failed" };

  try {
    for (const recipient of input.recipients) {
      await insertRecipientWithTokens(admin, campaign.id as string, recipient, trackedLinks);
    }
  } catch (error) {
    await admin.from("email_campaigns").delete().eq("id", campaign.id);
    return { error: error instanceof Error ? error.message : "recipients_failed" };
  }

  return { id: campaign.id as string };
}

export async function createSeptemberTestDraft(
  createdBy: string,
  templateConfig?: CampaignTemplateConfig,
): Promise<{ id: string } | { error: string }> {
  const config = mergeSeptemberTemplateConfig(templateConfig);
  const bodies = defaultSeptemberBodies(campaignEmailAssetUrl("/logo.png"), config);
  return createCampaign({
    name: "September community events (test)",
    subjectEn: SEPTEMBER_SUBJECT_EN,
    subjectEt: SEPTEMBER_SUBJECT_ET,
    htmlEn: bodies.htmlEn,
    htmlEt: bodies.htmlEt,
    createdBy,
    templateKey: SEPTEMBER_TEMPLATE_KEY,
    templateConfig: config,
    recipients: DEFAULT_TEST_RECIPIENTS.map((row) => ({
      displayName: row.displayName,
      email: row.email,
      language: row.language,
    })),
  });
}

export async function createSeptemberEstonianDraft(
  createdBy: string,
  templateConfig?: CampaignTemplateConfig,
): Promise<{ id: string } | { error: string }> {
  const config = mergeSeptemberTemplateConfig(templateConfig);
  const bodies = defaultSeptemberBodies(campaignEmailAssetUrl("/logo.png"), config);
  return createCampaign({
    name: SEPTEMBER_ESTONIAN_CAMPAIGN_NAME,
    subjectEn: SEPTEMBER_SUBJECT_EN,
    subjectEt: SEPTEMBER_SUBJECT_ET,
    htmlEn: bodies.htmlEn,
    htmlEt: bodies.htmlEt,
    createdBy,
    templateKey: SEPTEMBER_TEMPLATE_KEY,
    templateConfig: config,
    recipients: ESTONIAN_TEST_RECIPIENTS.map((row) => ({
      displayName: row.displayName,
      email: row.email,
      language: row.language,
    })),
  });
}

export async function createSeptemberResendTest(
  createdBy: string,
  templateConfig?: CampaignTemplateConfig,
): Promise<{ id: string } | { error: string }> {
  const config = mergeSeptemberTemplateConfig(templateConfig);
  const bodies = defaultSeptemberBodies(campaignEmailAssetUrl("/logo.png"), config);
  return createCampaign({
    name: "September community events (resend test)",
    subjectEn: SEPTEMBER_SUBJECT_EN,
    subjectEt: SEPTEMBER_SUBJECT_ET,
    htmlEn: bodies.htmlEn,
    htmlEt: bodies.htmlEt,
    createdBy,
    templateKey: SEPTEMBER_TEMPLATE_KEY,
    templateConfig: config,
    recipients: RESEND_TEST_RECIPIENTS.map((row) => ({
      displayName: row.displayName,
      email: row.email,
      language: row.language,
    })),
  });
}

export async function resolveRegisteredUserRecipients(userIds: string[]): Promise<NewRecipientInput[]> {
  const admin = db();
  if (!admin || userIds.length === 0) return [];

  const unique = [...new Set(userIds)];
  const { data: profiles } = await admin.from("profiles").select("id, display_name").in("id", unique);
  const results: NewRecipientInput[] = [];

  for (const id of unique) {
    const { data } = await admin.auth.admin.getUserById(id);
    const user = data.user;
    const email = user?.email;
    if (!user || !email) continue;
    const meta = user.user_metadata as Record<string, unknown> | undefined;
    const stored = typeof meta?.swmp_locale === "string" ? meta.swmp_locale : typeof meta?.locale === "string" ? meta.locale : null;
    const profile = (profiles ?? []).find((row) => row.id === id);
    results.push({
      userId: id,
      email,
      displayName: (profile?.display_name as string | undefined)?.trim() || email,
      language: campaignLanguageFromPreferredLocale(stored),
    });
  }
  return results;
}

export async function loadRecipientForSend(recipientId: string) {
  const admin = db();
  if (!admin) return null;
  const { data: recipient } = await admin
    .from("email_campaign_recipients")
    .select("id, campaign_id, email, display_name, language, open_token, status")
    .eq("id", recipientId)
    .maybeSingle();
  if (!recipient) return null;

  let campaignQuery = await admin
    .from("email_campaigns")
    .select("id, subject_en, subject_et, html_en, html_et, status, template_config")
    .eq("id", recipient.campaign_id)
    .maybeSingle();
  if (campaignQuery.error) {
    campaignQuery = await admin
      .from("email_campaigns")
      .select("id, subject_en, subject_et, html_en, html_et, status")
      .eq("id", recipient.campaign_id)
      .maybeSingle();
  }
  const campaign = campaignQuery.data;
  if (!campaign) return null;
  const catalog = trackedLinksFromTemplateConfig(
    mergeSeptemberTemplateConfig("template_config" in campaign ? campaign.template_config : undefined),
  );

  let clickQuery: { data: Array<Record<string, unknown>> | null; error: { message: string } | null };
  clickQuery = await admin
    .from("email_campaign_click_tokens")
    .select("token, link_key, destination_url, link_type, label")
    .eq("recipient_id", recipientId);
  if (clickQuery.error) {
    clickQuery = await admin
      .from("email_campaign_click_tokens")
      .select("token, link_key, destination_url")
      .eq("recipient_id", recipientId);
  }

  const clicks = clickQuery.data;
  const clickRows = (clicks ?? []).map((row) => ({
    token: row.token as string,
    link_key: row.link_key as string,
    destination_url: row.destination_url as string,
  }));
  const destinationsOk = clickTokensMatchCatalog(clickRows, catalog);

  return {
    recipient,
    campaign,
    clickTokens: Object.fromEntries(clickRows.map((row) => [row.link_key, row.token])),
    clickRows,
    destinationsOk,
  };
}

export async function remintClickTokensIfInvalid(recipientId: string): Promise<boolean> {
  const packed = await loadRecipientForSend(recipientId);
  if (!packed) return false;
  if (packed.destinationsOk.ok) return false;
  const admin = db();
  if (!admin) return false;
  const templateConfig = mergeSeptemberTemplateConfig(
    "template_config" in packed.campaign ? packed.campaign.template_config : undefined,
  );
  const trackedLinks = trackedLinksFromTemplateConfig(templateConfig);
  await admin.from("email_campaign_click_tokens").delete().eq("recipient_id", recipientId);
  const clickRows = trackedLinks.map((link) => ({
    token: createOpaqueToken(),
    recipient_id: recipientId,
    link_key: link.key,
    link_type: link.type,
    label: link.label,
    destination_url: link.destinationUrl,
  }));
  const { error: clickError } = await admin.from("email_campaign_click_tokens").insert(clickRows);
  if (clickError) {
    const fallback = clickRows.map(({ link_type: _t, label: _l, ...row }) => row);
    const retry = await admin.from("email_campaign_click_tokens").insert(fallback);
    if (retry.error) return false;
  }
  return true;
}

export async function recordSendResult(input: {
  campaignId: string;
  recipientId: string;
  ok: boolean;
  reason?: string;
}) {
  const admin = db();
  if (!admin) return;
  const now = new Date().toISOString();
  const outcome = sendOutcomeUpdate(input.ok, input.reason);
  if (input.ok) {
    await admin
      .from("email_campaign_recipients")
      .update({ status: outcome.status, sent_at: now, failure_reason: null })
      .eq("id", input.recipientId);
    await admin.from("email_campaign_events").insert({
      campaign_id: input.campaignId,
      recipient_id: input.recipientId,
      event_type: "sent",
    });
    return;
  }
  await admin
    .from("email_campaign_recipients")
    .update({ status: outcome.status, failure_reason: outcome.failure_reason })
    .eq("id", input.recipientId);
  await admin.from("email_campaign_events").insert({
    campaign_id: input.campaignId,
    recipient_id: input.recipientId,
    event_type: "failed",
  });
}

export async function markCampaignStatus(campaignId: string, status: string) {
  const admin = db();
  if (!admin) return;
  await admin.from("email_campaigns").update({ status, updated_at: new Date().toISOString() }).eq("id", campaignId);
}

export async function recordOpenByToken(token: string): Promise<boolean> {
  const admin = db();
  if (!admin) return false;
  const { data: recipient } = await admin
    .from("email_campaign_recipients")
    .select("id, campaign_id, first_opened_at, last_opened_at, first_clicked_at, last_clicked_at, click_count, last_clicked_link_key")
    .eq("open_token", token)
    .maybeSingle();
  if (!recipient) return false;

  const now = new Date().toISOString();
  const next = applyOpenTracking(
    {
      first_opened_at: recipient.first_opened_at as string | null,
      last_opened_at: recipient.last_opened_at as string | null,
      first_clicked_at: recipient.first_clicked_at as string | null,
      last_clicked_at: recipient.last_clicked_at as string | null,
      click_count: (recipient.click_count as number) ?? 0,
      last_clicked_link_key: recipient.last_clicked_link_key as string | null,
    },
    now,
  );
  await admin.from("email_campaign_recipients").update(next).eq("id", recipient.id);
  await admin.from("email_campaign_events").insert({
    campaign_id: recipient.campaign_id,
    recipient_id: recipient.id,
    event_type: "opened",
  });
  return true;
}

export async function recordClickByToken(token: string): Promise<{ destinationUrl: string; linkType: string | null; linkLabel: string | null } | null> {
  const admin = db();
  if (!admin) return null;
  let clickLookup = await admin
    .from("email_campaign_click_tokens")
    .select("recipient_id, link_key, destination_url, link_type, label")
    .eq("token", token)
    .maybeSingle();
  if (clickLookup.error) {
    clickLookup = await admin
      .from("email_campaign_click_tokens")
      .select("recipient_id, link_key, destination_url")
      .eq("token", token)
      .maybeSingle();
  }
  const click = clickLookup.data;
  if (!click) return null;

  const destinationUrl = clickRedirectFromTokenRow(
    { destination_url: click.destination_url as string, link_key: click.link_key as string },
    null,
  );
  if (!destinationUrl) return null;

  const { data: recipient } = await admin
    .from("email_campaign_recipients")
    .select("id, campaign_id, first_opened_at, last_opened_at, first_clicked_at, last_clicked_at, click_count, last_clicked_link_key")
    .eq("id", click.recipient_id)
    .maybeSingle();
  if (!recipient) return null;

  const now = new Date().toISOString();
  const next = applyClickTracking(
    {
      first_opened_at: recipient.first_opened_at as string | null,
      last_opened_at: recipient.last_opened_at as string | null,
      first_clicked_at: recipient.first_clicked_at as string | null,
      last_clicked_at: recipient.last_clicked_at as string | null,
      click_count: (recipient.click_count as number) ?? 0,
      last_clicked_link_key: recipient.last_clicked_link_key as string | null,
    },
    now,
    click.link_key as string,
  );
  await admin.from("email_campaign_recipients").update(next).eq("id", recipient.id);
  const eventInsert = await admin.from("email_campaign_events").insert({
    campaign_id: recipient.campaign_id,
    recipient_id: recipient.id,
    event_type: "clicked",
    link_key: click.link_key,
    link_type: "link_type" in click ? (click.link_type as string | null) ?? null : null,
    link_label: "label" in click ? (click.label as string | null) ?? null : null,
    destination_url: destinationUrl,
  });
  if (eventInsert.error) {
    await admin.from("email_campaign_events").insert({
      campaign_id: recipient.campaign_id,
      recipient_id: recipient.id,
      event_type: "clicked",
      link_key: click.link_key,
      destination_url: destinationUrl,
    });
  }
  return {
    destinationUrl,
    linkType: "link_type" in click ? ((click.link_type as string | null) ?? null) : null,
    linkLabel: "label" in click ? ((click.label as string | null) ?? null) : null,
  };
}
