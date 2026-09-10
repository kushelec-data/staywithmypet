import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/require-api";
import { CAMPAIGN_FROM_HEADER } from "@/lib/email-campaigns/from";
import { OPEN_TRACKING_DISCLAIMER } from "@/lib/email-campaigns/dto";
import { mergeSeptemberTemplateConfig } from "@/lib/email-campaigns/template-config";
import {
  createCampaign,
  createSeptemberEstonianDraft,
  createSeptemberTestDraft,
  listCampaignSummaries,
  resolveRegisteredUserRecipients,
} from "@/lib/email-campaigns/store";
import { campaignLanguageFromPreferredLocale, type CampaignLanguage } from "@/lib/email-campaigns/locale";
import { parseCampaignCsv } from "@/lib/email-campaigns/csv-import";
import { defaultSeptemberBodies, resolveCampaignCopy } from "@/lib/email-campaigns/html";
import { campaignEmailAssetUrl } from "@/lib/email-campaigns/public-base";
import { listRegisteredCampaignAudience, recipientsForRegisteredFilter } from "@/lib/email-campaigns/store-bulk";

export async function GET() {
  const gate = await requireAdminApi();
  if (gate.response) return gate.response;

  const campaigns = await listCampaignSummaries();
  if (!campaigns) {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
  return NextResponse.json({
    from: CAMPAIGN_FROM_HEADER,
    openTrackingNote: OPEN_TRACKING_DISCLAIMER,
    campaigns,
  });
}

export async function POST(request: Request) {
  const gate = await requireAdminApi();
  if (gate.response) return gate.response;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  if (body.seedSeptemberTest === true) {
    const created = await createSeptemberTestDraft(gate.session.userId, mergeSeptemberTemplateConfig(body.templateConfig));
    if ("error" in created) return NextResponse.json({ error: created.error }, { status: 400 });
    return NextResponse.json({ id: created.id });
  }

  if (body.seedSeptemberEstonianTest === true) {
    const created = await createSeptemberEstonianDraft(
      gate.session.userId,
      mergeSeptemberTemplateConfig(body.templateConfig),
    );
    if ("error" in created) return NextResponse.json({ error: created.error }, { status: 400 });
    return NextResponse.json({ id: created.id, language: "et" });
  }

  const registeredIds = Array.isArray(body.registeredUserIds)
    ? body.registeredUserIds.filter((id): id is string => typeof id === "string")
    : [];
  const fromUsers = await resolveRegisteredUserRecipients(registeredIds);

  const manual = Array.isArray(body.recipients)
    ? (body.recipients as Array<Record<string, unknown>>)
        .map((row) => ({
          displayName: String(row.displayName ?? row.name ?? "").trim(),
          email: String(row.email ?? "").trim(),
          language: campaignLanguageFromPreferredLocale(String(row.language ?? "en")) as CampaignLanguage,
        }))
        .filter((row) => row.email.includes("@") && row.displayName)
    : [];

  const fromCsv =
    typeof body.csvText === "string" && body.csvText.trim()
      ? parseCampaignCsv(body.csvText).recipients.map((row) => ({
          displayName: row.displayName,
          email: row.email,
          language: row.language,
        }))
      : [];

  let fromAudience: typeof manual = [];
  const filter = body.registeredFilter;
  if (filter === "all" || filter === "et" || filter === "en") {
    const audience = await listRegisteredCampaignAudience();
    if (audience) {
      fromAudience = recipientsForRegisteredFilter(audience.all, filter).map((row) => ({
        displayName: row.displayName,
        email: row.email,
        language: row.language,
        userId: row.userId,
      }));
    }
  }

  const seen = new Set<string>();
  const recipients = [...manual, ...fromUsers, ...fromCsv, ...fromAudience].filter((row) => {
    const email = row.email.trim().toLowerCase();
    if (!email.includes("@") || seen.has(email)) return false;
    seen.add(email);
    return true;
  });
  if (recipients.length === 0) {
    return NextResponse.json({ error: "Select at least one recipient" }, { status: 400 });
  }

  const templateConfig = mergeSeptemberTemplateConfig(body.templateConfig);
  const copy = {
    bodyEn: typeof body.bodyEn === "string" ? body.bodyEn : undefined,
    bodyEt: typeof body.bodyEt === "string" ? body.bodyEt : undefined,
    bodyBeforeEn: typeof body.bodyBeforeEn === "string" ? body.bodyBeforeEn : undefined,
    bodyAfterEn: typeof body.bodyAfterEn === "string" ? body.bodyAfterEn : undefined,
    bodyBeforeEt: typeof body.bodyBeforeEt === "string" ? body.bodyBeforeEt : undefined,
    bodyAfterEt: typeof body.bodyAfterEt === "string" ? body.bodyAfterEt : undefined,
    preheaderEn: typeof body.preheaderEn === "string" ? body.preheaderEn : undefined,
    preheaderEt: typeof body.preheaderEt === "string" ? body.preheaderEt : undefined,
    subjectEn: String(body.subjectEn ?? "") || undefined,
    subjectEt: String(body.subjectEt ?? "") || undefined,
  };
  const defaults = defaultSeptemberBodies(campaignEmailAssetUrl("/logo.png"), templateConfig, copy);
  const created = await createCampaign({
    name: String(body.name ?? "").trim() || "September community events",
    subjectEn: String(body.subjectEn ?? ""),
    subjectEt: String(body.subjectEt ?? ""),
    htmlEn: String(body.htmlEn ?? "") || defaults.htmlEn,
    htmlEt: String(body.htmlEt ?? "") || defaults.htmlEt,
    createdBy: gate.session.userId,
    recipients,
    templateKey: typeof body.templateKey === "string" ? body.templateKey : undefined,
    templateConfig,
    copy: resolveCampaignCopy(copy),
  });
  if ("error" in created) return NextResponse.json({ error: created.error }, { status: 400 });
  return NextResponse.json({ id: created.id, sent: false });
}
