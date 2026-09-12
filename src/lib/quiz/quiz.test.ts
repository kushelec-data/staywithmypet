import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SEEDED_QUIZ_QUESTIONS, SEEDED_QUIZ_TITLE, seedQuestionToRow } from "@/lib/quiz/seed";
import { QUIZ_MAX_SCORE, scoreAnswer, scoreCorrectAnswer } from "@/lib/quiz/scoring";
import { displayNamesClash, formatDisplayPin, normalizeDisplayName, normalizeGamePin, parseQuizReaction, pinIsPlayable } from "@/lib/quiz/pin";
import { payloadLeaksAnswer, publicQuestionPayload, stripAnswerKey } from "@/lib/quiz/public-state";
import {
  answerKeyIsPublic,
  hostMayNextQuestion,
  hostMayRevealAnswer,
  hostMayShowLeaderboard,
  playerMayAnswer,
} from "@/lib/quiz/game-status";
import { applyRoundScores, openQuestionUpdate, QUIZ_QUESTION_SECONDS, remainingQuizSeconds, statusAfterTimerExpiry } from "@/lib/quiz/timer";
import { localizeQuestion, parseQuizLocale } from "@/lib/quiz/locale";
import { PLAYER_COPY } from "@/lib/quiz/player-copy";

describe("seeded quiz", () => {
  it("has exactly 20 questions with one correct choice and a source", () => {
    expect(SEEDED_QUIZ_TITLE).toBe("How Well Do You Really Know Dogs & Cats?");
    expect(SEEDED_QUIZ_QUESTIONS).toHaveLength(20);
    expect(SEEDED_QUIZ_QUESTIONS.map((row) => row.sortOrder)).toEqual([...Array(20)].map((_, i) => i + 1));
    for (const question of SEEDED_QUIZ_QUESTIONS) {
      expect(question.choices).toHaveLength(4);
      expect(new Set(question.choices.map((row) => row.id)).size).toBe(4);
      expect(question.choices.some((row) => row.id === question.correctId)).toBe(true);
      expect(question.timerSeconds).toBe(20);
      expect(question.promptEt.length).toBeGreaterThan(10);
      expect(question.explanationEt.length).toBeGreaterThan(20);
      expect(question.choices.every((choice) => choice.textEt.length > 0)).toBe(true);
      expect(question.sourceUrl.startsWith("http")).toBe(true);
      expect(question.explanation.length).toBeGreaterThan(20);
    }
    expect(SEEDED_QUIZ_QUESTIONS.slice(-2).every((row) => row.sourceLabel === "StayWithMyPet")).toBe(true);
  });
});

describe("scoring", () => {
  it("gives exactly 200 for a correct answer", () => {
    expect(scoreAnswer({ correct: true })).toBe(200);
    expect(scoreCorrectAnswer()).toBe(200);
  });

  it("gives 400 after two correct answers", () => {
    const afterOne = applyRoundScores([{ id: "p1", score: 0 }], [{ player_id: "p1", points: 200 }]);
    expect(afterOne).toEqual([{ id: "p1", score: 200 }]);
    expect(applyRoundScores(afterOne, [{ player_id: "p1", points: 200 }])).toEqual([{ id: "p1", score: 400 }]);
  });

  it("gives 0 for a wrong answer", () => {
    expect(scoreAnswer({ correct: false, elapsedMs: 100, limitMs: 15000 })).toBe(0);
    expect(scoreAnswer({ correct: false })).toBe(0);
  });

  it("gives the same score for fast and slow correct answers", () => {
    expect(scoreAnswer({ correct: true, elapsedMs: 100, limitMs: 15000 })).toBe(200);
    expect(scoreAnswer({ correct: true, elapsedMs: 14000, limitMs: 15000 })).toBe(200);
    expect(scoreCorrectAnswer(200, 15000)).toBe(200);
    expect(scoreCorrectAnswer(14000, 15000)).toBe(200);
  });

  it("caps a 20-question quiz at 4000", () => {
    expect(QUIZ_MAX_SCORE).toBe(4000);
    expect(20 * 200).toBe(4000);
    const scoring = readFileSync(join(process.cwd(), "src/lib/quiz/scoring.ts"), "utf8");
    expect(scoring).toContain("QUIZ_POINTS_PER_CORRECT = 200");
    expect(scoring).not.toMatch(/1000\s*-/);
  });
});

