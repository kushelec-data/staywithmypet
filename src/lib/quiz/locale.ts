import type { QuizChoiceId, QuizQuestionRow } from "@/lib/quiz/types";
import { QUIZ_QUESTION_SECONDS } from "@/lib/quiz/timer";

export type QuizLocale = "en" | "et";

export const QUIZ_LOCALE_STORAGE_KEY = "swmp_quiz_locale";

export function parseQuizLocale(value: unknown): QuizLocale {
  return value === "et" ? "et" : "en";
}

export function persistQuizLocale(locale: QuizLocale) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(QUIZ_LOCALE_STORAGE_KEY, locale);
}

export function readStoredQuizLocale(): QuizLocale {
  if (typeof window === "undefined") return "en";
  return parseQuizLocale(window.localStorage.getItem(QUIZ_LOCALE_STORAGE_KEY));
}

export type LocalizedQuizQuestion = {
  id: string;
  prompt: string;
  choices: Array<{ id: QuizChoiceId; text: string }>;
  correctId: QuizChoiceId;
  explanation: string;
  timerSeconds: number;
};

export function localizeQuestion(question: QuizQuestionRow, locale: QuizLocale): LocalizedQuizQuestion {
  const et = locale === "et";
  return {
    id: question.id,
    prompt: et ? question.promptEt || question.promptEn : question.promptEn,
    choices: question.choices.map((choice) => ({
      id: choice.id,
      text: et ? choice.textEt || choice.textEn : choice.textEn,
    })),
    correctId: question.correctId,
    explanation: et ? question.explanationEt || question.explanationEn : question.explanationEn,
    timerSeconds: QUIZ_QUESTION_SECONDS,
  };
}

export function hostQuestionView(question: QuizQuestionRow | null, locale: QuizLocale) {
  if (!question) return null;
  return localizeQuestion(question, locale);
}
