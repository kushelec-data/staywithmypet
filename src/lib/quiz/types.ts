export type QuizChoiceId = "a" | "b" | "c" | "d";

export type QuizQuestionRow = {
  id: string;
  quizId: string;
  sortOrder: number;
  prompt: string;
  choices: Array<{ id: QuizChoiceId; text: string }>;
  correctId: QuizChoiceId;
  explanation: string;
  sourceLabel: string;
  sourceUrl: string;
  timerSeconds: number;
};
