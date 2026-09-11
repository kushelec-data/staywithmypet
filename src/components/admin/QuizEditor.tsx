"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminCard } from "@/components/admin/AdminUi";
import type { QuizQuestionRow } from "@/lib/quiz/types";

const EMPTY: Omit<QuizQuestionRow, "id" | "quizId"> = {
  sortOrder: 1,
  prompt: "",
  choices: [
    { id: "a", text: "" },
    { id: "b", text: "" },
    { id: "c", text: "" },
    { id: "d", text: "" },
  ],
  correctId: "a",
  explanation: "",
  sourceLabel: "",
  sourceUrl: "",
  timerSeconds: 15,
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
      body: JSON.stringify({ title, questions }),
    });
    const json = await res.json().catch(() => ({}));
    setMessage(res.ok ? "Saved." : json.error ?? "Could not save");
    if (res.ok) router.refresh();
  }

  async function start() {
    await save();
    const res = await fetch("/api/admin/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startQuizId: quizId }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(json.error ?? "Could not start");
      return;
    }
    router.push(`/admin/quiz/host/${json.id}`);
  }

  return (
    <div className="space-y-4">
      <AdminCard>
        <label className="block text-sm">
          Quiz title
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-xl border border-[#E5E2D8] px-3 py-2" />
        </label>
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
          <textarea
            value={question.prompt}
            onChange={(e) => setQuestions((rows) => rows.map((row, i) => (i === index ? { ...row, prompt: e.target.value } : row)))}
            className="mt-3 w-full rounded-xl border border-[#E5E2D8] px-3 py-2"
            rows={3}
          />
          {question.choices.map((choice, choiceIndex) => (
            <label key={choice.id} className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`correct-${index}`}
                checked={question.correctId === choice.id}
                onChange={() => setQuestions((rows) => rows.map((row, i) => (i === index ? { ...row, correctId: choice.id } : row)))}
              />
              <input
                value={choice.text}
                onChange={(e) =>
                  setQuestions((rows) =>
                    rows.map((row, i) =>
                      i === index
                        ? {
                            ...row,
                            choices: row.choices.map((item, j) => (j === choiceIndex ? { ...item, text: e.target.value } : item)) as QuizQuestionRow["choices"],
                          }
                        : row,
                    ),
                  )
                }
                className="w-full rounded-xl border border-[#E5E2D8] px-3 py-2"
              />
            </label>
          ))}
          <label className="mt-3 block text-sm">
            Timer (seconds)
            <input
              type="number"
              min={5}
              max={120}
              value={question.timerSeconds}
              onChange={(e) => setQuestions((rows) => rows.map((row, i) => (i === index ? { ...row, timerSeconds: Number(e.target.value) || 15 } : row)))}
              className="mt-1 w-32 rounded-xl border border-[#E5E2D8] px-3 py-2"
            />
          </label>
          <label className="mt-3 block text-sm">
            Explanation
            <textarea
              value={question.explanation}
              onChange={(e) => setQuestions((rows) => rows.map((row, i) => (i === index ? { ...row, explanation: e.target.value } : row)))}
              className="mt-1 w-full rounded-xl border border-[#E5E2D8] px-3 py-2"
              rows={2}
            />
          </label>
          <label className="mt-3 block text-sm">
            Source
            <input
              value={question.sourceLabel}
              onChange={(e) => setQuestions((rows) => rows.map((row, i) => (i === index ? { ...row, sourceLabel: e.target.value } : row)))}
              className="mt-1 w-full rounded-xl border border-[#E5E2D8] px-3 py-2"
            />
          </label>
          <input
            value={question.sourceUrl}
            onChange={(e) => setQuestions((rows) => rows.map((row, i) => (i === index ? { ...row, sourceUrl: e.target.value } : row)))}
            className="mt-2 w-full rounded-xl border border-[#E5E2D8] px-3 py-2 text-sm"
          />
        </AdminCard>
      ))}
      <button
        type="button"
        onClick={() => setQuestions((rows) => [...rows, { ...EMPTY, id: "", quizId, sortOrder: rows.length + 1, choices: EMPTY.choices.map((item) => ({ ...item })) as QuizQuestionRow["choices"] }])}
        className="rounded-full border px-4 py-2 text-sm font-semibold"
      >
        Add question
      </button>
    </div>
  );
}