describe("join rules", () => {
  it("normalizes PINs and blocks finished games", () => {
    expect(normalizeGamePin("12 34 56")).toBe("123456");
    expect(normalizeGamePin("123")).toBeNull();
    expect(pinIsPlayable("lobby")).toBe(true);
    expect(pinIsPlayable("question_open")).toBe(true);
    expect(pinIsPlayable("waiting_reveal")).toBe(true);
    expect(pinIsPlayable("leaderboard")).toBe(true);
    expect(pinIsPlayable("finished")).toBe(false);
    expect(formatDisplayPin("482731")).toBe("482 731");
    expect(parseQuizReaction("love")).toBe("love");
    expect(parseQuizReaction("nope")).toBeNull();
    expect(normalizeDisplayName("  Alex  ")).toBe("Alex");
    expect(displayNamesClash(["Alex"], "alex")).toBe(true);
    expect(displayNamesClash(["Sam"], "Alex")).toBe(false);
  });
});

describe("hidden answers", () => {
  const question = {
    prompt: "Demo?",
    choices: [
      { id: "a" as const, text: "One" },
      { id: "b" as const, text: "Two" },
      { id: "c" as const, text: "Three" },
      { id: "d" as const, text: "Four" },
    ],
    correctId: "c" as const,
    explanation: "Because science.",
    timerSeconds: 20,
  };

  it("hides the correct answer while the question is open", () => {
    const live = publicQuestionPayload(question, { index: 1, total: 20, revealed: answerKeyIsPublic("question_open") });
    expect(payloadLeaksAnswer(live)).toBe(false);
    expect(JSON.stringify(live)).not.toContain("Because science");
    expect(JSON.stringify(live)).not.toMatch(/"correctId"/);
  });

  it("hides the correct answer after the timer closes, before host reveal", () => {
    expect(answerKeyIsPublic("waiting_reveal")).toBe(false);
    const closed = publicQuestionPayload(question, { index: 1, total: 20, revealed: answerKeyIsPublic("waiting_reveal") });
    expect(payloadLeaksAnswer(closed)).toBe(false);
    expect(JSON.stringify(closed)).not.toContain("Because science");
  });

  it("includes the correct answer only after admin reveal", () => {
    expect(answerKeyIsPublic("reveal")).toBe(true);
    expect(answerKeyIsPublic("leaderboard")).toBe(true);
    const revealed = publicQuestionPayload(question, { index: 1, total: 20, revealed: answerKeyIsPublic("reveal") });
    expect(revealed.correctId).toBe("c");
    expect(revealed.explanation).toContain("science");
  });
});

describe("public quiz placement", () => {
  it("adds LIVE PET QUIZ near the bottom of the homepage, not the hero or main nav", () => {
    const hero = readFileSync(join(process.cwd(), "src/sections/HeroSection.tsx"), "utf8");
    const promo = readFileSync(join(process.cwd(), "src/sections/HomeQuizPromoSection.tsx"), "utf8");
    const home = readFileSync(join(process.cwd(), "src/app/page.tsx"), "utf8");
    const navbar = readFileSync(join(process.cwd(), "src/components/Navbar.tsx"), "utf8");
    const adminNav = readFileSync(join(process.cwd(), "src/lib/admin/nav.ts"), "utf8");
    expect(hero).not.toContain('href="/quiz"');
    expect(hero).not.toContain("LIVE PET QUIZ");
    expect(promo).toContain('href="/quiz"');
    expect(promo).toContain("LIVE PET QUIZ");
    expect(home).toContain("HomeQuizPromoSection");
    expect(navbar).not.toContain("/quiz");
    expect(navbar).not.toContain("LIVE PET QUIZ");
    expect(adminNav).toContain('href: "/admin/quiz"');
  });
});

