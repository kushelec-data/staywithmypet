"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminCard, AdminTable } from "@/components/admin/AdminUi";

type QuizRow = { id: string; title: string; status: string; questionCount: number };

export function QuizAdminList({ initial }: { initial: QuizRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRows(initial);
  }, [initial]);

  async function createQuiz() {
    const res = await fetch("/api/admin/quiz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "New quiz" }) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Could not create quiz");
      return;
    }
    router.push(`/admin/quiz/${json.id}`);
  }

  async function duplicate(id: string) {
    const res = await fetch("/api/admin/quiz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ duplicateOf: id }) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Could not duplicate");
      return;
    }
    router.push(`/admin/quiz/${json.id}`);
  }

  async function start(id: string) {
    const res = await fetch("/api/admin/quiz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ startQuizId: id }) });
    const json = await res.json().catch(() => ({}));
    const gameId = String(json.gameId ?? json.id ?? "");
    if (!res.ok || !gameId) {
      setError(json.error ?? "Could not start the live game. No game was created.");
      return;
    }
    router.push(`/admin/quiz/host/${gameId}`);
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button type="button" onClick={() => void createQuiz()} className="rounded-full bg-[#2E6B3F] px-4 py-2 text-sm font-semibold text-white">
        Create quiz
      </button>
      <AdminTable
        headers={["Title", "Questions", ""]}
        empty="No quizzes yet."
        rows={rows.map((row) => [
          <Link key={row.id} href={`/admin/quiz/${row.id}`} className="font-semibold text-[#2E6B3F]">
            {row.title}
          </Link>,
          String(row.questionCount),
          <span key={`${row.id}-actions`} className="flex flex-wrap gap-2">
            <button type="button" className="font-semibold text-[#2E6B3F]" onClick={() => void start(row.id)}>
              Start live game
            </button>
            <button type="button" className="font-semibold text-[#2E6B3F]" onClick={() => void duplicate(row.id)}>
              Duplicate
            </button>
          </span>,
        ])}
      />
      <AdminCard>
        <p className="text-sm text-muted">Players join at /quiz with the 6-digit PIN. Automatic answers stay hidden until you end a question.</p>
      </AdminCard>
    </div>
  );
}
