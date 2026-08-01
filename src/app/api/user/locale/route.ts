import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/translations";
import { isSameOriginRequest } from "@/lib/security/same-origin";
import { safeLogError } from "@/lib/security/safe-log";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { locale?: string };
  try {
    body = (await request.json()) as { locale?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const locale: Locale = body.locale === "et" ? "et" : "en";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const { error } = await supabase.auth.updateUser({
    data: { swmp_locale: locale },
  });

  if (error) {
    safeLogError("email persist user locale failed", { message: error.message });
    return NextResponse.json({ error: "Could not save locale." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, locale });
}
