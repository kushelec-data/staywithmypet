import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/require-api";
import { analyticsQueryFromSearch, buildAnalyticsDashboardDto } from "@/lib/admin/analytics-load";
import { payloadHasSensitiveFields } from "@/lib/admin/analytics";

const VIEWS = [
  "summary",
  "daily-series",
  "top-pages",
  "top-events",
  "active-users",
  "funnel",
  "recent-activity",
  "relationships",
] as const;

type AnalyticsView = (typeof VIEWS)[number];

function pickView(data: NonNullable<Awaited<ReturnType<typeof buildAnalyticsDashboardDto>>>, view: AnalyticsView) {
  switch (view) {
    case "summary":
      return { kpis: data.kpis, today: data.today, dau: data.dau, range: data.range };
    case "daily-series":
      return { series: data.series, daily: data.daily, metric: data.metric, window: data.window };
    case "top-pages":
      return { topPages: data.topPages, pageViewsAvailable: data.pageViewsAvailable };
    case "top-events":
      return { topEvents: data.topEvents };
    case "active-users":
      return { leaderboard: data.leaderboard, retention: data.retention };
    case "funnel":
      return { funnel: data.funnel };
    case "recent-activity":
      return { recent: data.recent };
    case "relationships":
      return { relationships: data.relationships };
    default:
      return data;
  }
}

export async function GET(request: Request) {
  const gate = await requireAdminApi();
  if (gate.response) return gate.response;

  const url = new URL(request.url);
  const { range, metric } = analyticsQueryFromSearch({
    range: url.searchParams.get("range") ?? undefined,
    metric: url.searchParams.get("metric") ?? undefined,
  });
  const data = await buildAnalyticsDashboardDto({ range, metric });
  if (!data) {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }

  const viewParam = url.searchParams.get("view");
  const payload =
    viewParam && (VIEWS as readonly string[]).includes(viewParam)
      ? pickView(data, viewParam as AnalyticsView)
      : data;

  if (payloadHasSensitiveFields(payload)) {
    return NextResponse.json({ error: "Refusing to return sensitive fields" }, { status: 500 });
  }

  return NextResponse.json(payload);
}
