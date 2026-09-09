import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/require-api";
import { listRegisteredCampaignAudience, recipientsForRegisteredFilter } from "@/lib/email-campaigns/store-bulk";

export async function GET(request: Request) {
  const gate = await requireAdminApi();
  if (gate.response) return gate.response;

  const audience = await listRegisteredCampaignAudience();
  if (!audience) return NextResponse.json({ error: "Unavailable" }, { status: 503 });

  const filterParam = new URL(request.url).searchParams.get("filter");
  const filter = filterParam === "et" || filterParam === "en" || filterParam === "all" ? filterParam : "all";
  const selected = recipientsForRegisteredFilter(audience.all, filter);

  return NextResponse.json({
    all: audience.all.length,
    estonian: audience.estonian,
    english: audience.english,
    consented: audience.consented,
    selected: selected.length,
    selectedEstonian: selected.filter((row) => row.language === "et").length,
    selectedEnglish: selected.filter((row) => row.language !== "et").length,
    selectedConsented: selected.filter((row) => row.consented).length,
  });
}
