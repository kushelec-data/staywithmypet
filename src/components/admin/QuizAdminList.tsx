"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminCard, AdminTable } from "@/components/admin/AdminUi";
import { adminQuizHostHref, hostPinStorageKey } from "@/lib/quiz/pin";

type QuizRow = { id: string; title: string; status: string; questionCount: number };

async function startLiveGameRequest(body: { startLiveGame?: boolean; startQuizId?: string }) {
  const res = await fetch("/api/admin/quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

function openHost(gameId: string, pin?: string) {
  if (pin) window.sessionStorage.setItem(hostPinStorageKey(gameId), pin);
  window.location.assign(adminQuizHostHref(gameId));
}

export function QuizAdminList({ initial }: { initial: QuizRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    router.push(`/admin/quiz/edit/${json.id}`);
  }

  async function duplicate(id: string) {
    const res = await fetch("/api/admin/quiz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ duplicateOf: id }) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Could not duplicate");
      return;
    }
    router.push(`/admin/quiz/edit/${json.id}`);
  }

  async function start(body: { startLiveGame?: boolean; startQuizId?: string }) {
    setBusy(true);
    setError(null);
    const { res, json } = await startLiveGameRequest(body);
    setBusy(false);
    const gameId = String(json.gameId ?? json.id ?? "");
    if (!res.ok || !gameId || !json.pin) {
      setError(json.error ?? "Could not start the live game. No PIN was created.");
      return;
    }
    openHost(gameId, String(json.pin));
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => void start({ startLiveGame: true })}
        className="min-h-[56px] w-full rounded-2xl bg-[#2E6B3F] px-6 text-lg font-semibold text-white shadow-sm disabled:opacity-50 sm:w-auto"
      >
        START LIVE GAME
      </button>
      <button type="button" onClick={() => void createQuiz()} className="rounded-full border border-[#2E6B3F] px-4 py-2 text-sm font-semibold text-[#2E6B3F]">
        Create quiz
      </button>
      <AdminTable
        headers={["Title", "Questions", ""]}
        empty="No quizzes yet."
        rows={rows.map((row) => [
          <Link key={row.id} href={`/admin/quiz/edit/${row.id}`} className="font-semibold text-[#2E6B3F]">
            {row.title}
          </Link>,
          String(row.questionCount),
          <span key={`${row.id}-actions`} className="flex flex-wrap gap-2">
            <button type="button" className="font-semibold text-[#2E6B3F]" onClick={() => void start({ startQuizId: row.id })}>
              Start this quiz
            </button>
            <button type="button" className="font-semibold text-[#2E6B3F]" onClick={() => void duplicate(row.id)}>
              Duplicate
            </button>
          </span>,
        ])}
      />
      <AdminCard>
        <p className="text-sm text-muted">Players join at staywithmypet.ee/quiz with the host PIN. You stay on the admin host screen.</p>
      </AdminCard>
    </div>
  );
}
