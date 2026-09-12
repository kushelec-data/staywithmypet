"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { CONTENT_CONTAINER } from "@/lib/layout";
import { formatDisplayPin, hostPinStorageKey, QUIZ_PUBLIC_JOIN_HOST, type QuizReaction } from "@/lib/quiz/pin";
import { isQuestionOpen } from "@/lib/quiz/game-status";
import type { QuizLocale } from "@/lib/quiz/locale";
import { QUIZ_QUESTION_SECONDS } from "@/lib/quiz/timer";
import { useQuizCountdown } from "@/lib/quiz/useQuizCountdown";
import { QuizCircleTimer, QuizStatusChip } from "@/components/quiz/QuizVisuals";

type HostState = {
  gameId: string;
  pin: string;
  status: string;
  title: string;
  serverNow?: string;
  currentIndex: number;
  total: number;
  prompt: string | null;
  promptEn?: string | null;
  promptEt?: string | null;
  endsAt: string | null;
  remainingMs: number;
  answered: number;
  choices: Array<{ id: "a" | "b" | "c" | "d"; text: string }>;
  choicesEn?: Array<{ id: "a" | "b" | "c" | "d"; text: string }>;
  choicesEt?: Array<{ id: "a" | "b" | "c" | "d"; text: string }>;
  correctId: "a" | "b" | "c" | "d" | null;
  explanation: string | null;
  explanationEn?: string | null;
  explanationEt?: string | null;
  distribution: { a: number; b: number; c: number; d: number } | null;
  reactionCounts: Record<QuizReaction, number>;
  players: Array<{ id: string; name: string; score: number }>;
  top5: Array<{ id: string; name: string; score: number }>;
  finished: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  lobby: "Lobby",
  question_open: "Live",
  question: "Live",
  waiting_reveal: "Closed",
  reveal: "Reveal",
  leaderboard: "Leaderboard",
  finished: "Finished",
};

function HostPrimaryButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#E5E2D8] bg-[#F6F4EE]/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:static sm:mt-8 sm:border-0 sm:bg-transparent sm:p-0">
      <button
        type="button"
        onClick={onClick}
        className="btn-interactive min-h-[56px] w-full rounded-2xl bg-[#2E6B3F] px-6 text-lg font-semibold text-white shadow-sm"
      >
        {label}
      </button>
    </div>
  );
}

function HostPinPanel({
  pin,
  players,
  copied,
  onCopy,
  showStart,
  onStart,
}: {
  pin: string;
  players: number;
  copied: boolean;
  onCopy: () => void;
  showStart?: boolean;
  onStart?: () => void;
}) {
  return (
    <div className="rounded-[1.75rem] border border-[#E5E2D8] bg-white p-6 text-center shadow-sm sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#2E6B3F]">Join the quiz</p>
      <p className="mt-3 text-lg font-semibold sm:text-xl">{QUIZ_PUBLIC_JOIN_HOST}</p>
      <p className="mt-8 text-sm font-semibold uppercase tracking-[0.22em] text-muted">Game PIN</p>
      <p className="font-heading mt-3 break-all text-7xl font-semibold leading-none tracking-[0.12em] text-[#2E6B3F] sm:text-9xl">
        {formatDisplayPin(pin)}
      </p>
      <button type="button" onClick={onCopy} className="btn-interactive mt-6 rounded-2xl border border-[#2E6B3F] px-5 py-3 font-semibold text-[#2E6B3F]">
        {copied ? "Copied" : "Copy PIN"}
      </button>
      <p className="mt-6 text-lg">Players joined: {players}</p>
      {showStart && onStart ? <HostPrimaryButton label="Start Quiz" onClick={onStart} /> : null}
    </div>
  );
}

