"use client";

import { useCallback, useEffect, useState, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { CONTENT_CONTAINER } from "@/lib/layout";
import type { PublicQuestion } from "@/lib/quiz/public-state";
import { type QuizReaction } from "@/lib/quiz/pin";
import { isQuestionOpen } from "@/lib/quiz/game-status";
import { useQuizCountdown } from "@/lib/quiz/useQuizCountdown";
import { ReactionBurst, type ReactionBurstEvent } from "@/components/quiz/ReactionBurst";
import { QuizCircleTimer, QuizStatusChip } from "@/components/quiz/QuizVisuals";

type State = {
  gameId: string;
  status: string;
  question: PublicQuestion | null;
  endsAt: string | null;
  you: {
    id: string;
    name: string;
    score: number;
    rank: number | null;
    answered: boolean;
    choiceId: "a" | "b" | "c" | "d" | null;
    lastPoints: number | null;
    lastCorrect: boolean | null;
    reaction: QuizReaction | null;
  };
  reactionCounts: Record<QuizReaction, number>;
  leaderboard: { rank: number; score: number; top: Array<{ name: string; score: number }> } | null;
  finished: boolean;
};

const REACTION_UI: Array<{ id: QuizReaction; emoji: string; label: string }> = [
  { id: "love", emoji: "❤️", label: "Love it" },
  { id: "wow", emoji: "😮", label: "Wow" },
  { id: "funny", emoji: "😂", label: "Funny" },
  { id: "angry", emoji: "😡", label: "No way!" },
];

const ANSWER_LOOK: Record<"a" | "b" | "c" | "d", { wrap: string; badge: string }> = {
  a: { wrap: "rounded-2xl", badge: "rounded-md" },
  b: { wrap: "rounded-[1.85rem]", badge: "rounded-full" },
  c: { wrap: "rounded-3xl", badge: "rounded-lg" },
  d: { wrap: "rounded-[1.15rem]", badge: "rotate-45 rounded-[4px]" },
};

function token(): string {
  return window.localStorage.getItem("swmp_quiz_player") ?? "";
}

function PlayShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-[100dvh] bg-[#F6F4EE] px-4 py-5">
      <div className={`${CONTENT_CONTAINER} mx-auto max-w-lg`}>{children}</div>
    </main>
  );
}

