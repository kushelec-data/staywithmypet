export const QUIZ_POINTS_PER_CORRECT = 200;

export function quizMaxScore(totalQuestions: number): number {
  return QUIZ_POINTS_PER_CORRECT * Math.max(0, totalQuestions);
}

export function scoreCorrectAnswer(_elapsedMs?: number, _limitMs?: number): number {
  return QUIZ_POINTS_PER_CORRECT;
}

export function scoreAnswer(input: { correct: boolean; elapsedMs?: number; limitMs?: number }): number {
  return input.correct ? QUIZ_POINTS_PER_CORRECT : 0;
}

export function remainingMs(closesAtIso: string | null, nowMs = Date.now()): number {
  if (!closesAtIso) return 0;
  return Math.max(0, Date.parse(closesAtIso) - nowMs);
}
