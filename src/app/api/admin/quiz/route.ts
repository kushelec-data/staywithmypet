import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/require-api";
import { createQuiz, duplicateQuiz, listQuizzes, startLiveGame } from "@/lib/quiz/store";

export async function GET() {
  const gate = await requireAdminApi();
  if (gate.response) return gate.response;
  const quizzes = await listQuizzes();
  return NextResponse.json({ quizzes });
}

export async function POST(request: Request) {
  const gate = await requireAdminApi();
  if (gate.response) return gate.response;
  const body = (await request.json().catch(() => null)) as { title?: string; duplicateOf?: string; startQuizId?: string } | null;
  if (body?.duplicateOf) {
    const result = await duplicateQuiz(body.duplicateOf);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  }
  if (body?.startQuizId) {
    const result = await startLiveGame(body.startQuizId, gate.session.userId);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  }
  const result = await createQuiz(String(body?.title ?? "New quiz"));
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
