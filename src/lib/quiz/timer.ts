import { isQuestionOpen } from "@/lib/quiz/game-status";
import { remainingMs } from "@/lib/quiz/scoring";

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

export function openQuestionUpdate(input: { index: number; timerSeconds: number; now?: Date }) {
  const now = input.now ?? new Date();
  const ends = new Date(now.getTime() + input.timerSeconds * 1000).toISOString();
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
