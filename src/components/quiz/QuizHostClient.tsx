"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase";
import { formatDisplayPin, hostPinStorageKey, QUIZ_PUBLIC_JOIN_HOST, type QuizReaction } from "@/lib/quiz/pin";
import { isQuestionOpen } from "@/lib/quiz/game-status";
import type { QuizLocale } from "@/lib/quiz/locale";
import { answerCountLabel, answerPercentage, leaderboardDistributionRows, totalAnswers } from "@/lib/quiz/percentages";
import { QUIZ_QUESTION_SECONDS } from "@/lib/quiz/timer";
import { useQuizCountdown } from "@/lib/quiz/useQuizCountdown";
import { QuizQuestionImage } from "@/components/quiz/QuizQuestionImage";
import { QuizStage } from "@/components/quiz/QuizStage";

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
  imageUrl?: string | null;
  distribution: { a: number; b: number; c: number; d: number } | null;
  reactionCounts: Record<QuizReaction, number>;
  players: Array<{ id: string; name: string; score: number }>;
  top5: Array<{ id: string; name: string; score: number }>;
  finished: boolean;
};

const JOIN_URL = `https://${QUIZ_PUBLIC_JOIN_HOST}`;
const QR_SRC = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(JOIN_URL)}`;
const PODIUM = ["🥇", "🥈", "🥉"] as const;

function HostPrimaryButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="mt-auto w-full shrink-0 pt-3 md:pt-4">
      <button
        type="button"
        onClick={onClick}
        className="btn-interactive mx-auto flex min-h-11 w-full max-w-[320px] items-center justify-center rounded-xl bg-[#2E6B3F] px-5 text-sm font-semibold text-white shadow-sm md:min-h-12 md:text-base"
      >
        {label}
      </button>
    </div>
  );
}

function Slide({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-0.5 md:px-2 md:pb-3 md:pt-1">
      {children}
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
    <Slide>
      <p className="text-center text-[clamp(0.72rem,1.1vw,0.9rem)] font-semibold uppercase tracking-[0.22em] text-[#2E6B3F]">
        StayWithMyPet Live Quiz
      </p>
      <p className="mt-3 text-center text-[clamp(1.35rem,3vw,2.25rem)] font-semibold uppercase tracking-[0.14em] text-foreground">
        JOIN THE QUIZ
      </p>
      <p className="mt-2 text-center text-[clamp(1rem,1.8vw,1.35rem)] font-semibold text-[#2E6B3F]">{QUIZ_PUBLIC_JOIN_HOST}</p>
      <div className="mx-auto mt-5 flex min-h-0 w-full max-w-[920px] flex-1 items-center justify-center gap-6 md:mt-8 md:gap-12">
        <div className="min-w-0 text-center">
          <p className="text-[clamp(0.7rem,1vw,0.85rem)] font-semibold uppercase tracking-[0.22em] text-muted">GAME PIN</p>
          <p className="font-heading mt-2 break-all text-[clamp(2.6rem,8vw,5.5rem)] font-semibold leading-none tracking-[0.12em] text-[#2E6B3F]">
            {formatDisplayPin(pin)}
          </p>
          <button
            type="button"
            onClick={onCopy}
            className="btn-interactive mt-4 rounded-xl border border-[#2E6B3F] px-4 py-2 text-sm font-semibold text-[#2E6B3F] md:mt-5"
          >
            {copied ? "Copied" : "Copy PIN"}
          </button>
        </div>
        <img
          src={QR_SRC}
          alt="QR code for staywithmypet.ee/quiz"
          width={220}
          height={220}
          className="hidden h-[clamp(8.5rem,16vw,13.5rem)] w-[clamp(8.5rem,16vw,13.5rem)] rounded-2xl border border-[#E5E2D8] bg-white p-2 shadow-sm md:block"
        />
      </div>
      <p className="mt-4 text-center text-[clamp(1rem,1.6vw,1.25rem)]">Players joined: {players}</p>
      {showStart && onStart ? <HostPrimaryButton label="Start Quiz" onClick={onStart} /> : null}
    </Slide>
  );
}

function HostPreviewToggle({ locale, onChange }: { locale: QuizLocale; onChange: (next: QuizLocale) => void }) {
  return (
    <div className="absolute right-3 top-3 z-10 inline-flex rounded-full border border-[#E5E2D8] bg-white/90 p-0.5 text-[10px] font-semibold md:right-5 md:top-4">
      <button
        type="button"
        onClick={() => onChange("en")}
        className={`rounded-full px-2.5 py-1 ${locale === "en" ? "bg-[#2E6B3F] text-white" : "text-muted"}`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => onChange("et")}
        className={`rounded-full px-2.5 py-1 ${locale === "et" ? "bg-[#2E6B3F] text-white" : "text-muted"}`}
      >
        ET
      </button>
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
      <div className="flex h-[100dvh] w-[100vw] items-center justify-center bg-[#F6F4EE] px-6">
        <p className="max-w-xl text-center text-red-700">
          {error ?? "This live game has no PIN. Go back to Admin → Quiz and click START LIVE GAME."}
        </p>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="flex h-[100dvh] w-[100vw] flex-col bg-[#F6F4EE]">
        <div className="mx-auto flex h-full w-full max-w-[1200px] flex-col">
          {visiblePin ? (
            <HostPinPanel pin={visiblePin} players={0} copied={copied} onCopy={() => void copyPin()} />
          ) : (
            <p className="m-auto text-center">{error ?? "Loading host screen…"}</p>
          )}
        </div>
      </div>
    );
  }

  const questionNumber = state.currentIndex + 1;
  const lastQuestion = questionNumber >= state.total;
  const prompt = previewLocale === "et" ? state.promptEt || state.promptEn || state.prompt : state.promptEn || state.prompt;
  const choices = previewLocale === "et" ? state.choicesEt || state.choicesEn || state.choices : state.choicesEn || state.choices;
  const explanation = previewLocale === "et" ? state.explanationEt || state.explanationEn || state.explanation : state.explanationEn || state.explanation;
  const correctText = choices.find((row) => row.id === state.correctId)?.text;
  const questionOpen = isQuestionOpen(state.status);
  const board = (state.top5.length ? state.top5 : state.players).slice(0, 5);
  const stageKey = `${state.status}:${state.currentIndex}`;
  const playerCount = state.players.length;

  let slide: ReactNode = null;

  if (state.status === "lobby") {
    slide = (
      <HostPinPanel
        pin={visiblePin}
        players={playerCount}
        copied={copied}
        onCopy={() => void copyPin()}
        showStart
        onStart={() => void action("open")}
      />
    );
  } else if (questionOpen) {
    slide = (
      <Slide>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[clamp(0.62rem,0.9vw,0.75rem)] font-semibold uppercase tracking-[0.18em] text-[#2E6B3F]">
              StayWithMyPet Live Quiz
            </p>
            <p className="mt-0.5 text-[clamp(0.85rem,1.3vw,1rem)] font-semibold text-muted">
              Question {questionNumber} / {state.total}
            </p>
          </div>
          <p
            className={`font-heading text-[clamp(1.6rem,3vw,2.25rem)] font-semibold leading-none ${seconds <= 5 ? "text-[#C62828]" : "text-[#2E6B3F]"}`}
          >
            {Math.min(seconds, QUIZ_QUESTION_SECONDS)}
          </p>
        </div>
        <div className="mx-auto mt-2 flex min-h-0 w-full max-w-[920px] flex-col items-center gap-2 md:mt-3 md:flex-row md:items-center md:justify-center md:gap-4">
          <h2 className="font-heading min-w-0 flex-1 text-center text-[clamp(1.35rem,2.4vw,2.25rem)] font-semibold leading-snug">
            {prompt}
          </h2>
          <QuizQuestionImage src={state.imageUrl} alt="" compact />
        </div>
        <div className="mx-auto mt-2 grid w-full max-w-[920px] flex-1 grid-cols-1 content-center gap-1.5 sm:grid-cols-2 md:mt-3 md:gap-2">
          {choices.map((choice) => (
            <div key={choice.id} className="rounded-xl border border-[#E5E2D8] bg-white px-3 py-2 shadow-sm">
              <p className="text-[clamp(0.9rem,1.2vw,1.1rem)] font-semibold">
                <span className="mr-2 text-[#2E6B3F]">{choice.id.toUpperCase()}.</span>
                {choice.text}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-center text-[clamp(0.8rem,1.1vw,0.95rem)] text-muted">
          Answered {state.answered} / {playerCount}
        </p>
        <HostPrimaryButton label="Close Question" onClick={() => void action("close")} />
      </Slide>
    );
  } else if (state.status === "waiting_reveal") {
    slide = (
      <Slide>
        <p className="text-center text-[clamp(0.62rem,0.9vw,0.75rem)] font-semibold uppercase tracking-[0.18em] text-[#2E6B3F]">
          StayWithMyPet Live Quiz
        </p>
        <p className="mt-1 text-center text-[clamp(0.85rem,1.3vw,1rem)] font-semibold text-muted">
          Question {questionNumber} / {state.total}
        </p>
        <div className="m-auto max-w-xl text-center">
          <p className="font-heading text-[clamp(1.6rem,3vw,2.25rem)] font-semibold">Question closed</p>
          <p className="mt-2 text-[clamp(1rem,1.6vw,1.25rem)]">
            {state.answered} / {playerCount} answered
          </p>
          <p className="mt-2 text-[clamp(0.9rem,1.3vw,1.1rem)] text-muted">Waiting to reveal the answer</p>
        </div>
        <HostPrimaryButton label="Reveal Answer" onClick={() => void action("reveal")} />
      </Slide>
    );
  } else if (state.status === "reveal") {
    const answeredTotal = state.distribution ? totalAnswers(state.distribution) : 0;
    slide = (
      <Slide>
        <p className="text-center text-[clamp(0.85rem,1.3vw,1rem)] font-semibold text-muted">
          Question {questionNumber} / {state.total}
        </p>
        <p className="mt-1 text-center text-[clamp(0.62rem,0.9vw,0.75rem)] font-semibold uppercase tracking-[0.16em] text-muted">
          Correct answer
        </p>
        <p className="font-heading mx-auto mt-1 max-w-[36rem] rounded-xl border border-[#2E6B3F] bg-[#E8F2EA] px-4 py-2 text-center text-[clamp(1.15rem,2vw,1.6rem)] font-semibold">
          {correctText}
        </p>
        {explanation ? <p className="mx-auto mt-1.5 max-w-[40rem] text-center text-[clamp(0.85rem,1.2vw,1rem)] text-muted">{explanation}</p> : null}
        {state.distribution ? (
          <div className="mx-auto mt-3 grid w-full max-w-[920px] grid-cols-2 gap-1.5 md:gap-2">
            {choices.map((choice) => {
              const count = state.distribution?.[choice.id] ?? 0;
              const pct = answerPercentage(count, answeredTotal);
              const winner = choice.id === state.correctId;
              return (
                <div
                  key={choice.id}
                  className={`overflow-hidden rounded-xl border px-3 py-1.5 ${winner ? "border-[#2E6B3F] bg-[#E8F2EA]" : "border-[#E5E2D8] bg-white"}`}
                >
                  <p className="truncate text-[clamp(0.78rem,1vw,0.9rem)] font-semibold">
                    {choice.id.toUpperCase()}. {choice.text}
                  </p>
                  <p className="mt-0.5 flex items-center justify-between text-[clamp(0.72rem,0.95vw,0.85rem)] text-muted">
                    <span>{answerCountLabel(count)}</span>
                    <span className="font-semibold text-foreground">{pct}%</span>
                  </p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#E8E4DA]">
                    <div className={`h-full rounded-full ${winner ? "bg-[#2E6B3F]" : "bg-[#A3B8A8]"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
        <p className="mt-2 text-center text-[clamp(0.85rem,1.2vw,1rem)]">
          ❤️ {state.reactionCounts.love} &nbsp; 😮 {state.reactionCounts.wow} &nbsp; 😂 {state.reactionCounts.funny} &nbsp; 😡{" "}
          {state.reactionCounts.angry}
        </p>
        <HostPrimaryButton label="Show Leaderboard" onClick={() => void action("show-leaderboard")} />
      </Slide>
    );
  } else if (state.status === "leaderboard" || state.finished) {
    const prevRows = leaderboardDistributionRows(state.distribution, state.correctId);
    slide = (
      <Slide>
        <p className="text-center text-[clamp(0.62rem,0.9vw,0.75rem)] font-semibold uppercase tracking-[0.18em] text-[#2E6B3F]">
          StayWithMyPet Live Quiz
        </p>
        <h2 className="font-heading mt-0.5 text-center text-[clamp(1.35rem,2.4vw,1.85rem)] font-semibold">
          {state.finished ? "Final results" : "Leaderboard"}
        </h2>
        <div className="mx-auto flex min-h-0 w-full max-w-[820px] flex-1 flex-col">
          {!state.finished ? (
            <div className="flex min-h-0 basis-[38%] flex-col justify-center">
              <p className="text-center text-[clamp(0.7rem,0.95vw,0.82rem)] font-semibold text-muted">Previous question results</p>
              <div className="mt-1.5 space-y-1">
                {prevRows.map((row) => (
                  <div
                    key={row.id}
                    className={`grid grid-cols-[1.25rem_minmax(0,1fr)_2.4rem_1.4rem_4.6rem] items-center gap-2 rounded-md px-2 py-0.5 ${
                      row.correct ? "bg-[#E8F2EA]" : ""
                    }`}
                  >
                    <span className={`text-[clamp(0.75rem,1vw,0.9rem)] font-semibold ${row.correct ? "text-[#2E6B3F]" : "text-muted"}`}>
                      {row.id.toUpperCase()}
                    </span>
                    <div className="h-2.5 min-w-0 overflow-hidden rounded-full bg-[#E8E4DA]">
                      <div
                        className={`h-full rounded-full ${row.correct ? "bg-[#2E6B3F]" : "bg-[#A3B8A8]"}`}
                        style={{ width: `${row.percent}%` }}
                      />
                    </div>
                    <span className="text-right text-[clamp(0.72rem,0.95vw,0.85rem)] font-semibold">{row.percent}%</span>
                    <span className="text-right text-[clamp(0.72rem,0.95vw,0.85rem)] text-muted">{row.count}</span>
                    <span className={`text-right text-[10px] font-semibold uppercase tracking-wide ${row.correct ? "text-[#2E6B3F]" : "invisible"}`}>
                      ✓ Correct
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <ol className={`mx-auto w-full max-w-[720px] space-y-1.5 overflow-hidden ${state.finished ? "mt-3 flex-1" : "mt-2 flex min-h-0 basis-[62%] flex-col justify-start"}`}>
            {board.map((player, index) => (
              <li
                key={player.id}
                className={`flex items-center justify-between px-3 ${
                  index < 3
                    ? "rounded-xl border border-[#2E6B3F]/20 bg-[#E8F2EA] py-2 text-[clamp(1rem,1.6vw,1.25rem)] font-semibold"
                    : "rounded-lg border border-[#E5E2D8] bg-white py-1.5 text-[clamp(0.9rem,1.3vw,1.05rem)]"
                }`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="w-8 shrink-0 text-center">{index < 3 ? PODIUM[index] : `${index + 1}.`}</span>
                  <span className="truncate">{player.name}</span>
                </span>
                <span className="font-heading font-semibold">{player.score}</span>
              </li>
            ))}
          </ol>
        </div>
        {!state.finished ? (
          <HostPrimaryButton label={lastQuestion ? "Show Final Results" : "Next Question"} onClick={() => void action("next")} />
        ) : null}
      </Slide>
    );
  }

  return (
    <div className="relative h-[100dvh] w-[100vw] overflow-hidden bg-[#F6F4EE]">
      <HostPreviewToggle locale={previewLocale} onChange={setPreviewLocale} />
      <div className="mx-auto flex h-full w-full max-w-[1200px] flex-col">
        {error ? <p className="px-4 pt-2 text-center text-sm text-red-700">{error}</p> : null}
        <QuizStage stageKey={stageKey}>{slide}</QuizStage>
      </div>
    </div>
  );
}
