"use client";

import { useCallback, useEffect, useState, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { CONTENT_CONTAINER } from "@/lib/layout";
import type { PublicQuestion } from "@/lib/quiz/public-state";
import { type QuizReaction } from "@/lib/quiz/pin";
import { isQuestionOpen } from "@/lib/quiz/game-status";
import { parseQuizLocale, persistQuizLocale, readStoredQuizLocale, type QuizLocale } from "@/lib/quiz/locale";
import { playerCopy } from "@/lib/quiz/player-copy";
import { QUIZ_QUESTION_SECONDS } from "@/lib/quiz/timer";
import { useQuizCountdown } from "@/lib/quiz/useQuizCountdown";
import { ReactionBurst, type ReactionBurstEvent } from "@/components/quiz/ReactionBurst";
import { QuizQuestionImage } from "@/components/quiz/QuizQuestionImage";
import { QuizCircleTimer, QuizStatusChip } from "@/components/quiz/QuizVisuals";
import { QuizStage } from "@/components/quiz/QuizStage";

type State = {
  gameId: string;
  status: string;
  locale?: QuizLocale;
  serverNow?: string;
  question: PublicQuestion | null;
  endsAt: string | null;
  currentQuestionIndex: number;
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

const REACTION_EMOJI: Record<QuizReaction, string> = {
  love: "❤️",
  wow: "😮",
  funny: "😂",
  angry: "😡",
};

const ANSWER_LOOK: Record<"a" | "b" | "c" | "d", { wrap: string; badge: string }> = {
  a: { wrap: "rounded-2xl", badge: "rounded-md" },
  b: { wrap: "rounded-[1.85rem]", badge: "rounded-full" },
  c: { wrap: "rounded-3xl", badge: "rounded-lg" },
  d: { wrap: "rounded-[1.15rem]", badge: "rotate-45 rounded-[4px]" },
};

function token(): string {
  return window.localStorage.getItem("swmp_quiz_player") ?? "";
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

function PlayFrame({
  questionLabel,
  copy,
  onExit,
  leaveOpen,
  onCancelLeave,
  onConfirmLeave,
  children,
}: {
  questionLabel: string | null;
  copy: ReturnType<typeof playerCopy>;
  onExit: () => void;
  leaveOpen: boolean;
  onCancelLeave: () => void;
  onConfirmLeave: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[#F6F4EE] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] md:h-auto md:max-h-none md:min-h-[calc(100dvh-0px)] md:overflow-visible md:px-4 md:py-8">
      <div className={`${CONTENT_CONTAINER} mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col`}>
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onExit}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-full border border-[#E5E2D8] bg-white px-3 text-sm font-semibold text-foreground shadow-sm"
            aria-label={copy.exit}
          >
            <span aria-hidden>×</span> {copy.exit}
          </button>
          {questionLabel ? (
            <p className="font-heading text-sm font-semibold tracking-wide text-[#2E6B3F]">{questionLabel}</p>
          ) : (
            <span />
          )}
        </div>
        {children}
      </div>
      {leaveOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-sm rounded-3xl border border-[#E5E2D8] bg-white p-6 text-center shadow-lg">
            <p className="font-heading text-xl font-semibold">{copy.leaveQuiz}</p>
            <p className="mt-2 text-sm text-muted">{copy.leaveHint}</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={onCancelLeave} className="min-h-[48px] rounded-2xl border border-[#E5E2D8] font-semibold">
                {copy.cancel}
              </button>
              <button type="button" onClick={onConfirmLeave} className="min-h-[48px] rounded-2xl bg-[#2E6B3F] font-semibold text-white">
                {copy.leave}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function QuizPlayClient() {
  const router = useRouter();
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [burst, setBurst] = useState<ReactionBurstEvent | null>(null);
  const [pulse, setPulse] = useState<QuizReaction | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [locale, setLocale] = useState<QuizLocale>(() => readStoredQuizLocale());
  const t = playerCopy(locale);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/quiz/state?token=${encodeURIComponent(token())}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Could not load game");
      return;
    }
    setError(null);
    setState(json);
    if (json.locale) {
      const next = parseQuizLocale(json.locale);
      persistQuizLocale(next);
      setLocale(next);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    window.history.pushState({ quizPlay: true }, "");
    const onPop = () => {
      setLeaveOpen(true);
      window.history.pushState({ quizPlay: true }, "");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

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

  const seconds = useQuizCountdown(state?.endsAt ?? null, state?.serverNow ?? null);
  const locked = Boolean(picked || state?.you.answered || state?.you.choiceId);

  useEffect(() => {
    setPicked(state?.you.choiceId ?? null);
  }, [state?.you.choiceId, state?.question?.index]);

  useEffect(() => {
    if (isQuestionOpen(state?.status ?? "") && seconds <= 0) void refresh();
  }, [seconds, state?.status, refresh]);

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
        emoji: REACTION_EMOJI[reaction],
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

  function leaveGame() {
    window.localStorage.removeItem("swmp_quiz_player");
    router.push("/");
  }

  const question = state?.question ?? null;
  const questionIndex = question?.index ?? (typeof state?.currentQuestionIndex === "number" ? state.currentQuestionIndex + 1 : null);
  const questionTotal = question?.total ?? 0;
  const questionLabel = questionIndex ? t.questionOf(questionIndex, questionTotal) : null;
  const awaitingReveal = Boolean(state && locked && isQuestionOpen(state.status));
  const stageKey = state
    ? `${state.status}:${questionIndex ?? "x"}:${state.finished ? "end" : "live"}:${awaitingReveal ? "in" : "play"}`
    : "loading";

  let body: ReactNode;
  if (error && !state) {
    body = (
      <div className="rounded-3xl border border-[#E5E2D8] bg-white p-8 text-center shadow-sm">
        <p>{error}</p>
        <Link href="/quiz" className="mt-4 inline-block font-semibold text-[#2E6B3F]">
          {t.backToPin}
        </Link>
      </div>
    );
  } else if (!state) {
    body = <p className="py-16 text-center text-muted">{t.joining}</p>;
  } else if (state.finished && state.leaderboard) {
    body = (
      <div className="rounded-3xl border border-[#E5E2D8] bg-white p-6 shadow-sm">
        <QuizStatusChip>{t.finished}</QuizStatusChip>
        <h1 className="font-heading mt-4 text-center text-3xl font-semibold">{t.finalScores}</h1>
        <p className="mt-3 text-center text-lg">
          {t.youPlaced(state.leaderboard.rank, state.leaderboard.score)}
        </p>
        <div className="mt-6">
          <LeaderboardList rows={state.leaderboard.top} highlightName={state.you.name} />
        </div>
        <p className="mt-8 text-center text-lg font-semibold">{t.knowPets}</p>
        <p className="mt-2 text-center text-muted">{t.meetPeople}</p>
        <div className="mt-6 grid gap-3">
          <Link href="/find-care" className="btn-interactive min-h-[52px] rounded-2xl bg-[#2E6B3F] px-4 py-3 text-center font-semibold text-white shadow-sm">
            {t.iHaveAPet}
          </Link>
          <Link href="/find-pets" className="btn-interactive min-h-[52px] rounded-2xl border-2 border-[#2E6B3F] px-4 py-3 text-center font-semibold text-[#2E6B3F]">
            {t.iWantToCare}
          </Link>
        </div>
      </div>
    );
  } else if (state.status === "lobby") {
    body = (
      <div className="rounded-3xl border border-[#E5E2D8] bg-white px-6 py-12 text-center shadow-sm">
        <QuizStatusChip>{t.lobby}</QuizStatusChip>
        <h1 className="font-heading mt-5 text-3xl font-semibold">{t.youreIn(state.you.name)}</h1>
        <p className="mt-3 text-muted">{t.waitingStart}</p>
      </div>
    );
  } else if (state.status === "waiting_reveal") {
    body = (
      <div className="flex h-full items-center justify-center">
        <div className="w-full rounded-3xl border border-[#E5E2D8] bg-white px-6 py-12 text-center shadow-sm">
          <h1 className="font-heading text-3xl font-semibold">{t.timesUp}</h1>
          <p className="mt-4 text-lg text-muted">{t.waitingReveal}</p>
        </div>
      </div>
    );
  } else if (state.status === "leaderboard" && state.leaderboard) {
    body = (
      <div className="rounded-3xl border border-[#E5E2D8] bg-white p-6 shadow-sm">
        <div className="text-center">
          <QuizStatusChip>{t.leaderboard}</QuizStatusChip>
          <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-muted">{t.yourRank}</p>
          <p className="font-heading mt-1 text-5xl font-semibold text-[#2E6B3F]">#{state.leaderboard.rank}</p>
          <p className="mt-2 text-xl">{state.leaderboard.score} {t.points}</p>
        </div>
        <p className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t.top5}</p>
        <LeaderboardList rows={state.leaderboard.top} highlightName={state.you.name} />
      </div>
    );
  } else if (!question) {
    body = <p className="py-16 text-center text-muted">{t.waitingNext}</p>;
  } else {
    const correctText = question.choices.find((row) => row.id === question.correctId)?.text;
    const selectedText = question.choices.find((row) => row.id === (picked || state.you.choiceId))?.text;
    const questionOpen = isQuestionOpen(state.status);
    const selectedReaction = state.you.reaction;
    body = (
      <div className="flex h-full min-h-0 flex-col rounded-2xl border border-[#E5E2D8] bg-white p-3 shadow-sm md:p-4">
        {questionOpen && locked ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full rounded-xl bg-[#E8F2EA] px-4 py-8 text-center">
              <p className="font-heading text-xl font-semibold text-[#2E6B3F]">✓ {t.answerSubmitted}</p>
              <p className="mt-2 text-base text-muted">{t.waitingEveryone}</p>
            </div>
          </div>
        ) : null}
        {questionOpen && !locked ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0">
              <QuizCircleTimer value={seconds} progress={seconds / QUIZ_QUESTION_SECONDS} urgent={seconds <= 5} />
            </div>
            <div className="mt-2 shrink-0 px-1">
              <h1 className="font-heading text-center text-base font-semibold leading-snug sm:text-xl">{question.prompt}</h1>
              <div className="mt-2">
                <QuizQuestionImage src={question.imageUrl} alt="" compact />
              </div>
            </div>
            <div className="mt-2 grid min-h-0 flex-1 content-start gap-1.5">
              {question.choices.map((choice) => {
                const look = ANSWER_LOOK[choice.id];
                const active = picked === choice.id;
                return (
                  <button
                    key={choice.id}
                    type="button"
                    disabled={locked}
                    onClick={() => void answer(choice.id)}
                    className={`btn-interactive flex min-h-[44px] items-center gap-2.5 border px-3 py-2 text-left text-sm font-semibold shadow-sm disabled:opacity-70 sm:min-h-[48px] sm:text-base ${look.wrap} ${
                      active ? "border-[#2E6B3F] bg-[#2E6B3F] text-white" : "border-[#E5E2D8] bg-white text-foreground"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center text-xs font-bold ${look.badge} ${
                        active ? "bg-white/20 text-white" : "bg-[#F3F0E8] text-[#2E6B3F]"
                      }`}
                    >
                      <span className={choice.id === "d" ? "-rotate-45" : undefined}>{choice.id.toUpperCase()}</span>
                    </span>
                    {choice.text}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {state.status === "reveal" ? (
          <div className="text-center">
            <div className="rounded-2xl border border-[#E5E2D8] bg-[#FFFDF8] px-4 py-6 shadow-sm">
              <p className="font-heading text-3xl font-semibold">{state.you.lastCorrect ? t.correct : t.notQuite}</p>
              {selectedText ? <p className="mt-3 text-sm text-muted">{t.youAnswered} {selectedText}</p> : null}
              <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted">{t.correctAnswer}</p>
              <p className="mt-1 text-xl font-semibold">{correctText}</p>
              {question.explanation ? <p className="mt-4 text-base leading-relaxed text-muted">{question.explanation}</p> : null}
              <p className="font-heading mt-5 text-4xl font-semibold text-[#2E6B3F]">
                {t.plusPoints(state.you.lastCorrect ? 200 : 0)}
              </p>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {(Object.keys(REACTION_EMOJI) as QuizReaction[]).map((id) => {
                const selected = selectedReaction === id;
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={Boolean(selectedReaction)}
                    onClick={(event) => void react(id, event)}
                    className={`min-h-[72px] rounded-2xl border px-3 py-3 text-sm font-semibold shadow-sm disabled:opacity-90 ${
                      selected ? "border-[#2E6B3F] bg-[#2E6B3F] text-white" : "border-[#E5E2D8] bg-white"
                    } ${pulse === id ? "quiz-reaction-pulse" : ""}`}
                  >
                    <span className="block text-2xl">{REACTION_EMOJI[id]}</span>
                    {t.reactions[id]}
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
    );
  }

  return (
    <PlayFrame
      questionLabel={questionLabel}
      copy={t}
      onExit={() => setLeaveOpen(true)}
      leaveOpen={leaveOpen}
      onCancelLeave={() => setLeaveOpen(false)}
      onConfirmLeave={leaveGame}
    >
      <ReactionBurst burst={burst} />
      <QuizStage stageKey={stageKey}>{body}</QuizStage>
    </PlayFrame>
  );
}
