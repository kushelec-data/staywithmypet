import { monthBounds } from "@/lib/booking-calendar";
import { eachISODateInRangeInclusive } from "@/lib/pet-availability";
import { checkRateLimit, rateLimitMessage } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ petId: string }> };

/**
 * GET — anonymized booked dates for a public pet (no names/photos).
 * Query: year, month (1–12).
 */
export async function GET(request: Request, context: RouteContext) {
  const { petId } = await context.params;
  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));

  if (!petId || !Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anon";
  const limit = checkRateLimit("api_default", clientIp);
  if (!limit.ok) {
    return NextResponse.json(
      { error: rateLimitMessage(limit.retryAfterSec) },
      { status: 429 },
    );
  }

  const supabase = await createClient();
  const { data: pet, error: petError } = await supabase
    .from("pets")
    .select("id, is_public, is_active, owner_id")
    .eq("id", petId)
    .maybeSingle();

  if (petError || !pet) {
    return NextResponse.json({ error: "Pet not found" }, { status: 404 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwner = user?.id === pet.owner_id;
  if (!isOwner && (pet.is_public !== true || pet.is_active !== true)) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ dates: [] });
  }

  const { start, end } = monthBounds(year, month - 1);

  const { data: rows, error } = await admin
    .from("bookings")
    .select("start_date, end_date")
    .eq("pet_id", petId)
    .in("status", ["upcoming", "active"])
    .lte("start_date", end)
    .gte("end_date", start);

  if (error) {
    return NextResponse.json({ dates: [] });
  }

  const dates = new Set<string>();
  for (const row of rows ?? []) {
    for (const iso of eachISODateInRangeInclusive(row.start_date as string, row.end_date as string)) {
      dates.add(iso);
    }
  }

  return NextResponse.json({ dates: [...dates].sort() });
}