function LeaderboardList({
  rows,
  highlightName,
}: {
  rows: Array<{ name: string; score: number }>;
  highlightName?: string;
}) {
  return (
    <ol className="space-y-2">
      {rows.map((player, index) => {
        const mine = highlightName ? player.name === highlightName : false;
        const podium = index < 3;
        return (
          <li
            key={`${player.name}-${index}`}
            className={`flex items-center justify-between border px-4 py-3 shadow-sm ${
              podium ? "rounded-2xl" : "rounded-xl"
            } ${mine ? "border-[#2E6B3F] bg-[#E8F2EA]" : "border-[#E5E2D8] bg-white"} ${index === 0 ? "py-4" : ""}`}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center font-heading text-sm font-semibold ${index === 0 ? "rounded-full bg-[#2E6B3F] text-white" : "rounded-full bg-[#F3F0E8] text-foreground"}`}>
                {index + 1}
              </span>
              <span className="truncate font-semibold">{player.name}</span>
            </span>
            <span className="ml-3 shrink-0 font-heading font-semibold">{player.score}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function QuizPlayClient() {
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [burst, setBurst] = useState<ReactionBurstEvent | null>(null);
  const [pulse, setPulse] = useState<QuizReaction | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/quiz/state?token=${encodeURIComponent(token())}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Could not load game");
      return;
    }
    setError(null);
    setState(json);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!state?.gameId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`quiz-play:${state.gameId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_quiz_games", filter: `id=eq.${state.gameId}` }, () => {
        void refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "live_quiz_roster", filter: `game_id=eq.${state.gameId}` }, () => {
        void refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "live_quiz_reaction_counts", filter: `game_id=eq.${state.gameId}` }, () => {
        void refresh();
      })
      .subscribe();
    const timer = window.setInterval(() => void refresh(), 3000);
    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [state?.gameId, refresh]);

  const remainingMs = useQuizCountdown(state?.endsAt ?? null);
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const locked = Boolean(picked || state?.you.answered || state?.you.choiceId);

  useEffect(() => {
    setPicked(state?.you.choiceId ?? null);
  }, [state?.you.choiceId, state?.question?.index]);

  useEffect(() => {
    if (isQuestionOpen(state?.status ?? "") && remainingMs <= 0) void refresh();
  }, [remainingMs, state?.status, refresh]);

  async function answer(choiceId: "a" | "b" | "c" | "d") {
    if (locked || !isQuestionOpen(state?.status ?? "")) return;
    setPicked(choiceId);
    const res = await fetch("/api/quiz/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token(), choiceId }),
    });
    if (!res.ok) setPicked(null);
    void refresh();
  }

  async function react(reaction: QuizReaction, event: MouseEvent<HTMLButtonElement>) {
    if (state?.status !== "reveal" || state.you.reaction) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rect = event.currentTarget.getBoundingClientRect();
    if (reduced) setPulse(reaction);
    else {
      setBurst({
        id: Date.now(),
        emoji: REACTION_UI.find((row) => row.id === reaction)?.emoji ?? "❤️",
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    }
    await fetch("/api/quiz/react", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token(), reaction }),
    });
    void refresh();
  }

  if (error && !state) {
    return (
      <PlayShell>
        <div className="rounded-3xl border border-[#E5E2D8] bg-white p-8 text-center shadow-sm">
          <p>{error}</p>
          <Link href="/quiz" className="mt-4 inline-block font-semibold text-[#2E6B3F]">
            Back to PIN
          </Link>
        </div>
      </PlayShell>
    );
  }

  if (!state) {
    return (
      <PlayShell>
        <p className="py-16 text-center text-muted">Joining…</p>
      </PlayShell>
    );
  }

  if (state.finished && state.leaderboard) {
    return (
      <PlayShell>
        <div className="rounded-3xl border border-[#E5E2D8] bg-white p-6 shadow-sm">
          <QuizStatusChip>Finished</QuizStatusChip>
          <h1 className="font-heading mt-4 text-center text-3xl font-semibold">Final scores</h1>
          <p className="mt-3 text-center text-lg">
            You placed #{state.leaderboard.rank} with {state.leaderboard.score} points
          </p>
          <div className="mt-6">
            <LeaderboardList rows={state.leaderboard.top} highlightName={state.you.name} />
          </div>
          <p className="mt-8 text-center text-lg font-semibold">You really know your pets!</p>
          <p className="mt-2 text-center text-muted">Now meet people who love them as much as you do.</p>
          <div className="mt-6 grid gap-3">
            <Link href="/find-care" className="btn-interactive min-h-[52px] rounded-2xl bg-[#2E6B3F] px-4 py-3 text-center font-semibold text-white shadow-sm">
              I have a pet
            </Link>
            <Link href="/find-pets" className="btn-interactive min-h-[52px] rounded-2xl border-2 border-[#2E6B3F] px-4 py-3 text-center font-semibold text-[#2E6B3F]">
              I want to care for a pet
            </Link>
          </div>
        </div>
      </PlayShell>
    );
  }

  if (state.status === "lobby") {
    return (
      <PlayShell>
        <div className="rounded-3xl border border-[#E5E2D8] bg-white px-6 py-12 text-center shadow-sm">
          <QuizStatusChip>Lobby</QuizStatusChip>
          <h1 className="font-heading mt-5 text-3xl font-semibold">You’re in, {state.you.name}</h1>
          <p className="mt-3 text-muted">Waiting for the host to start…</p>
        </div>
      </PlayShell>
    );
  }

  if (state.status === "waiting_reveal") {
    return (
      <PlayShell>
        <div className="rounded-3xl border border-[#E5E2D8] bg-white px-6 py-12 text-center shadow-sm">
          <QuizStatusChip>Waiting</QuizStatusChip>
          <h1 className="font-heading mt-5 text-3xl font-semibold">Time's up!</h1>
          <p className="mt-4 text-lg text-muted">Waiting for the host to reveal the answer...</p>
        </div>
      </PlayShell>
    );
  }

  if (state.status === "leaderboard" && state.leaderboard) {
    return (
      <PlayShell>
        <div className="rounded-3xl border border-[#E5E2D8] bg-white p-6 shadow-sm">
          <div className="text-center">
            <QuizStatusChip>Leaderboard</QuizStatusChip>
            <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-muted">Your rank</p>
            <p className="font-heading mt-1 text-5xl font-semibold text-[#2E6B3F]">#{state.leaderboard.rank}</p>
            <p className="mt-2 text-xl">{state.leaderboard.score} points</p>
          </div>
          <p className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Top 5</p>
          <LeaderboardList rows={state.leaderboard.top} highlightName={state.you.name} />
        </div>
      </PlayShell>
    );
  }

  const question = state.question;
  if (!question) {
    return (
      <PlayShell>
        <p className="py-16 text-center text-muted">Waiting for the next question…</p>
      </PlayShell>
    );
  }

  const correctText = question.choices.find((row) => row.id === question.correctId)?.text;
  const selectedText = question.choices.find((row) => row.id === (picked || state.you.choiceId))?.text;
  const questionOpen = isQuestionOpen(state.status);
  const selectedReaction = state.you.reaction;

  return (
    <PlayShell>
      <ReactionBurst burst={burst} />
      <div className="rounded-[1.75rem] border border-[#E5E2D8] bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="font-heading text-sm font-semibold tracking-wide text-[#2E6B3F]">
            QUESTION {question.index} / {question.total}
          </p>
          <QuizStatusChip>{questionOpen ? "Live" : "Reveal"}</QuizStatusChip>
        </div>

        {questionOpen ? (
          <>
            <div className="mt-5">
              <QuizCircleTimer value={seconds} progress={question.timerSeconds ? seconds / question.timerSeconds : 1} urgent={seconds <= 5} />
            </div>
              <div className="mt-5 rounded-2xl border border-[#E5E2D8] bg-[#FFFDF8] px-4 py-5 shadow-sm">
              <h1 className="font-heading text-center text-xl font-semibold leading-snug sm:text-2xl">{question.prompt}</h1>
            </div>
            <div className="mt-5 grid gap-3">
              {question.choices.map((choice) => {
                const look = ANSWER_LOOK[choice.id];
                const active = picked === choice.id;
                return (
                  <button
                    key={choice.id}
                    type="button"
                    disabled={locked}
                    onClick={() => void answer(choice.id)}
                    className={`btn-interactive flex min-h-[64px] items-center gap-3 border px-3 py-3 text-left text-base font-semibold shadow-sm disabled:opacity-70 sm:min-h-[72px] sm:text-lg ${look.wrap} ${
                      active ? "border-[#2E6B3F] bg-[#2E6B3F] text-white" : "border-[#E5E2D8] bg-white text-foreground"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center text-sm font-bold ${look.badge} ${
                        active ? "bg-white/20 text-white" : "bg-[#F3F0E8] text-[#2E6B3F]"
                      } ${choice.id === "d" && !active ? "text-[0.65rem]" : ""}`}
                    >
                      <span className={choice.id === "d" ? "-rotate-45" : undefined}>{choice.id.toUpperCase()}</span>
                    </span>
                    {choice.text}
                  </button>
                );
              })}
            </div>
            {locked ? (
              <div className="mt-5 rounded-2xl bg-[#E8F2EA] px-4 py-4 text-center">
                <p className="text-lg font-semibold text-[#2E6B3F]">✓ Answer submitted</p>
                <p className="mt-1 text-sm text-muted">Waiting for everyone...</p>
              </div>
            ) : null}
          </>
        ) : null}

        {state.status === "reveal" ? (
          <div className="mt-4 text-center">
              <div className="rounded-2xl border border-[#E5E2D8] bg-[#FFFDF8] px-4 py-6 shadow-sm">
              <p className="font-heading text-3xl font-semibold">{state.you.lastCorrect ? "Correct!" : "Not quite"}</p>
              {selectedText ? <p className="mt-3 text-sm text-muted">You answered: {selectedText}</p> : null}
              <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted">Correct answer</p>
              <p className="mt-1 text-xl font-semibold">{correctText}</p>
              {question.explanation ? <p className="mt-4 text-base leading-relaxed text-muted">{question.explanation}</p> : null}
              <p className="font-heading mt-5 text-4xl font-semibold text-[#2E6B3F]">+{state.you.lastPoints ?? 0} points</p>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {REACTION_UI.map((item) => {
                const selected = selectedReaction === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={Boolean(selectedReaction)}
                    onClick={(event) => void react(item.id, event)}
                    className={`min-h-[72px] rounded-2xl border px-3 py-3 text-sm font-semibold shadow-sm disabled:opacity-90 ${
                      selected ? "border-[#2E6B3F] bg-[#2E6B3F] text-white" : "border-[#E5E2D8] bg-white"
                    } ${pulse === item.id ? "quiz-reaction-pulse" : ""}`}
                  >
                    <span className="block text-2xl">{item.emoji}</span>
                    {item.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-base">
              ❤️ {state.reactionCounts.love} · 😮 {state.reactionCounts.wow} · 😂 {state.reactionCounts.funny} · 😡 {state.reactionCounts.angry}
            </p>
          </div>
        ) : null}
      </div>
    </PlayShell>
  );
}
