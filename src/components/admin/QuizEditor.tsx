"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminCard } from "@/components/admin/AdminUi";
import { QUIZ_QUESTION_SECONDS } from "@/lib/quiz/timer";
import type { QuizQuestionRow } from "@/lib/quiz/types";

const EMPTY: Omit<QuizQuestionRow, "id" | "quizId"> = {
  sortOrder: 1,
  promptEn: "",
  promptEt: "",
  choices: [
    { id: "a", textEn: "", textEt: "" },
    { id: "b", textEn: "", textEt: "" },
    { id: "c", textEn: "", textEt: "" },
    { id: "d", textEn: "", textEt: "" },
  ],
  correctId: "a",
  explanationEn: "",
  explanationEt: "",
  sourceLabel: "",
  sourceUrl: "",
  timerSeconds: QUIZ_QUESTION_SECONDS,
};

export function QuizEditor({
  quizId,
  title: initialTitle,
  questions: initialQuestions,
}: {
  quizId: string;
  title: string;
  questions: QuizQuestionRow[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [questions, setQuestions] = useState(initialQuestions);
  const [message, setMessage] = useState<string | null>(null);

  function move(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= questions.length) return;
    const copy = [...questions];
    const [row] = copy.splice(index, 1);
    copy.splice(next, 0, row);
    setQuestions(copy.map((item, sortOrder) => ({ ...item, sortOrder: sortOrder + 1 })));
  }

  async function save() {
    const res = await fetch(`/api/admin/quiz/${quizId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        questions: questions.map((question) => ({ ...question, timerSeconds: QUIZ_QUESTION_SECONDS })),
      }),
    });
    const json = await res.json().catch(() => ({}));
    setMessage(res.ok ? "Saved." : json.error ?? "Could not save");
    if (res.ok) router.refresh();
  }

  async function start() {
    setMessage(null);
    await save();
    const res = await fetch("/api/admin/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startQuizId: quizId }),
    });
    const json = await res.json().catch(() => ({}));
    const gameId = String(json.gameId ?? json.id ?? "");
    if (!res.ok || !gameId) {
      setMessage(json.error ?? "Could not start the live game. No game was created.");
      return;
    }
    if (!json.pin) {
      setMessage("The live game was created, but no PIN was returned. Open the host screen and refresh.");
    }
    router.push(`/admin/quiz/host/${gameId}`);
  }

  function updateQuestion(index: number, patch: Partial<QuizQuestionRow>) {
    setQuestions((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="space-y-4">
      <AdminCard>
        <label className="block text-sm">
          Quiz title
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-xl border border-[#E5E2D8] px-3 py-2" />
        </label>
        <p className="mt-3 text-sm text-muted">Every live question lasts {QUIZ_QUESTION_SECONDS} seconds. Correct answer IDs are shared across English and Estonian.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={() => void save()} className="rounded-full border border-[#2E6B3F] px-4 py-2 text-sm font-semibold text-[#2E6B3F]">
            Save
          </button>
          <button type="button" onClick={() => void start()} className="rounded-full bg-[#2E6B3F] px-4 py-2 text-sm font-semibold text-white">
            Start live game
          </button>
        </div>
        {message ? <p className="mt-2 text-sm">{message}</p> : null}
      </AdminCard>
      {questions.map((question, index) => (
        <AdminCard key={question.id ?? `new-${index}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">Question {index + 1}</p>
            <div className="flex gap-2 text-sm">
              <button type="button" onClick={() => move(index, -1)}>
                Up
              </button>
              <button type="button" onClick={() => move(index, 1)}>
                Down
              </button>
            </div>
          </div>

          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Correct answer</p>
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            {question.choices.map((choice) => (
              <label key={choice.id} className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${index}`}
                  checked={question.correctId === choice.id}
                  onChange={() => updateQuestion(index, { correctId: choice.id })}
                />
                {choice.id.toUpperCase()}
              </label>
            ))}
          </div>

          <p className="mt-6 font-semibold">English</p>
          <textarea
            value={question.promptEn}
            onChange={(e) => updateQuestion(index, { promptEn: e.target.value })}
            className="mt-2 w-full rounded-xl border border-[#E5E2D8] px-3 py-2"
            rows={3}
            placeholder="Question"
          />
          {question.choices.map((choice, choiceIndex) => (
            <label key={`en-${choice.id}`} className="mt-2 block text-sm">
              Answer {choice.id.toUpperCase()}
              <input
                value={choice.textEn}
                onChange={(e) =>
                  updateQuestion(index, {
                    choices: question.choices.map((item, j) => (j === choiceIndex ? { ...item, textEn: e.target.value } : item)),
                  })
                }
                className="mt-1 w-full rounded-xl border border-[#E5E2D8] px-3 py-2"
              />
            </label>
          ))}
          <label className="mt-3 block text-sm">
            Explanation
            <textarea
              value={question.explanationEn}
              onChange={(e) => updateQuestion(index, { explanationEn: e.target.value })}
              className="mt-1 w-full rounded-xl border border-[#E5E2D8] px-3 py-2"
              rows={2}
            />
          </label>

          <p className="mt-6 font-semibold">Estonian</p>
          <textarea
            value={question.promptEt}
            onChange={(e) => updateQuestion(index, { promptEt: e.target.value })}
            className="mt-2 w-full rounded-xl border border-[#E5E2D8] px-3 py-2"
            rows={3}
            placeholder="Küsimus"
          />
          {question.choices.map((choice, choiceIndex) => (
            <label key={`et-${choice.id}`} className="mt-2 block text-sm">
              Vastus {choice.id.toUpperCase()}
              <input
                value={choice.textEt}
                onChange={(e) =>
                  updateQuestion(index, {
                    choices: question.choices.map((item, j) => (j === choiceIndex ? { ...item, textEt: e.target.value } : item)),
                  })
                }
                className="mt-1 w-full rounded-xl border border-[#E5E2D8] px-3 py-2"
              />
            </label>
          ))}
          <label className="mt-3 block text-sm">
            Selgitus
            <textarea
              value={question.explanationEt}
              onChange={(e) => updateQuestion(index, { explanationEt: e.target.value })}
              className="mt-1 w-full rounded-xl border border-[#E5E2D8] px-3 py-2"
              rows={2}
            />
          </label>

          <label className="mt-4 block text-sm">
            Source
            <input
              value={question.sourceLabel}
              onChange={(e) => updateQuestion(index, { sourceLabel: e.target.value })}
              className="mt-1 w-full rounded-xl border border-[#E5E2D8] px-3 py-2"
            />
          </label>
          <input
            value={question.sourceUrl}
            onChange={(e) => updateQuestion(index, { sourceUrl: e.target.value })}
            className="mt-2 w-full rounded-xl border border-[#E5E2D8] px-3 py-2 text-sm"
          />
        </AdminCard>
      ))}
      <button
        type="button"
        onClick={() =>
          setQuestions((rows) => [
            ...rows,
            {
              ...EMPTY,
              id: "",
              quizId,
              sortOrder: rows.length + 1,
              choices: EMPTY.choices.map((item) => ({ ...item })),
            },
          ])
        }
        className="rounded-full border px-4 py-2 text-sm font-semibold"
      >
        Add question
      </button>
    </div>
  );
}
