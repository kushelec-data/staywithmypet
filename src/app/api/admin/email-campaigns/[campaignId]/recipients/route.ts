import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/require-api";
import { parseCampaignCsv } from "@/lib/email-campaigns/csv-import";
import { campaignLanguageFromPreferredLocale } from "@/lib/email-campaigns/locale";
import {
  addRecipientsToExistingCampaign,
  listRegisteredCampaignAudience,
  recipientsForRegisteredFilter,
} from "@/lib/email-campaigns/store-bulk";

type RouteContext = { params: Promise<{ campaignId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const gate = await requireAdminApi();
  if (gate.response) return gate.response;

  const { campaignId } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const incoming: Array<{ displayName: string; email: string; language: "en" | "et"; userId?: string }> = [];
  let csvInvalid = 0;
  let csvDuplicates = 0;

  if (typeof body.csvText === "string" && body.csvText.trim()) {
    const parsed = parseCampaignCsv(body.csvText);
    csvInvalid = parsed.invalid.length;
    csvDuplicates = parsed.duplicatesRemoved;
    for (const row of parsed.recipients) {
      incoming.push({ displayName: row.displayName, email: row.email, language: row.language });
    }
  }

  if (Array.isArray(body.recipients)) {
    for (const row of body.recipients as Array<Record<string, unknown>>) {
      incoming.push({
        displayName: String(row.displayName ?? row.name ?? "").trim() || String(row.email ?? ""),
        email: String(row.email ?? "").trim().toLowerCase(),
        language: campaignLanguageFromPreferredLocale(String(row.language ?? "en")),
      });
    }
  }

  const filter = body.registeredFilter;
  if (filter === "all" || filter === "et" || filter === "en") {
    const audience = await listRegisteredCampaignAudience();
    if (!audience) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
    for (const row of recipientsForRegisteredFilter(audience.all, filter)) {
      incoming.push({
        displayName: row.displayName,
        email: row.email,
        language: row.language,
        userId: row.userId,
      });
    }
  }

  const seen = new Set<string>();
  const unique = incoming.filter((row) => {
    if (!row.email.includes("@")) return false;
    if (seen.has(row.email)) return false;
    seen.add(row.email);
    return true;
  });

  const result = await addRecipientsToExistingCampaign(campaignId, unique);
  if (result.error) return NextResponse.json({ error: result.error, ...result }, { status: 400 });
  return NextResponse.json({
    added: result.added,
    skipped: result.skipped,
    invalid: csvInvalid,
    duplicatesRemoved: csvDuplicates,
    sent: false,
  });
}
