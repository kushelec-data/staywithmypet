export function scoreCorrectAnswer(elapsedMs: number, limitMs: number): number {
  if (limitMs <= 0) return 1000;
  const elapsed = Math.min(Math.max(0, elapsedMs), limitMs);
  return Math.round(1000 * (1 - (elapsed / limitMs) * 0.5));
}

export function scoreAnswer(input: { correct: boolean; elapsedMs: number; limitMs: number }): number {
  if (!input.correct) return 0;
  return scoreCorrectAnswer(input.elapsedMs, input.limitMs);
}

export function remainingMs(closesAtIso: string | null, nowMs = Date.now()): number {
  if (!closesAtIso) return 0;
  return Math.max(0, Date.parse(closesAtIso) - nowMs);
}
