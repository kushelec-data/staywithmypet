import { NextResponse } from "next/server";
import { playerState } from "@/lib/quiz/store";
import { payloadLeaksAnswer } from "@/lib/quiz/public-state";
import { answerKeyIsPublic } from "@/lib/quiz/game-status";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const header = request.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : "";
  const cookie = request.headers.get("cookie")?.match(/(?:^|; )swmp_quiz_player=([^;]+)/)?.[1];
  const token = decodeURIComponent(url.searchParams.get("token") || bearer || cookie || "");
  if (!token) return NextResponse.json({ error: "Join the game first" }, { status: 401 });
  const state = await playerState(token);
  if ("error" in state) return NextResponse.json({ error: state.error }, { status: 400 });
  if (!answerKeyIsPublic(state.status)) {
    if (state.question && payloadLeaksAnswer(state.question)) {
      return NextResponse.json({ error: "Refusing to leak answers" }, { status: 500 });
    }
    if (state.you.lastCorrect !== null || state.you.lastPoints !== null) {
      return NextResponse.json({ error: "Refusing to leak answers" }, { status: 500 });
    }
  }
  return NextResponse.json(state);
}
