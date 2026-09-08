import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/require-api";
import { buildBookingsDashboardDto, bookingsQueryFromSearch } from "@/lib/admin/bookings-load";
import { bookingsPayloadIsUnsafe } from "@/lib/admin/bookings-analytics";

const VIEWS = [
  "summary",
  "series",
  "status-breakdown",
  "conversion",
  "top-users",
  "top-pets",
  "recent-activity",
  "table",
] as const;

type View = (typeof VIEWS)[number];

function pickView(data: NonNullable<Awaited<ReturnType<typeof buildBookingsDashboardDto>>>, view: View) {
  switch (view) {
    case "summary":
      return { kpis: data.kpis, periodLabel: data.periodLabel, window: data.window, timing: data.timing, duration: data.duration };
    case "series":
      return { series: data.series, previousSeries: data.previousSeries, activity: data.activity, metric: data.metric };
    case "status-breakdown":
      return { status: data.status };
    case "conversion":
      return { conversion: data.conversion };
    case "top-users":
      return { topParents: data.topParents, topFriends: data.topFriends, topPairs: data.topPairs };
    case "top-pets":
      return { topPets: data.topPets };
    case "recent-activity":
      return { recent: data.recent };
    case "table":
      return { table: data.table };
    default:
      return data;
  }
}

export async function GET(request: Request) {
  const gate = await requireAdminApi();
  if (gate.response) return gate.response;

  const url = new URL(request.url);
  const { range, metric, filters } = bookingsQueryFromSearch({
    range: url.searchParams.get("range") ?? undefined,
    metric: url.searchParams.get("metric") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    parent: url.searchParams.get("parent") ?? undefined,
    friend: url.searchParams.get("friend") ?? undefined,
    pet: url.searchParams.get("pet") ?? undefined,
    createdFrom: url.searchParams.get("createdFrom") ?? undefined,
    createdTo: url.searchParams.get("createdTo") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
    dir: url.searchParams.get("dir") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
  });
  const data = await buildBookingsDashboardDto({ range, metric, filters });
  if (!data) return NextResponse.json({ error: "Unavailable" }, { status: 503 });

  const viewParam = url.searchParams.get("view");
  const payload =
    viewParam && (VIEWS as readonly string[]).includes(viewParam)
      ? pickView(data, viewParam as View)
      : data;

  if (bookingsPayloadIsUnsafe(payload)) {
    return NextResponse.json({ error: "Refusing to return sensitive fields" }, { status: 500 });
  }
  return NextResponse.json(payload);
}
