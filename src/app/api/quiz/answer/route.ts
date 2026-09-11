import { NextResponse } from "next/server";
import { submitAnswer } from "@/lib/quiz/store";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: string; choiceId?: string } | null;
  const cookie = request.headers.get("cookie")?.match(/(?:^|; )swmp_quiz_player=([^;]+)/)?.[1];
  const token = String(body?.token || cookie || "");
  const choiceId = body?.choiceId;
  if (choiceId !== "a" && choiceId !== "b" && choiceId !== "c" && choiceId !== "d") {
    return NextResponse.json({ error: "Pick an answer" }, { status: 400 });
  }
  const result = await submitAnswer(token, choiceId);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