export function QuizHostClient({ gameId }: { gameId: string }) {
  const [state, setState] = useState<HostState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [previewLocale, setPreviewLocale] = useState<QuizLocale>("en");
  const [cachedPin] = useState(() => (typeof window === "undefined" ? "" : window.sessionStorage.getItem(hostPinStorageKey(gameId)) ?? ""));

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/admin/quiz/games/${gameId}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Could not load host screen");
      return;
    }
    setState(json);
    if (json.pin) window.sessionStorage.setItem(hostPinStorageKey(gameId), String(json.pin));
  }, [gameId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`quiz-host:${gameId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_quiz_games", filter: `id=eq.${gameId}` }, () => {
        void refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "live_quiz_roster", filter: `game_id=eq.${gameId}` }, () => {
        void refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "live_quiz_reaction_counts", filter: `game_id=eq.${gameId}` }, () => {
        void refresh();
      })
      .subscribe();
    const timer = window.setInterval(() => void refresh(), 3000);
    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [gameId, refresh]);

  const seconds = useQuizCountdown(state?.endsAt ?? null, state?.serverNow ?? null);

  useEffect(() => {
    if (isQuestionOpen(state?.status ?? "") && seconds <= 0) void refresh();
  }, [seconds, state?.status, refresh]);

  async function action(next: "open" | "close" | "reveal" | "show-leaderboard" | "next") {
    setError(null);
    const res = await fetch(`/api/admin/quiz/games/${gameId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: next }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) setError(json.error ?? "Could not update game");
    await refresh();
  }

  const visiblePin = state?.pin || cachedPin;

  async function copyPin() {
    if (!visiblePin) return;
    await navigator.clipboard.writeText(visiblePin);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  if (!visiblePin && (error || state)) {
    return (
      <main className="min-h-[100dvh] bg-[#F6F4EE] px-4 py-16">
        <p className={`${CONTENT_CONTAINER} text-center text-red-700`}>
          {error ?? "This live game has no PIN. Go back to Admin → Quiz and click START LIVE GAME."}
        </p>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="min-h-[100dvh] bg-[#F6F4EE] px-4 py-10">
        <div className={`${CONTENT_CONTAINER} mx-auto max-w-3xl`}>
          {visiblePin ? (
            <HostPinPanel pin={visiblePin} players={0} copied={copied} onCopy={() => void copyPin()} />
          ) : null}
          <p className="mt-6 text-center">{error ?? "Loading host screen…"}</p>
        </div>
      </main>
    );
  }
  const questionNumber = state.currentIndex + 1;
  const lastQuestion = questionNumber >= state.total;
  const prompt = previewLocale === "et" ? state.promptEt || state.promptEn || state.prompt : state.promptEn || state.prompt;
  const choices = previewLocale === "et" ? state.choicesEt || state.choicesEn || state.choices : state.choicesEn || state.choices;
  const explanation = previewLocale === "et" ? state.explanationEt || state.explanationEn || state.explanation : state.explanationEn || state.explanation;
  const correctText = choices.find((row) => row.id === state.correctId)?.text;
  const questionOpen = isQuestionOpen(state.status);
  const timerProgress = seconds / QUIZ_QUESTION_SECONDS;

  return (
    <main className="min-h-[100dvh] bg-[#F6F4EE] pb-28 pt-6 sm:pb-10 sm:pt-8">
      <div className={`${CONTENT_CONTAINER} mx-auto max-w-3xl`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-heading text-xl font-semibold sm:text-3xl">{state.title}</h1>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-full border border-[#E5E2D8] bg-white p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPreviewLocale("en")}
                className={`rounded-full px-3 py-1 ${previewLocale === "en" ? "bg-[#2E6B3F] text-white" : "text-muted"}`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setPreviewLocale("et")}
                className={`rounded-full px-3 py-1 ${previewLocale === "et" ? "bg-[#2E6B3F] text-white" : "text-muted"}`}
              >
                ET
              </button>
            </div>
            <QuizStatusChip>{STATUS_LABEL[state.status] ?? state.status}</QuizStatusChip>
          </div>
        </div>
        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
        <div className="mt-6">
          <HostPinPanel
            pin={visiblePin}
            players={state.players.length}
            copied={copied}
            onCopy={() => void copyPin()}
            showStart={state.status === "lobby"}
            onStart={() => void action("open")}
          />
        </div>

        {state.status === "lobby" ? (
          <div className="mt-6 rounded-[1.75rem] border border-[#E5E2D8] bg-white p-5 shadow-sm">
            <h2 className="font-heading text-lg font-semibold">Players</h2>
            <ul className="mt-3 max-h-[50vh] space-y-1 overflow-auto text-sm">
              {state.players.map((player) => (
                <li key={player.id} className="rounded-lg px-2 py-1.5 even:bg-[#F6F4EE]">
                  {player.name}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {questionOpen ? (
          <div className="mt-6 rounded-[1.75rem] border border-[#E5E2D8] bg-white p-5 shadow-sm sm:p-8">
            <p className="font-heading text-3xl font-semibold sm:text-5xl">
              QUESTION {questionNumber} / {state.total}
            </p>
            <div className="mt-6">
              <QuizCircleTimer value={seconds} progress={timerProgress} urgent={seconds <= 5} />
            </div>
            <div className="mt-6 rounded-2xl border border-[#E5E2D8] bg-[#FFFDF8] px-4 py-5 sm:px-6">
              <h2 className="font-heading text-2xl font-semibold leading-snug sm:text-4xl">{prompt}</h2>
            </div>
            <div className="mt-5 rounded-2xl border border-[#E5E2D8] bg-[#F6F4EE] px-4 py-4 text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-muted">Answered</p>
              <p className="font-heading mt-1 text-3xl font-semibold sm:text-4xl">
                {state.answered} / {state.players.length}
              </p>
            </div>
            <HostPrimaryButton label="Close Question" onClick={() => void action("close")} />
          </div>
        ) : null}

        {state.status === "waiting_reveal" ? (
          <div className="mt-6 rounded-[1.75rem] border border-[#E5E2D8] bg-white p-5 shadow-sm sm:p-8">
            <p className="font-heading text-3xl font-semibold sm:text-5xl">
              QUESTION {questionNumber} / {state.total}
            </p>
            <p className="font-heading mt-6 text-2xl font-semibold sm:text-3xl">Question closed</p>
            <div className="mt-5 rounded-2xl border border-[#E5E2D8] bg-[#F6F4EE] px-4 py-4 text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-muted">Answered</p>
              <p className="font-heading mt-1 text-3xl font-semibold">
                {state.answered} / {state.players.length}
              </p>
            </div>
            <HostPrimaryButton label="Reveal Answer" onClick={() => void action("reveal")} />
          </div>
        ) : null}

        {state.status === "reveal" ? (
          <div className="mt-6 rounded-[1.75rem] border border-[#E5E2D8] bg-white p-5 shadow-sm sm:p-8">
            <p className="font-heading text-3xl font-semibold sm:text-5xl">
              QUESTION {questionNumber} / {state.total}
            </p>
            <div className="mt-5 rounded-2xl border border-[#E5E2D8] bg-[#FFFDF8] px-4 py-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Correct answer</p>
              <p className="mt-1 text-2xl font-semibold sm:text-3xl">{correctText}</p>
              {explanation ? <p className="mt-4 text-base text-muted sm:text-lg">{explanation}</p> : null}
            </div>
            {state.distribution ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {choices.map((choice) => (
                  <div
                    key={choice.id}
                    className={`rounded-2xl border px-4 py-3 shadow-sm ${choice.id === state.correctId ? "border-[#2E6B3F] bg-[#E8F2EA]" : "border-[#E5E2D8] bg-[#F6F4EE]"}`}
                  >
                    <p className="text-sm font-semibold">
                      {choice.id.toUpperCase()}. {choice.text}
                    </p>
                    <p className="font-heading mt-1 text-2xl font-semibold">{state.distribution?.[choice.id] ?? 0}</p>
                  </div>
                ))}
              </div>
            ) : null}
            <p className="mt-5 rounded-2xl border border-[#E5E2D8] bg-[#F6F4EE] px-4 py-3 text-center text-lg">
              ❤️ {state.reactionCounts.love} · 😮 {state.reactionCounts.wow} · 😂 {state.reactionCounts.funny} · 😡 {state.reactionCounts.angry}
            </p>
            <HostPrimaryButton label="Show Leaderboard" onClick={() => void action("show-leaderboard")} />
          </div>
        ) : null}

        {state.status === "leaderboard" ? (
          <div className="mt-6 rounded-[1.75rem] border border-[#E5E2D8] bg-white p-5 shadow-sm sm:p-8">
            <h2 className="font-heading text-3xl font-semibold sm:text-5xl">Leaderboard</h2>
            <ol className="mt-6 space-y-3">
              {state.players.map((player, index) => (
                <li
                  key={player.id}
                  className={`flex items-center justify-between border px-4 py-3 shadow-sm ${index < 3 ? "rounded-2xl border-[#2E6B3F]/25 bg-[#E8F2EA]" : "rounded-xl border-[#E5E2D8] bg-[#F6F4EE]"} ${index === 0 ? "py-5 text-2xl sm:text-3xl" : "text-xl sm:text-2xl"}`}
                >
                  <span className="flex items-center gap-3">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-full font-heading text-sm font-semibold ${index === 0 ? "bg-[#2E6B3F] text-white" : "bg-white"}`}>
                      {index + 1}
                    </span>
                    {player.name}
                  </span>
                  <span className="font-heading font-semibold">{player.score}</span>
                </li>
              ))}
            </ol>
            <HostPrimaryButton label={lastQuestion ? "Show Final Results" : "Next Question"} onClick={() => void action("next")} />
          </div>
        ) : null}

        {state.finished ? (
          <div className="mt-6 rounded-[1.75rem] border border-[#E5E2D8] bg-white p-5 shadow-sm sm:p-8">
            <h2 className="font-heading text-3xl font-semibold">Final results</h2>
            <ol className="mt-6 grid gap-3 sm:grid-cols-3">
              {state.players.slice(0, 3).map((player, index) => (
                <li key={`podium-${player.id}`} className="rounded-2xl border border-[#E5E2D8] bg-[#E8F2EA] px-4 py-6 text-center">
                  <p className="text-sm uppercase tracking-wide text-muted">{index === 0 ? "1st" : index === 1 ? "2nd" : "3rd"}</p>
                  <p className="font-heading mt-2 text-2xl font-semibold">{player.name}</p>
                  <p className="mt-1 text-lg">{player.score}</p>
                </li>
              ))}
            </ol>
            <h3 className="mt-8 font-heading text-xl font-semibold">Full ranking</h3>
            <ol className="mt-4 space-y-2">
              {state.players.map((player, index) => (
                <li key={player.id} className="flex justify-between rounded-xl border border-[#E5E2D8] bg-[#F6F4EE] px-3 py-2">
                  <span>
                    {index + 1}. {player.name}
                  </span>
                  <span>{player.score}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </main>
  );
}