describe("quiz security sources", () => {
  it("locks question tables behind RLS and keeps player tokens off the public roster", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/20260911120000_live_quiz.sql"), "utf8");
    expect(sql).toContain("create table if not exists public.quizzes");
    expect(sql).toContain("create table if not exists public.quiz_questions");
    expect(sql).toContain("create table if not exists public.live_quiz_games");
    expect(sql).toContain("create table if not exists public.live_quiz_players");
    expect(sql).toContain("create table if not exists public.live_quiz_answers");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("revoke all on public.quiz_questions from anon, authenticated");
    expect(sql).toContain("revoke all on public.live_quiz_answers from anon, authenticated");
    expect(sql).toContain("revoke all on public.live_quiz_players from anon, authenticated");
    expect(sql).toContain("token_hash");
    expect(sql).not.toMatch(/live_quiz_roster[\s\S]*token_hash/);
    expect(sql).toContain("unique (game_id, player_id, question_id)");
    expect(sql).toContain("alter publication supabase_realtime add table public.live_quiz_games");
  });

  it("stores one reaction per player per question and publishes aggregate counts", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/20260911140000_live_quiz_reactions.sql"), "utf8");
    const store = readFileSync(join(process.cwd(), "src/lib/quiz/store.ts"), "utf8");
    const play = readFileSync(join(process.cwd(), "src/components/quiz/QuizPlayClient.tsx"), "utf8");
    expect(sql).toContain("create table if not exists public.live_quiz_reactions");
    expect(sql).toContain("unique (player_id, question_id)");
    expect(sql).toContain("check (reaction in ('love', 'wow', 'funny', 'angry'))");
    expect(sql).toContain("revoke all on public.live_quiz_reactions from anon, authenticated");
    expect(sql).toContain("alter publication supabase_realtime add table public.live_quiz_reaction_counts");
    expect(store).toContain("Wait until the answer is revealed");
    expect(play).toContain("answerSubmitted");
    expect(play).not.toContain("sourceUrl");
    expect(play).not.toContain("QuizEditor");
  });

  it("keeps reveal, leaderboard, and next-question controls on the admin host API only", () => {
    const play = readFileSync(join(process.cwd(), "src/components/quiz/QuizPlayClient.tsx"), "utf8");
    const playerState = readFileSync(join(process.cwd(), "src/app/api/quiz/state/route.ts"), "utf8");
    const playerAnswer = readFileSync(join(process.cwd(), "src/app/api/quiz/answer/route.ts"), "utf8");
    const playerReact = readFileSync(join(process.cwd(), "src/app/api/quiz/react/route.ts"), "utf8");
    const playerJoin = readFileSync(join(process.cwd(), "src/app/api/quiz/join/route.ts"), "utf8");
    const adminGames = readFileSync(join(process.cwd(), "src/app/api/admin/quiz/games/[gameId]/route.ts"), "utf8");
    const store = readFileSync(join(process.cwd(), "src/lib/quiz/store.ts"), "utf8");
    const waitingSql = readFileSync(join(process.cwd(), "supabase/migrations/20260911160000_live_quiz_waiting_reveal.sql"), "utf8");

    expect(hostMayRevealAnswer("waiting_reveal")).toBe(true);
    expect(hostMayRevealAnswer("question_open")).toBe(false);
    expect(hostMayShowLeaderboard("reveal")).toBe(true);
    expect(hostMayShowLeaderboard("waiting_reveal")).toBe(false);
    expect(hostMayNextQuestion("leaderboard")).toBe(true);
    expect(hostMayNextQuestion("reveal")).toBe(false);
    expect(hostMayNextQuestion("waiting_reveal")).toBe(false);

    expect(play).not.toContain("Reveal Answer");
    expect(play).not.toContain("Close Question");
    expect(play).not.toContain("Show Leaderboard");
    expect(play).not.toContain("Next Question");
    expect(play).not.toContain("Open Question");
    expect(play).not.toContain("Start Quiz");
    expect(play).toContain("playerCopy");
    expect(play).toContain("QuizStage");
    expect(play).toContain("useQuizCountdown");
    const copy = readFileSync(join(process.cwd(), "src/lib/quiz/player-copy.ts"), "utf8");
    expect(copy).toContain("Leave the quiz?");
    expect(copy).toContain("Waiting for the host to reveal the answer");
    expect(copy).toContain("Ootame, kuni mängujuht vastuse avaldab");
    const joinUi = readFileSync(join(process.cwd(), "src/components/quiz/QuizJoinClient.tsx"), "utf8");
    expect(joinUi).toContain("Choose language");
    expect(joinUi).toContain("Vali keel");
    const host = readFileSync(join(process.cwd(), "src/components/quiz/QuizHostClient.tsx"), "utf8");
    expect(host).toContain("useQuizCountdown");
    expect(host).toContain("previewLocale");
    const chrome = readFileSync(join(process.cwd(), "src/components/layout/SiteChrome.tsx"), "utf8");
    expect(chrome).toContain('pathname === "/quiz/play"');
    expect(chrome).toContain("hidden md:block");

    expect(host).toContain("Reveal Answer");
    expect(host).toContain("Close Question");
    expect(host).toContain("Show Leaderboard");
    expect(host).toContain("Next Question");
    expect(host).toContain("Start Quiz");
    expect(host).toContain("Show Final Results");

    expect(adminGames).toContain("requireAdminApi");
    expect(adminGames).toContain("hostRevealAnswer");
    expect(adminGames).toContain('action === "reveal"');
    expect(adminGames).toContain("hostShowLeaderboard");
    expect(adminGames).toContain("hostNextQuestion");

    expect(playerState).not.toContain("hostRevealAnswer");
    expect(playerAnswer).not.toContain("hostRevealAnswer");
    expect(playerReact).not.toContain("hostRevealAnswer");
    expect(playerJoin).not.toContain("hostRevealAnswer");
    expect(playerState).not.toContain("hostShowLeaderboard");
    expect(playerState).not.toContain("hostNextQuestion");

    expect(store).toContain('status: "waiting_reveal"');
    expect(store).toContain("hostRevealAnswer");
    expect(waitingSql).toContain("waiting_reveal");
    expect(waitingSql).toContain("question_open");
  });
});

