import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { CAMPAIGN_TRACKED_LINKS, SEPTEMBER_ESTONIAN_CAMPAIGN_NAME, SEPTEMBER_SUBJECT_ET } from "../src/lib/email-campaigns/events.ts";
import { applyTrackingToHtml, defaultSeptemberBodies } from "../src/lib/email-campaigns/html.ts";
import { clickTrackingUrl, openTrackingUrl } from "../src/lib/email-campaigns/personalize.ts";
import { createSeptemberEstonianDraft } from "../src/lib/email-campaigns/store.ts";
import { createAdminClient } from "../src/lib/supabase/admin.ts";
import { CANONICAL_CAMPAIGN_EMAIL_ORIGIN } from "../src/lib/email-campaigns/public-base.ts";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  const text = readFileSync(path, "utf8");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  loadEnvLocal();
  const origin = CANONICAL_CAMPAIGN_EMAIL_ORIGIN;
  const bodies = defaultSeptemberBodies(`${origin}/logo.png`);
  const clickUrls = Object.fromEntries(
    CAMPAIGN_TRACKED_LINKS.map((link) => [link.key, clickTrackingUrl(`preview-${link.key}`, origin)]),
  );
  const html = applyTrackingToHtml(bodies.htmlEt, {
    openPixelUrl: openTrackingUrl("preview-open", origin),
    clickUrls,
  });
  const previewPath = resolve(tmpdir(), "september-et-campaign-preview.html");
  writeFileSync(previewPath, html, "utf8");

  const admin = createAdminClient();
  if (!admin) throw new Error("Admin/Supabase client unavailable");
  const { data: adminRow, error: adminError } = await admin.from("admin_users").select("user_id").limit(1).maybeSingle();
  if (adminError || !adminRow?.user_id) throw new Error(adminError?.message ?? "No admin_users row");

  const created = await createSeptemberEstonianDraft(adminRow.user_id as string);
  if ("error" in created) throw new Error(created.error);

  const { data: recipients, error: recError } = await admin
    .from("email_campaign_recipients")
    .select("id, email, language")
    .eq("campaign_id", created.id)
    .order("created_at", { ascending: true });
  if (recError) throw new Error(recError.message);

  const { data: tokens } = await admin
    .from("email_campaign_click_tokens")
    .select("recipient_id, link_key, link_type, label, destination_url, token")
    .eq("recipient_id", recipients?.[0]?.id ?? "");

  console.log(
    JSON.stringify(
      {
        sent: false,
        campaignName: SEPTEMBER_ESTONIAN_CAMPAIGN_NAME,
        subject: SEPTEMBER_SUBJECT_ET,
        language: "et",
        campaignId: created.id,
        recipientLanguages: (recipients ?? []).map((row) => ({ email: row.email, language: row.language })),
        tokenCountFirstRecipient: tokens?.length ?? 0,
        previewPath,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
