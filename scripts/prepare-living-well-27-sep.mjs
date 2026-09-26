import { execFileSync } from "node:child_process";
import { readFileSync, unlinkSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

function loadEnvLocal() {
  const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const name = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[name]) process.env[name] = value;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const APPLY = process.argv.includes("--apply");
const CAMPAIGN_ID = "6e7d6007-f0c2-4213-9664-aa6010c2b3b8";
const FALLBACK_SOURCE_ID = "7a23c563-cf8d-4c47-8296-650d1a18fa12";
const ORIGINAL_SEPTEMBER_ID = "3adb8e7f-dcae-42a8-9975-8c2aeb22d5b1";
const CUTOFF = new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString();
const TEST_RECIPIENTS = [
  { displayName: "Gerly Kullamaa", email: "gerlykullamaa@gmail.com", language: "et" },
  { displayName: "Kush Chadha", email: "kusheducation@gmail.com", language: "en" },
];
const PLUS_RU_TEST = "kusheducation+ru@gmail.com";
const EVENT_27_SEP_URL = "https://www.facebook.com/events/28308835972092411/";
const TRACKED_LINKS = [
  { key: "event_13_sep", type: "event", label: "13 September event", destinationUrl: "https://www.facebook.com/events/s/hea-elu-koos-lemmikuga-loengud/934700659060911/?rdid=bWSOyPPSWwCm6vac&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F19h3m6ur2P%2F#" },
  { key: "event_20_sep", type: "event", label: "20 September event", destinationUrl: "https://www.facebook.com/events/3256274334761111/" },
  { key: "event_27_sep", type: "event", label: "27 September event", destinationUrl: EVENT_27_SEP_URL },
  { key: "sponsor_petcity", type: "sponsor", label: "PetCity", destinationUrl: "https://www.petcity.ee/" },
  { key: "sponsor_platinum", type: "sponsor", label: "Platinum", destinationUrl: "https://www.koeratoit.ee/" },
  { key: "sponsor_viwell", type: "sponsor", label: "ViWell", destinationUrl: "https://viwelldrinks.com/" },
  { key: "sponsor_semu", type: "sponsor", label: "Semu", destinationUrl: "https://semujuice.eu/en" },
  { key: "sponsor_yook", type: "sponsor", label: "YOOK", destinationUrl: "https://yook.eu/" },
  { key: "sponsor_gelato_ladies", type: "sponsor", label: "Gelato Ladies", destinationUrl: "https://www.gelatoladies.ee/" },
  { key: "sponsor_moon", type: "sponsor", label: "Moon", destinationUrl: "https://restoranmoon.ee/" },
  { key: "staywithmypet_website", type: "site", label: "StayWithMyPet.ee", destinationUrl: "https://www.staywithmypet.ee/" },
];
const PHOTOS = [
  "09-venue-wide.JPG",
  "01-event-wide.JPG",
  "10-guest-dog.JPG",
  "02-expert-talk.JPG",
  "03-community.JPG",
  "04-white-dog.JPG",
  "05-dog-and-guest.JPG",
  "06-dogs-meeting.JPG",
  "07-community-dog.JPG",
  "08-friendly-dogs.JPG",
];

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

function createOpaqueToken() {
  return randomBytes(32).toString("base64url");
}

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function campaignLanguageFromPreferredLocale(locale) {
  const normalized = String(locale ?? "").trim().toLowerCase();
  if (normalized === "et" || normalized === "et-ee") return "et";
  if (normalized === "ru" || normalized === "ru-ru" || normalized === "russian" || normalized === "русский" || normalized === "vene") {
    return "ru";
  }
  return "en";
}

function storedRecipientLanguage(locale) {
  return campaignLanguageFromPreferredLocale(locale) === "et" ? "et" : "en";
}

async function selectIn(admin, table, columns, column, values) {
  const rows = [];
  for (const part of chunk(values, 200)) {
    if (part.length === 0) continue;
    const { data, error } = await admin.from(table).select(columns).in(column, part);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
  }
  return rows;
}

async function allRecipients(admin, campaignId) {
  const rows = [];
  let from = 0;
  for (;;) {
    const { data, error } = await admin
      .from("email_campaign_recipients")
      .select("id, email, display_name, language, user_id, status, open_token, unsubscribe_token")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < 1000) break;
    from += 1000;
  }
  return rows;
}

async function listAuthUsers(admin) {
  const users = [];
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    const batch = data.users ?? [];
    users.push(...batch);
    if (batch.length < 1000) break;
    page += 1;
  }
  return users;
}