describe("kahoot host-controlled game", () => {
  const question = {
    prompt: "Demo?",
    choices: [
      { id: "a" as const, text: "One" },
      { id: "b" as const, text: "Two" },
      { id: "c" as const, text: "Three" },
      { id: "d" as const, text: "Four" },
    ],
    correctId: "c" as const,
    explanation: "Because science.",
    timerSeconds: 20,
  };

  it("1. player gets no answer during question_open", () => {
    const live = publicQuestionPayload(question, { index: 1, total: 20, revealed: answerKeyIsPublic("question_open") });
    expect(payloadLeaksAnswer(live)).toBe(false);
  });

  it("2. player gets no answer during waiting_reveal", () => {
    const live = publicQuestionPayload(question, { index: 1, total: 20, revealed: answerKeyIsPublic("waiting_reveal") });
    expect(payloadLeaksAnswer(stripAnswerKey(live))).toBe(false);
    expect(answerKeyIsPublic("waiting_reveal")).toBe(false);
  });

  it("3. timer expiry moves question to waiting_reveal only", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    const future = new Date(Date.now() + 15000).toISOString();
    expect(statusAfterTimerExpiry("question_open", past)).toBe("waiting_reveal");
    expect(statusAfterTimerExpiry("question_open", future)).toBe("question_open");
    expect(statusAfterTimerExpiry("reveal", past)).toBe("reveal");
    expect(statusAfterTimerExpiry("leaderboard", past)).toBe("leaderboard");
  });

  it("4. only host can reveal", () => {
    expect(hostMayRevealAnswer("waiting_reveal")).toBe(true);
    expect(hostMayRevealAnswer("question_open")).toBe(false);
    const playerApis = ["state", "answer", "react", "join"].map((name) =>
      readFileSync(join(process.cwd(), `src/app/api/quiz/${name}/route.ts`), "utf8"),
    );
    for (const source of playerApis) expect(source).not.toContain("hostRevealAnswer");
    const admin = readFileSync(join(process.cwd(), "src/app/api/admin/quiz/games/[gameId]/route.ts"), "utf8");
    expect(admin).toContain("requireAdminApi");
    expect(admin).toContain("hostRevealAnswer");
  });

  it("5. reveal causes scoring", () => {
    const store = readFileSync(join(process.cwd(), "src/lib/quiz/store.ts"), "utf8");
    const revealFn = store.slice(store.indexOf("export async function hostRevealAnswer"), store.indexOf("export async function hostEndQuestion"));
    expect(revealFn.indexOf("scoreOpenRound")).toBeGreaterThan(-1);
    expect(revealFn.indexOf("scoreOpenRound")).toBeLessThan(revealFn.indexOf('status: "reveal"'));
    expect(applyRoundScores([{ id: "p1", score: 100 }], [{ player_id: "p1", points: 200 }])).toEqual([{ id: "p1", score: 300 }]);
  });

  it("6. player sees correct answer only after reveal", () => {
    expect(answerKeyIsPublic("question_open")).toBe(false);
    expect(answerKeyIsPublic("waiting_reveal")).toBe(false);
    expect(answerKeyIsPublic("reveal")).toBe(true);
    const revealed = publicQuestionPayload(question, { index: 1, total: 20, revealed: true });
    expect(revealed.correctId).toBe("c");
  });

  it("7. only host can show leaderboard", () => {
    expect(hostMayShowLeaderboard("reveal")).toBe(true);
    expect(hostMayShowLeaderboard("question_open")).toBe(false);
    const play = readFileSync(join(process.cwd(), "src/components/quiz/QuizPlayClient.tsx"), "utf8");
    expect(play).not.toContain("Show Leaderboard");
    const admin = readFileSync(join(process.cwd(), "src/app/api/admin/quiz/games/[gameId]/route.ts"), "utf8");
    expect(admin).toContain("hostShowLeaderboard");
  });

  it("8. only host can advance question", () => {
    expect(hostMayNextQuestion("leaderboard")).toBe(true);
    expect(hostMayNextQuestion("question_open")).toBe(false);
    const play = readFileSync(join(process.cwd(), "src/components/quiz/QuizPlayClient.tsx"), "utf8");
    expect(play).not.toContain("Next Question");
    const admin = readFileSync(join(process.cwd(), "src/app/api/admin/quiz/games/[gameId]/route.ts"), "utf8");
    expect(admin).toContain("hostNextQuestion");
  });

  it("9. next question automatically becomes visible to players", () => {
    const patch = openQuestionUpdate({ index: 4, now: new Date("2026-09-11T12:00:00.000Z") });
    expect(patch.status).toBe("question_open");
    expect(patch.current_index).toBe(4);
    expect(patch.question_started_at).toBe("2026-09-11T12:00:00.000Z");
    expect(patch.question_ends_at).toBe("2026-09-11T12:00:20.000Z");
    const store = readFileSync(join(process.cwd(), "src/lib/quiz/store.ts"), "utf8");
    expect(store).toContain("openQuestionUpdate");
    const play = readFileSync(join(process.cwd(), "src/components/quiz/QuizPlayClient.tsx"), "utf8");
    expect(play).toContain("live_quiz_games");
    expect(play).toContain("refresh()");
  });

  it("10. player cannot answer after question closed", () => {
    expect(playerMayAnswer("waiting_reveal")).toBe(false);
    expect(playerMayAnswer("reveal")).toBe(false);
    expect(playerMayAnswer("question_open")).toBe(true);
  });

  it("11. duplicate answer rejected", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/20260911120000_live_quiz.sql"), "utf8");
    expect(sql).toContain("unique (game_id, player_id, question_id)");
    const store = readFileSync(join(process.cwd(), "src/lib/quiz/store.ts"), "utf8");
    expect(store).toContain("You already answered");
  });

  it("12. finished game cannot be joined using the PIN", () => {
    expect(pinIsPlayable("finished")).toBe(false);
    expect(pinIsPlayable("lobby")).toBe(true);
  });

  it("13. reconnecting player receives current authoritative state", () => {
    const store = readFileSync(join(process.cwd(), "src/lib/quiz/store.ts"), "utf8");
    expect(store).toContain("eq(\"token_hash\", hashQuizPlayerToken(token))");
    expect(store).toContain("export async function playerState");
    expect(store).toContain("closeQuestionIfDue");
    const play = readFileSync(join(process.cwd(), "src/components/quiz/QuizPlayClient.tsx"), "utf8");
    expect(play).toContain("swmp_quiz_player");
    expect(play).toContain("/api/quiz/state");
  });
});

