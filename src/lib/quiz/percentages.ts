export type AnswerDistribution = { a: number; b: number; c: number; d: number };

export const QUIZ_CHOICE_IDS = ["a", "b", "c", "d"] as const;

export function answerPercentage(answerCount: number, totalAnswers: number): number {
  if (!totalAnswers) return 0;
  return Math.round((answerCount / totalAnswers) * 100);
}

export function totalAnswers(distribution: AnswerDistribution): number {
  return distribution.a + distribution.b + distribution.c + distribution.d;
}

export function distributionPercentages(distribution: AnswerDistribution): AnswerDistribution & { total: number } {
  const total = totalAnswers(distribution);
  return {
    a: answerPercentage(distribution.a, total),
    b: answerPercentage(distribution.b, total),
    c: answerPercentage(distribution.c, total),
    d: answerPercentage(distribution.d, total),
    total,
  };
}

export function previousQuestionPercentLine(distribution: AnswerDistribution): string {
  const pct = distributionPercentages(distribution);
  return `A ${pct.a}% · B ${pct.b}% · C ${pct.c}% · D ${pct.d}%`;
}

export function answerCountLabel(count: number): string {
  return count === 1 ? "1 answer" : `${count} answers`;
}

export function emptyAnswerDistribution(): AnswerDistribution {
  return { a: 0, b: 0, c: 0, d: 0 };
}

export function leaderboardDistributionRows(
  distribution: AnswerDistribution | null | undefined,
  correctId?: "a" | "b" | "c" | "d" | null,
) {
  const dist = distribution ?? emptyAnswerDistribution();
  const total = totalAnswers(dist);
  return QUIZ_CHOICE_IDS.map((id) => ({
    id,
    count: dist[id],
    percent: answerPercentage(dist[id], total),
    correct: correctId === id,
  }));
}
