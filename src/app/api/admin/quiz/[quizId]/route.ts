import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/require-api";
import { getQuiz, saveQuiz } from "@/lib/quiz/store";
import type { QuizQuestionRow } from "@/lib/quiz/types";

type RouteContext = { params: Promise<{ quizId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const gate = await requireAdminApi();
  if (gate.response) return gate.response;
  const { quizId } = await context.params;
  const packed = await getQuiz(quizId);
  if (!packed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(packed);
}

export async function PATCH(request: Request, context: RouteContext) {
  const gate = await requireAdminApi();
  if (gate.response) return gate.response;
  const { quizId } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    title?: string;
    questions?: Array<Omit<QuizQuestionRow, "quizId"> & { quizId?: string }>;
  } | null;
  if (!body?.title || !Array.isArray(body.questions)) {
    return NextResponse.json({ error: "Invalid quiz" }, { status: 400 });
  }
  const result = await saveQuiz(quizId, { title: body.title, questions: body.questions });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
