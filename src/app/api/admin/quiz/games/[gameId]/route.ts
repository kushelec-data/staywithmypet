import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/require-api";
import { hostEndQuestion, hostGameState, hostNextQuestion, hostRevealAnswer, hostShowLeaderboard, hostStartQuiz } from "@/lib/quiz/store";

type RouteContext = { params: Promise<{ gameId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const gate = await requireAdminApi();
  if (gate.response) return gate.response;
  const { gameId } = await context.params;
  const state = await hostGameState(gameId);
  if (!state) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(state);
}

export async function POST(request: Request, context: RouteContext) {
  const gate = await requireAdminApi();
  if (gate.response) return gate.response;
  const { gameId } = await context.params;
  const body = (await request.json().catch(() => null)) as { action?: string } | null;
  if (body?.action === "start" || body?.action === "open") {
    const result = await hostStartQuiz(gameId);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  }
  if (body?.action === "end-question" || body?.action === "close") {
    const result = await hostEndQuestion(gameId);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  }
  if (body?.action === "reveal" || body?.action === "reveal-answer") {
    const result = await hostRevealAnswer(gameId);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  }
  if (body?.action === "show-leaderboard") {
    const result = await hostShowLeaderboard(gameId);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  }
  if (body?.action === "next") {
    const result = await hostNextQuestion(gameId);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
