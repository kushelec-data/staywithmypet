import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/translations";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
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
    console.error("[email] failed to persist user locale", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, locale });
}
