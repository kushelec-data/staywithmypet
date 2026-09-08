import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/require-api";
import { buildOverviewDashboardDto, overviewQueryFromSearch } from "@/lib/admin/overview-load";
import { overviewPayloadIsUnsafe } from "@/lib/admin/overview";

export async function GET(request: Request) {
  const gate = await requireAdminApi();
  if (gate.response) return gate.response;

  const url = new URL(request.url);
  const { range, metric } = overviewQueryFromSearch({
    range: url.searchParams.get("range") ?? undefined,
    metric: url.searchParams.get("metric") ?? undefined,
  });
  const data = await buildOverviewDashboardDto({ range, metric });
  if (!data) {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
  if (overviewPayloadIsUnsafe(data)) {
    return NextResponse.json({ error: "Refusing to return sensitive fields" }, { status: 500 });
  }
  return NextResponse.json(data);
}