function applyTracking(html, { openToken, unsubscribeToken, clickTokens }) {
  let next = html.replaceAll("https://swmp.invalid/track/open/PLACEHOLDER", `https://www.staywithmypet.ee/api/email/track/open/${openToken}`);
  next = next.replaceAll("https://swmp.invalid/track/unsub/PLACEHOLDER", `https://www.staywithmypet.ee/email/unsubscribe/${unsubscribeToken}`);
  for (const [key, token] of Object.entries(clickTokens)) {
    next = next.replaceAll(
      `https://swmp.invalid/track/click/${key}`,
      `https://www.staywithmypet.ee/api/email/track/click/${token}`,
    );
  }
  return next;
}

function htmlToPlainText(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function htmlChecks(html) {
  const photoUrls = PHOTOS.map((name) => `https://www.staywithmypet.ee/images/campaigns/living-well-27-sep/${name}`);
  return {
    combinedLanguages: html.includes("THIS SUNDAY'S EVENT WILL BE HELD IN RUSSIAN.") &&
      html.includes("SEL PÜHAPÄEVAL TOIMUB ÜRITUS VENE KEELES.") &&
      html.includes("В ЭТО ВОСКРЕСЕНЬЕ МЕРОПРИЯТИЕ ПРОЙДЁТ НА РУССКОМ ЯЗЫКЕ."),
    enThenEtThenRu: html.indexOf("English") < html.indexOf("Eesti") && html.indexOf("Eesti") < html.indexOf("Русский"),
    oneCta: (html.match(/SEE EVENT &amp; JOIN US →/g) || []).length === 1,
    noSeparateEtCta: !html.includes("VAATA ÜRITUST") && !html.includes("VAATA SÜNDMUST"),
    event27: html.includes("swmp.invalid/track/click/event_27_sep"),
    noEvent20: !html.includes("swmp.invalid/track/click/event_20_sep"),
    noFacebook: !html.includes("facebook.com"),
    websitePlaceholder: html.includes("swmp.invalid/track/click/staywithmypet_website"),
    unsubscribePlaceholder: html.includes("swmp.invalid/track/unsub/PLACEHOLDER"),
    visitUs: html.includes("Visit us at"),
    photosAfterRussian: html.indexOf("Русский") < html.indexOf("LAST SUNDAY") && html.indexOf("LAST SUNDAY") < html.indexOf("09-venue-wide.JPG"),
    allPhotos: photoUrls.every((url) => html.includes(url)),
    noLocalPaths: !html.includes("/public/") && !html.includes("file://") && !html.includes("localhost"),
    sameBodies: true,
  };
}

async function verifyProductionPhotos() {
  const results = [];
  for (const name of PHOTOS) {
    const url = `https://www.staywithmypet.ee/images/campaigns/living-well-27-sep/${name}`;
    try {
      const response = await fetch(url, { method: "GET", redirect: "follow" });
      const type = response.headers.get("content-type") ?? "";
      results.push({
        url,
        status: response.status,
        ok: response.status === 200 && type.toLowerCase().startsWith("image/"),
        type,
      });
    } catch (error) {
      results.push({
        url,
        status: 0,
        ok: false,
        type: "",
        error: error instanceof Error ? error.message : "fetch_failed",
      });
    }
  }
  return results;
}

async function insertClickTokens(admin, recipientId) {
  const rows = TRACKED_LINKS.map((link) => ({
    token: createOpaqueToken(),
    recipient_id: recipientId,
    link_key: link.key,
    link_type: link.type,
    label: link.label,
    destination_url: link.destinationUrl,
  }));
  const first = await admin.from("email_campaign_click_tokens").insert(rows);
  if (!first.error) return rows;
  const fallback = rows.map(({ link_type: _t, label: _l, ...row }) => row);
  const retry = await admin.from("email_campaign_click_tokens").insert(fallback);
  if (retry.error) throw new Error(retry.error.message);
  return rows;
}

async function insertRecipient(admin, campaignId, recipient) {
  const payload = {
    campaign_id: campaignId,
    user_id: recipient.userId ?? null,
    display_name: String(recipient.displayName ?? "").trim() || recipient.email,
    email: recipient.email,
    language: storedRecipientLanguage(recipient.language),
    open_token: createOpaqueToken(),
    unsubscribe_token: createOpaqueToken(),
    status: "pending",
  };
  let insert = await admin.from("email_campaign_recipients").insert(payload).select("id").single();
  if (insert.error && /unsubscribe_token/i.test(insert.error.message)) {
    const { unsubscribe_token: _u, ...withoutUnsub } = payload;
    void _u;
    insert = await admin.from("email_campaign_recipients").insert(withoutUnsub).select("id").single();
  }
  if (insert.error) throw new Error(insert.error.message);
  await insertClickTokens(admin, insert.data.id);
  return insert.data.id;
}

function renderBodies() {
  const out = resolve(process.cwd(), "tmp-living-well-27-sep-bodies.json");
  execFileSync("npx", ["tsx", "--tsconfig", "tsconfig.json", "scripts/render-living-well-27-sep.ts", out], {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: true,
  });
  const bodies = JSON.parse(readFileSync(out, "utf8"));
  try {
    unlinkSync(out);
  } catch {
    /* keep going */
  }
  return bodies;
}

async function sendSmtp({ to, subject, html, text }) {
  const host = process.env.SMTP_HOST?.trim() || "mail.spacemail.com";
  const port = Number.parseInt(process.env.SMTP_PORT?.trim() || "465", 10);
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD?.trim();
  if (!user || !password) throw new Error("smtp_not_configured");
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass: password },
  });
  await transporter.sendMail({
    from: "Stay With My Pet <info@staywithmypet.ee>",
    to,
    subject,
    html,
    text,
  });
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("Missing Supabase admin env");
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const bodies = renderBodies();
  if (bodies.htmlEn !== bodies.htmlEt || bodies.htmlEn !== bodies.htmlRu) {
    throw new Error("27 Sep bodies are not identical combined HTML");
  }
  const checks = htmlChecks(bodies.htmlEn);
  if (!Object.values(checks).every(Boolean)) {
    throw new Error(`Combined HTML failed checks: ${JSON.stringify(checks)}`);
  }

  const { data: campaigns, error: campaignError } = await admin
    .from("email_campaigns")
    .select("id, name, status, template_key, created_at, created_by, template_config")
    .order("created_at", { ascending: false });
  if (campaignError) throw new Error(campaignError.message);

  const campaign = (campaigns ?? []).find((row) => row.id === CAMPAIGN_ID);
  if (!campaign) throw new Error(`Campaign ${CAMPAIGN_ID} not found`);

  const livingWell = (campaigns ?? []).filter((row) => String(row.name ?? "").includes("Living Well"));
  const sourceId =
    (livingWell.find((row) => row.id === FALLBACK_SOURCE_ID) ?? livingWell[0] ?? { id: ORIGINAL_SEPTEMBER_ID }).id;
  const sourceCampaign = (campaigns ?? []).find((row) => row.id === sourceId);
  if (!sourceCampaign) throw new Error("Source campaign not found");

  const sourceRows = await allRecipients(admin, sourceId);
  const seen = new Set();
  let duplicatesRemoved = 0;
  const uniqueSource = [];
  for (const row of sourceRows) {
    const email = normalizeEmail(row.email);
    if (!email) continue;
    if (seen.has(email)) {
      duplicatesRemoved += 1;
      continue;
    }
    seen.add(email);
    uniqueSource.push({ ...row, email });
  }

  const users = await listAuthUsers(admin);
  const userByEmail = new Map();
  for (const user of users) {
    const email = normalizeEmail(user.email);
    if (!email) continue;
    const meta = user.user_metadata ?? {};
    const locale = typeof meta.swmp_locale === "string" ? meta.swmp_locale : typeof meta.locale === "string" ? meta.locale : null;
    userByEmail.set(email, {
      userId: user.id,
      locale,
      banned: Boolean(user.banned_until && Date.parse(user.banned_until) > Date.now()),
      createdAt: user.created_at,
    });
  }

  const newUsersFound = users.filter((user) => {
    const email = normalizeEmail(user.email);
    return email && user.created_at && user.created_at >= CUTOFF;
  });
  const newUserEmails = [];
  for (const user of newUsersFound) {
    const email = normalizeEmail(user.email);
    if (!seen.has(email)) newUserEmails.push(email);
  }

  const consentEmails = [...uniqueSource.map((row) => row.email), ...newUserEmails];
  const unsubRows = await selectIn(admin, "email_marketing_unsubscribes", "email", "email", consentEmails);
  const unsubscribed = new Set(unsubRows.map((row) => normalizeEmail(row.email)));
  const newsRows = await selectIn(admin, "newsletter_subscribers", "email", "email", newUserEmails);
  const newsletter = new Set(newsRows.map((row) => normalizeEmail(row.email)));

  let excludedUnsubscribed = 0;
  let excludedSuppressed = 0;
  let excludedInvalid = 0;
  let newEligibleAdded = 0;
  const eligible = [];

  for (const row of uniqueSource) {
    const email = row.email;
    const user = userByEmail.get(email);
    if (!EMAIL_RE.test(email)) {
      excludedInvalid += 1;
      continue;
    }
    if (unsubscribed.has(email)) {
      excludedUnsubscribed += 1;
      continue;
    }
    if (user?.banned) {
      excludedSuppressed += 1;
      continue;
    }
    eligible.push({
      email,
      displayName: String(row.display_name ?? "").trim() || email,
      userId: row.user_id ?? user?.userId ?? null,
      language: storedRecipientLanguage(user?.locale ?? row.language),
      fromNewSignup: false,
    });
  }

  for (const email of newUserEmails) {
    const user = userByEmail.get(email);
    if (!EMAIL_RE.test(email)) {
      excludedInvalid += 1;
      continue;
    }
    if (unsubscribed.has(email)) {
      excludedUnsubscribed += 1;
      continue;
    }
    if (user?.banned) {
      excludedSuppressed += 1;
      continue;
    }
    if (!newsletter.has(email)) continue;
    eligible.push({
      email,
      displayName: email,
      userId: user?.userId ?? null,
      language: storedRecipientLanguage(user?.locale),
      fromNewSignup: true,
    });
    newEligibleAdded += 1;
  }

  const photoResults = await verifyProductionPhotos();
  const photosVerified = photoResults.every((row) => row.ok);

  const report = {
    campaignId: CAMPAIGN_ID,
    sourceCampaignId: sourceId,
    sourceName: sourceCampaign.name,
    cutoff: CUTOFF,
    facebookEventUrl: EVENT_27_SEP_URL,
    htmlChecks: checks,
    sourceRecipients: sourceRows.length,
    uniqueSource: uniqueSource.length,
    duplicatesRemoved,
    newUsersFoundLast12Days: newUsersFound.length,
    newUsersNotAlreadyOnList: newUserEmails.length,
    newEligibleAdded,
    excludedUnsubscribed,
    excludedSuppressed,
    excludedInvalid,
    totalEligible: eligible.length,
    photosUsed: PHOTOS,
    productionPhotoUrls: photoResults,
    productionPhotoUrlsVerified: photosVerified,
  };

  if (!APPLY) {
    console.log(JSON.stringify({ mode: "inspect", sentBulk: false, combinedTestSent: false, ...report }, null, 2));
    return;
  }

  const existingConfig = campaign.template_config && typeof campaign.template_config === "object" ? campaign.template_config : {};
  const templateConfig = {
    ...existingConfig,
    languageMode: "combined",
    htmlRu: bodies.htmlEn,
    subjectRu: bodies.subjectEn,
    copy: {
      preheaderEn: bodies.preheaderEn,
      preheaderEt: bodies.preheaderEn,
      bodyBeforeEn: "Combined EN + ET + RU invitation — 27 September.",
      bodyAfterEn: "See you at Moon! 🐾",
      bodyBeforeEt: "Combined EN + ET + RU invitation — 27 September.",
      bodyAfterEt: "See you at Moon! 🐾",
    },
  };
  const { error: updateError } = await admin
    .from("email_campaigns")
    .update({
      name: "Living Well With Pets – 27 September",
      subject_en: bodies.subjectEn,
      subject_et: bodies.subjectEn,
      html_en: bodies.htmlEn,
      html_et: bodies.htmlEn,
      template_key: "living_well_27_sep",
      template_config: templateConfig,
      updated_at: new Date().toISOString(),
    })
    .eq("id", CAMPAIGN_ID);
  if (updateError) throw new Error(updateError.message);

  const current = await allRecipients(admin, CAMPAIGN_ID);
  const plusRu = current.filter((row) => normalizeEmail(row.email) === PLUS_RU_TEST);
  for (const row of plusRu) {
    await admin.from("email_campaign_click_tokens").delete().eq("recipient_id", row.id);
    await admin.from("email_campaign_recipients").delete().eq("id", row.id);
  }

  const already = new Set(current.map((row) => normalizeEmail(row.email)).filter((email) => email !== PLUS_RU_TEST));
  let added = 0;
  let skipped = 0;
  for (const row of eligible) {
    if (already.has(row.email)) {
      skipped += 1;
      continue;
    }
    try {
      await insertRecipient(admin, CAMPAIGN_ID, row);
      already.add(row.email);
      added += 1;
    } catch {
      skipped += 1;
    }
  }

  const after = await allRecipients(admin, CAMPAIGN_ID);
  const afterEligibleEmails = new Set(eligible.map((row) => row.email));
  const uniqueAudience = after.filter((row) => afterEligibleEmails.has(normalizeEmail(row.email))).length;

  if (!photosVerified) {
    console.log(
      JSON.stringify(
        {
          sentBulk: false,
          combinedTestSent: false,
          photosVerified: false,
          added,
          skipped,
          campaignRecipients: after.length,
          uniqueAudience,
          ...report,
        },
        null,
        2,
      ),
    );
    throw new Error("Production photo URLs are not HTTP 200 image responses. Not sending test email.");
  }

  const testSend = { sent: 0, failed: 0, deliveries: [], failures: [] };
  for (const row of TEST_RECIPIENTS) {
    const email = normalizeEmail(row.email);
    const freshUnsub = await selectIn(admin, "email_marketing_unsubscribes", "email", "email", [email]);
    if (freshUnsub.length > 0) {
      testSend.failed += 1;
      testSend.failures.push({ email, reason: "unsubscribed" });
      continue;
    }
    let recipient = after.find((item) => normalizeEmail(item.email) === email);
    if (!recipient) {
      const id = await insertRecipient(admin, CAMPAIGN_ID, {
        email,
        displayName: row.displayName,
        language: row.language,
        userId: userByEmail.get(email)?.userId ?? null,
      });
      const { data } = await admin
        .from("email_campaign_recipients")
        .select("id, email, language, open_token, unsubscribe_token")
        .eq("id", id)
        .single();
      recipient = data;
    }
    if (!recipient.unsubscribe_token) {
      const token = createOpaqueToken();
      await admin.from("email_campaign_recipients").update({ unsubscribe_token: token }).eq("id", recipient.id);
      recipient.unsubscribe_token = token;
    }
    const { data: clicks } = await admin
      .from("email_campaign_click_tokens")
      .select("link_key, token")
      .eq("recipient_id", recipient.id);
    let clickTokens = Object.fromEntries((clicks ?? []).map((item) => [item.link_key, item.token]));
    if (!clickTokens.event_27_sep) {
      const minted = await insertClickTokens(admin, recipient.id);
      clickTokens = Object.fromEntries(minted.map((item) => [item.link_key, item.token]));
    }
    const html = applyTracking(bodies.htmlEn, {
      openToken: recipient.open_token,
      unsubscribeToken: recipient.unsubscribe_token,
      clickTokens,
    });
    const trackingClean =
      !html.includes("swmp.invalid") &&
      html.includes("https://www.staywithmypet.ee/api/email/track/click/") &&
      PHOTOS.every((name) => html.includes(`https://www.staywithmypet.ee/images/campaigns/living-well-27-sep/${name}`)) &&
      html.includes("THIS SUNDAY'S EVENT WILL BE HELD IN RUSSIAN.") &&
      html.includes("SEL PÜHAPÄEVAL TOIMUB ÜRITUS VENE KEELES.") &&
      html.includes("В ЭТО ВОСКРЕСЕНЬЕ МЕРОПРИЯТИЕ ПРОЙДЁТ НА РУССКОМ ЯЗЫКЕ.");
    if (!trackingClean) {
      testSend.failed += 1;
      testSend.failures.push({ email, reason: html.includes("swmp.invalid") ? "unresolved_tracking_placeholder" : "combined_html_mismatch" });
      continue;
    }
    try {
      await sendSmtp({
        to: email,
        subject: bodies.subjectEn,
        html,
        text: htmlToPlainText(html),
      });
      await admin
        .from("email_campaign_recipients")
        .update({ status: "sent", sent_at: new Date().toISOString(), failure_reason: null })
        .eq("id", recipient.id);
      testSend.sent += 1;
      testSend.deliveries.push({ email, language: "combined_en_et_ru", subject: bodies.subjectEn });
    } catch (error) {
      testSend.failed += 1;
      testSend.failures.push({ email, reason: error instanceof Error ? error.message : "send_failed" });
    }
  }

  await admin.from("email_campaigns").update({ status: testSend.sent > 0 ? "test_sent" : campaign.status }).eq("id", CAMPAIGN_ID);

  console.log(
    JSON.stringify(
      {
        sentBulk: false,
        scheduled: false,
        combinedTestSent: testSend.sent === TEST_RECIPIENTS.length && testSend.failed === 0,
        added,
        skipped,
        campaignRecipients: (await allRecipients(admin, CAMPAIGN_ID)).length,
        uniqueAudience,
        photosVerified,
        testSend,
        ...report,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