describe("shared 20-second countdown", () => {
  it("opens every question for exactly 20 seconds", () => {
    expect(QUIZ_QUESTION_SECONDS).toBe(20);
    const opened = openQuestionUpdate({ index: 0, timerSeconds: 99, now: new Date("2026-09-12T10:00:00.000Z") });
    expect(opened.question_started_at).toBe("2026-09-12T10:00:00.000Z");
    expect(opened.question_ends_at).toBe("2026-09-12T10:00:20.000Z");
    expect(SEEDED_QUIZ_QUESTIONS.every((row) => row.timerSeconds === 20)).toBe(true);
  });

  it("gives host and player the same countdown from the same timestamps", () => {
    const endsAt = "2026-09-12T10:00:20.000Z";
    const now = Date.parse("2026-09-12T10:00:07.200Z");
    const hostSeconds = remainingQuizSeconds(endsAt, now);
    const playerSeconds = remainingQuizSeconds(endsAt, now);
    expect(hostSeconds).toBe(13);
    expect(playerSeconds).toBe(hostSeconds);
  });

  it("does not restart after a refresh 8 seconds in", () => {
    const started = Date.parse("2026-09-12T10:00:00.000Z");
    const endsAt = new Date(started + 20_000).toISOString();
    const afterRefresh = remainingQuizSeconds(endsAt, started + 8_000);
    expect(afterRefresh).toBe(12);
    expect(afterRefresh).not.toBe(20);
  });

  it("does not restart on reconnect and never exceeds 20", () => {
    const endsAt = "2026-09-12T10:00:20.000Z";
    expect(remainingQuizSeconds(endsAt, Date.parse("2026-09-12T10:00:01.000Z"))).toBe(19);
    expect(remainingQuizSeconds(endsAt, Date.parse("2026-09-12T09:59:50.000Z"))).toBe(20);
    expect(remainingQuizSeconds(endsAt, Date.parse("2026-09-12T10:00:20.000Z"))).toBe(0);
  });

  it("expires an open question into waiting_reveal only", () => {
    expect(statusAfterTimerExpiry("question_open", "2026-09-12T10:00:00.000Z", Date.parse("2026-09-12T10:00:21.000Z"))).toBe("waiting_reveal");
    expect(statusAfterTimerExpiry("question_open", "2026-09-12T10:00:20.000Z", Date.parse("2026-09-12T10:00:10.000Z"))).toBe("question_open");
    expect(statusAfterTimerExpiry("reveal", "2026-09-12T10:00:00.000Z", Date.parse("2026-09-12T10:00:21.000Z"))).toBe("reveal");
  });
});

