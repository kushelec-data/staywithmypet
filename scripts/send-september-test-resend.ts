import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CAMPAIGN_TRACKED_LINKS, EVENT_13_SEP_URL, EVENT_20_SEP_URL, EVENT_27_SEP_URL } from "../src/lib/email-campaigns/events.ts";
import { clickTokensMatchCatalog } from "../src/lib/email-campaigns/destinations.ts";
import { personalizeCampaignHtml } from "../src/lib/email-campaigns/personalize.ts";
import { hrefsInHtml } from "../src/lib/email-campaigns/html.ts";
import { createSeptemberResendTest, loadRecipientForSend } from "../src/lib/email-campaigns/store.ts";
import { sendToRecipient } from "../src/lib/email-campaigns/send.ts";
import { createAdminClient } from "../src/lib/supabase/admin.ts";

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
  const admin = createAdminClient();
  if (!admin) throw new Error("Admin/Supabase client unavailable");

  const { data: adminRow, error: adminError } = await admin.from("admin_users").select("user_id").limit(1).maybeSingle();
  if (adminError || !adminRow?.user_id) throw new Error(adminError?.message ?? "No admin_users row");

  const created = await createSeptemberResendTest(adminRow.user_id as string);
  if ("error" in created) throw new Error(created.error);
  console.log(JSON.stringify({ campaignId: created.id, freshTokens: true }));

  const { data: recipients, error: recError } = await admin
    .from("email_campaign_recipients")
    .select("id, email, display_name")
    .eq("campaign_id", created.id)
    .order("created_at", { ascending: true });
  if (recError || !recipients) throw new Error(recError?.message ?? "no recipients");

  const expected = ["gerlykullamaa@gmail.com", "kusheducation@gmail.com", "a.biancheri@ignostiq.com"];
  const emails = recipients.map((row) => (row.email as string).toLowerCase());
  if (emails.sort().join() !== [...expected].sort().join()) {
    throw new Error(`unexpected recipients: ${emails.join(",")}`);
  }

  const perRecipient: Array<{ email: string; result: string; reason?: string }> = [];
  for (const row of recipients) {
    const packed = await loadRecipientForSend(row.id as string);
    if (!packed) throw new Error(`missing packed recipient ${row.email}`);
    if (!packed.destinationsOk.ok) {
      throw new Error(`pre-send validation failed for ${row.email}: ${packed.destinationsOk.errors.join("; ")}`);
    }
    const byKey = Object.fromEntries(packed.clickRows.map((c) => [c.link_key, c.destination_url]));
    if (byKey.event_13_sep !== EVENT_13_SEP_URL) throw new Error("13 Sep destination mismatch");
    if (byKey.event_20_sep !== EVENT_20_SEP_URL) throw new Error("20 Sep destination mismatch");
    if (byKey.event_27_sep !== EVENT_27_SEP_URL) throw new Error("27 Sep destination mismatch");
    if (byKey.sponsor_petcity !== "https://www.petcity.ee/") throw new Error("PetCity destination mismatch");
    if (byKey.sponsor_platinum !== "https://www.koeratoit.ee/") throw new Error("Platinum destination mismatch");
    if (byKey.sponsor_yook !== "https://yook.eu/") throw new Error("YOOK destination mismatch");
    if (byKey.sponsor_gelato_ladies !== "https://www.gelatoladies.ee/") throw new Error("Gelato destination mismatch");
    if (byKey.sponsor_moon !== "https://restoranmoon.ee/") throw new Error("Moon destination mismatch");
    if (byKey.sponsor_viwell !== "https://viwelldrinks.com/") throw new Error("ViWell destination mismatch");
    if (byKey.sponsor_semu) throw new Error("Semu must not have a click token");
    const catalogCheck = clickTokensMatchCatalog(packed.clickRows);
    if (!catalogCheck.ok) throw new Error(catalogCheck.errors.join("; "));

    const personalized = personalizeCampaignHtml({
      htmlEn: packed.campaign.html_en as string,
      htmlEt: packed.campaign.html_et as string,
      language: "en",
      openToken: packed.recipient.open_token as string,
      clickTokens: packed.clickTokens,
    });
    const hrefs = hrefsInHtml(personalized.html);
    if (hrefs.some((href) => href.includes("facebook.com") || href.includes("fb.me") || href.includes("petcity.ee"))) {
      throw new Error("personalized HTML leaked destination URLs");
    }
    if (!hrefs.every((href) => !href.includes("@") && !href.includes(row.email as string))) {
      throw new Error("personalized HTML leaked recipient email");
    }

    const result = await sendToRecipient(row.id as string);
    perRecipient.push({
      email: row.email as string,
      result: result.ok ? "sent" : "failed",
      reason: result.reason,
    });
  }

  console.log(
    JSON.stringify(
      {
        destinations: {
          event13: EVENT_13_SEP_URL,
          event20: EVENT_20_SEP_URL,
          event27: EVENT_27_SEP_URL,
        },
        sponsors: CAMPAIGN_TRACKED_LINKS.filter((l) => l.type === "sponsor"),
        results: perRecipient,
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
