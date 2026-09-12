export type QuizChoiceId = "a" | "b" | "c" | "d";

export type QuizQuestionRow = {
  id: string;
  quizId: string;
  sortOrder: number;
  promptEn: string;
  promptEt: string;
  choices: Array<{ id: QuizChoiceId; textEn: string; textEt: string }>;
  correctId: QuizChoiceId;
  explanationEn: string;
  explanationEt: string;
  sourceLabel: string;
  sourceUrl: string;
  timerSeconds: number;
  imageUrl?: string | null;
};