describe("bilingual live quiz", () => {
  const colour = seedQuestionToRow(SEEDED_QUIZ_QUESTIONS[1], "q-colour");

  it("persists only an explicit player locale", () => {
    expect(parseQuizLocale("et")).toBe("et");
    expect(parseQuizLocale("en")).toBe("en");
    expect(parseQuizLocale("fr")).toBe("en");
    expect(parseQuizLocale(undefined)).toBe("en");
    const store = readFileSync(join(process.cwd(), "src/lib/quiz/store.ts"), "utf8");
    expect(store).toContain("locale");
    expect(store).toContain("serverNow");
    const joinApi = readFileSync(join(process.cwd(), "src/app/api/quiz/join/route.ts"), "utf8");
    expect(joinApi).toContain("locale");
  });

  it("returns English or Estonian text for the same question id and correct answer", () => {
    const en = localizeQuestion(colour, "en");
    const et = localizeQuestion(colour, "et");
    expect(en.id).toBe(et.id);
    expect(en.id).toBe("q-colour");
    expect(en.correctId).toBe("b");
    expect(et.correctId).toBe("b");
    expect(en.prompt).toContain("colours");
    expect(et.prompt).toContain("värvi");
    expect(en.choices.find((row) => row.id === "b")?.text).toBe("Blue and yellow");
    expect(et.choices.find((row) => row.id === "b")?.text).toBe("Sinist ja kollast");
    const enLive = publicQuestionPayload(en, { index: 2, total: 20, revealed: false });
    const etLive = publicQuestionPayload(et, { index: 2, total: 20, revealed: false });
    expect(payloadLeaksAnswer(enLive)).toBe(false);
    expect(payloadLeaksAnswer(etLive)).toBe(false);
    expect(enLive.id).toBe(etLive.id);
  });

  it("keeps scoring and leaderboard independent of language", () => {
    expect(scoreAnswer({ correct: true })).toBe(200);
    expect(scoreAnswer({ correct: localizeQuestion(colour, "et").correctId === colour.correctId })).toBe(200);
    const afterEn = applyRoundScores([{ id: "p1", score: 0 }], [{ player_id: "p1", points: 200 }]);
    const afterEt = applyRoundScores([{ id: "p2", score: 0 }], [{ player_id: "p2", points: 200 }]);
    expect(afterEn[0].score).toBe(afterEt[0].score);
    expect(PLAYER_COPY.en.plusPoints(200)).toBe("+200 points");
    expect(PLAYER_COPY.et.plusPoints(200)).toBe("+200 punkti");
  });
});


