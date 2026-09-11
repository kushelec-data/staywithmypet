export const QUIZ_GAME_STATUSES = [
  "lobby",
  "question_open",
  "waiting_reveal",
  "reveal",
  "leaderboard",
  "finished",
] as const;

export type QuizGameStatus = (typeof QUIZ_GAME_STATUSES)[number];

export function isQuestionOpen(status: string): boolean {
  return status === "question_open" || status === "question";
}

export function isWaitingReveal(status: string): boolean {
  return status === "waiting_reveal";
}

export function answerKeyIsPublic(status: string): boolean {
  return status === "reveal" || status === "leaderboard";
}

export function hostMayOpenQuestion(status: string): boolean {
  return status === "lobby";
}

export function hostMayCloseQuestion(status: string): boolean {
  return isQuestionOpen(status);
}

export function hostMayRevealAnswer(status: string): boolean {
  return status === "waiting_reveal";
}

export function hostMayShowLeaderboard(status: string): boolean {
  return status === "reveal";
}

export function hostMayNextQuestion(status: string): boolean {
  return status === "leaderboard";
}

export function playerMayAnswer(status: string): boolean {
  return isQuestionOpen(status);
}

export function playerMayReact(status: string): boolean {
  return status === "reveal" || status === "leaderboard";
}

export function formatHostTimer(remainingMs: number): string {
  const total = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
