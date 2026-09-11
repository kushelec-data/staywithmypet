import { NextResponse } from "next/server";
import { submitReaction } from "@/lib/quiz/store";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: string; reaction?: string } | null;
  const cookie = request.headers.get("cookie")?.match(/(?:^|; )swmp_quiz_player=([^;]+)/)?.[1];
  const token = String(body?.token || cookie || "");
  const result = await submitReaction(token, body?.reaction);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
