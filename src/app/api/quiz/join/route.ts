import { NextResponse } from "next/server";
import { joinGameWithPin, registerPlayer } from "@/lib/quiz/store";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { pin?: string; displayName?: string; locale?: string } | null;
  const pin = String(body?.pin ?? "");
  const displayName = typeof body?.displayName === "string" ? body.displayName : "";
  const locale = body?.locale;

  if (!displayName.trim()) {
    const preview = await joinGameWithPin(pin);
    if ("error" in preview) return NextResponse.json({ error: preview.error }, { status: 400 });
    return NextResponse.json({ ok: true, gameId: preview.gameId, status: preview.status });
  }

  const joined = await registerPlayer(pin, displayName, locale);
  if ("error" in joined) return NextResponse.json({ error: joined.error }, { status: 400 });
  const response = NextResponse.json({ ok: true, gameId: joined.gameId, playerId: joined.playerId, token: joined.token, locale: joined.locale });
  response.cookies.set("swmp_quiz_player", joined.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 6,
  });
  return response;
}
