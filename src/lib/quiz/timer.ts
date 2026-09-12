import { isQuestionOpen } from "@/lib/quiz/game-status";
import { remainingMs } from "@/lib/quiz/scoring";

export const QUIZ_QUESTION_SECONDS = 30;

export function questionHasEnded(endsAt: string | null, nowMs = Date.now()): boolean {
  if (!endsAt) return false;
  return Date.parse(endsAt) <= nowMs;
}

export function statusAfterTimerExpiry(status: string, endsAt: string | null, nowMs = Date.now()): string {
  if (!isQuestionOpen(status)) return status;
  if (!questionHasEnded(endsAt, nowMs)) return status;
  return "waiting_reveal";
}

export function serverElapsedMs(startedAt: string | null, nowMs = Date.now(), limitMs?: number): number {
  if (!startedAt) return 0;
  const elapsed = Math.max(0, nowMs - Date.parse(startedAt));
  if (typeof limitMs === "number") return Math.min(elapsed, Math.max(0, limitMs));
  return elapsed;
}

export function openQuestionUpdate(input: { index: number; timerSeconds?: number; now?: Date }) {
  const now = input.now ?? new Date();
  const ends = new Date(now.getTime() + QUIZ_QUESTION_SECONDS * 1000).toISOString();
  const started = now.toISOString();
  return {
    status: "question_open" as const,
    current_index: input.index,
    question_started_at: started,
    question_ends_at: ends,
    question_closes_at: ends,
    round_scored: false,
  };
}

export function quizServerOffsetMs(serverNow: string | number | Date | null | undefined, clientNowMs = Date.now()): number {
  if (serverNow == null) return 0;
  const serverMs = typeof serverNow === "number" ? serverNow : Date.parse(String(serverNow));
  if (!Number.isFinite(serverMs)) return 0;
  return serverMs - clientNowMs;
}

export function quizEffectiveNowMs(serverOffsetMs: number, clientNowMs = Date.now()): number {
  return clientNowMs + serverOffsetMs;
}

export function remainingQuizSeconds(
  endsAt: string | null,
  nowMs = Date.now(),
  maxSeconds = QUIZ_QUESTION_SECONDS,
): number {
  if (!endsAt) return 0;
  const raw = Math.ceil((Date.parse(endsAt) - nowMs) / 1000);
  return Math.min(maxSeconds, Math.max(0, raw));
}

export function remainingFromEndsAt(endsAt: string | null, nowMs = Date.now()): number {
  return remainingMs(endsAt, nowMs);
}

export function applyRoundScores(
  players: Array<{ id: string; score: number }>,
  answers: Array<{ player_id: string; points: number }>,
): Array<{ id: string; score: number }> {
  const extra = new Map<string, number>();
  for (const row of answers) extra.set(String(row.player_id), Number(row.points) || 0);
  return players.map((player) => ({
    id: player.id,
    score: player.score + (extra.get(player.id) ?? 0),
  }));
}
