import { QUIZ_QUESTION_SECONDS } from "@/lib/quiz/timer";

export type PublicChoice = { id: "a" | "b" | "c" | "d"; text: string };

export type PublicQuestion = {
  id?: string;
  index: number;
  total: number;
  prompt: string;
  choices: PublicChoice[];
  timerSeconds: number;
  correctId?: "a" | "b" | "c" | "d";
  explanation?: string;
};

export function publicQuestionPayload(
  question: {
    id?: string;
    prompt: string;
    choices: PublicChoice[];
    correctId: "a" | "b" | "c" | "d";
    explanation: string;
    timerSeconds?: number;
  },
  input: { index: number; total: number; revealed: boolean },
): PublicQuestion {
  const base: PublicQuestion = {
    id: question.id,
    index: input.index,
    total: input.total,
    prompt: question.prompt,
    choices: question.choices.map((choice) => ({ id: choice.id, text: choice.text })),
    timerSeconds: QUIZ_QUESTION_SECONDS,
  };
  if (!input.revealed) return base;
  return { ...base, correctId: question.correctId, explanation: question.explanation };
}

export function payloadLeaksAnswer(payload: PublicQuestion | null | undefined): boolean {
  if (!payload) return false;
  return Boolean(payload.correctId || payload.explanation);
}

export function stripAnswerKey(payload: PublicQuestion): PublicQuestion {
  return {
    id: payload.id,
    index: payload.index,
    total: payload.total,
    prompt: payload.prompt,
    choices: payload.choices.map((choice) => ({ id: choice.id, text: choice.text })),
    timerSeconds: payload.timerSeconds,
  };
}
