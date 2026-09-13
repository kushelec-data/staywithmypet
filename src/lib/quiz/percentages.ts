export type AnswerDistribution = { a: number; b: number; c: number; d: number };

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
