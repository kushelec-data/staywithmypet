import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/require-api";
import { buildAdminUserRows, filterAdminUserRows, paginateRows } from "@/lib/admin/aggregates";
import { loadAdminCatalog } from "@/lib/admin/queries";

export async function GET(request: Request) {
  const gate = await requireAdminApi();
  if (gate.response) return gate.response;

  const catalog = await loadAdminCatalog();
  if (!catalog) {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? undefined;
  const page = Number(url.searchParams.get("page") ?? "1") || 1;
  const rows = filterAdminUserRows(buildAdminUserRows(catalog), { q });
  const pageData = paginateRows(rows, page);

  return NextResponse.json({
    total: pageData.total,
    page: pageData.page,
    pageSize: pageData.pageSize,
    users: pageData.items.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      funnelStage: u.funnelStage,
      requestsSent: u.requestsSent,
      requestsReceived: u.requestsReceived,
      messagesSent: u.messagesSent,
      bookings: u.bookings,
      completedBookings: u.completedBookings,
    })),
  });
}
