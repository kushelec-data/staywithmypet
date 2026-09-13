import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DENNY_QUESTION_IMAGE, SEEDED_QUIZ_QUESTION_COUNT, SEEDED_QUIZ_QUESTIONS, SEEDED_QUIZ_TITLE, seedQuestionToRow } from "@/lib/quiz/seed";
import { quizMaxScore, scoreAnswer, scoreCorrectAnswer } from "@/lib/quiz/scoring";
import { displayNamesClash, formatDisplayPin, generateGamePin, isExactSixDigitPin, liveGameStartPayload, normalizeDisplayName, normalizeGamePin, parseQuizReaction, pinIsPlayable } from "@/lib/quiz/pin";
import { payloadLeaksAnswer, publicQuestionPayload, stripAnswerKey } from "@/lib/quiz/public-state";
import {
  answerKeyIsPublic,
  hostMayNextQuestion,
  hostMayRevealAnswer,
  hostMayShowLeaderboard,
  playerMayAnswer,
} from "@/lib/quiz/game-status";
import { applyRoundScores, openQuestionUpdate, QUIZ_QUESTION_SECONDS, remainingQuizSeconds, statusAfterTimerExpiry } from "@/lib/quiz/timer";
import { answerPercentage, previousQuestionPercentLine } from "@/lib/quiz/percentages";
import { localizeQuestion, parseQuizLocale } from "@/lib/quiz/locale";
import { PLAYER_COPY } from "@/lib/quiz/player-copy";

describe("seeded quiz", () => {
  it("has exactly 12 questions: 9 animal plus 3 StayWithMyPet", () => {
    expect(SEEDED_QUIZ_TITLE).toBe("How Well Do You Really Know Dogs & Cats?");
    expect(SEEDED_QUIZ_QUESTION_COUNT).toBe(12);
    expect(SEEDED_QUIZ_QUESTIONS).toHaveLength(12);
    expect(SEEDED_QUIZ_QUESTIONS.map((row) => row.sortOrder)).toEqual([...Array(SEEDED_QUIZ_QUESTIONS.length)].map((_, i) => i + 1));
    for (const question of SEEDED_QUIZ_QUESTIONS) {
      expect(question.choices).toHaveLength(4);
      expect(new Set(question.choices.map((row) => row.id)).size).toBe(4);
      expect(question.choices.some((row) => row.id === question.correctId)).toBe(true);
      expect(question.timerSeconds).toBe(25);
      expect(question.promptEt.length).toBeGreaterThan(10);
      expect(question.explanationEt.length).toBeGreaterThan(20);
      expect(question.choices.every((choice) => choice.textEt.length > 0)).toBe(true);
      expect(question.sourceUrl.startsWith("http")).toBe(true);
      expect(question.explanation.length).toBeGreaterThan(20);
    }
    expect(SEEDED_QUIZ_QUESTIONS.slice(0, 9).every((row) => row.sourceLabel !== "StayWithMyPet")).toBe(true);
    expect(SEEDED_QUIZ_QUESTIONS.slice(9).every((row) => row.sourceLabel === "StayWithMyPet")).toBe(true);
    expect(SEEDED_QUIZ_QUESTIONS.some((row) => row.prompt.includes("Only veterinary clinics"))).toBe(false);
    expect(SEEDED_QUIZ_QUESTIONS.some((row) => row.prompt.includes("If you have a pet and want a trusted person"))).toBe(false);
    const denny = SEEDED_QUIZ_QUESTIONS[9];
    expect(denny.prompt).toContain("Chief Happiness Officer");
    expect(denny.promptEt).toContain("Chief Happiness Officer");
    expect(denny.correctId).toBe("c");
    expect(denny.choices[2].text).toBe("Denny");
    expect(denny.imageUrl).toBe(DENNY_QUESTION_IMAGE);
    expect(existsSync(join(process.cwd(), "public/quiz/denny.jpg"))).toBe(true);
    const store = readFileSync(join(process.cwd(), "src/lib/quiz/store.ts"), "utf8");
    expect(store).toContain("questions.length");
    expect(store).toContain("nextIndex >= questions.length");
    expect(store).toContain('status: "finished"');
    const play = readFileSync(join(process.cwd(), "src/components/quiz/QuizPlayClient.tsx"), "utf8");
    expect(play).toContain("question?.total");
    expect(play).not.toContain("?? 20");
    const host = readFileSync(join(process.cwd(), "src/components/quiz/QuizHostClient.tsx"), "utf8");
    expect(host).toContain("state.total");
    expect(host).toContain("QuizQuestionImage");
    expect(play).toContain("QuizQuestionImage");
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/20260912190000_live_quiz_12_questions.sql"), "utf8");
    expect(sql).toContain("add column if not exists image_url");
    expect(sql).toContain("Chief Happiness Officer");
    expect(sql).toContain("/quiz/denny.jpg");
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

  it("caps this quiz at 2400 from the actual question count", () => {
    expect(quizMaxScore(SEEDED_QUIZ_QUESTIONS.length)).toBe(2400);
    expect(SEEDED_QUIZ_QUESTIONS.length * 200).toBe(2400);
    const scoring = readFileSync(join(process.cwd(), "src/lib/quiz/scoring.ts"), "utf8");
    expect(scoring).toContain("QUIZ_POINTS_PER_CORRECT = 200");
    expect(scoring).toContain("function quizMaxScore");
    expect(scoring).not.toMatch(/1000\s*-/);
  });
});

describe("live game PIN", () => {
  it("creates an exact 6-digit PIN when starting a live game", () => {
    const pin = generateGamePin(["111111", "222222"]);
    expect(isExactSixDigitPin(pin)).toBe(true);
    expect(pin).toHaveLength(6);
    expect(pin).not.toBe("111111");
    const created = liveGameStartPayload({ id: "game-1", pin, status: "lobby" });
    expect("error" in created).toBe(false);
    if ("error" in created) throw new Error(created.error);
    expect(created.gameId).toBe("game-1");
    expect(created.id).toBe("game-1");
    expect(created.pin).toBe(pin);
    expect(created.status).toBe("lobby");
    const store = readFileSync(join(process.cwd(), "src/lib/quiz/store.ts"), "utf8");
    const startFn = store.slice(store.indexOf("export async function startLiveGame"), store.indexOf("type GameRow"));
    expect(startFn).toContain("generateGamePin");
    expect(startFn).toContain("liveGameStartPayload");
    expect(startFn).toContain("insert");
    expect(startFn).toContain("pin");
  });

  it("returns that PIN from the host API and keeps it on refresh", () => {
    const store = readFileSync(join(process.cwd(), "src/lib/quiz/store.ts"), "utf8");
    const hostFn = store.slice(store.indexOf("export async function hostGameState"), store.length);
    expect(hostFn).toContain("pin: game.pin");
    expect(hostFn).not.toContain("generateGamePin");
    const host = readFileSync(join(process.cwd(), "src/components/quiz/QuizHostClient.tsx"), "utf8");
    expect(host).toContain("state?.pin");
    expect(host).toContain("Copy PIN");
    expect(host).not.toContain("generateGamePin");
    const first = liveGameStartPayload({ id: "game-1", pin: "482731", status: "lobby" });
    const refresh = liveGameStartPayload({ id: "game-1", pin: "482731", status: "lobby" });
    expect(first).toEqual(refresh);
    const list = readFileSync(join(process.cwd(), "src/components/admin/QuizAdminList.tsx"), "utf8");
    expect(list).toContain("START LIVE GAME");
    expect(list).toContain("startLiveGame: true");
    expect(list).toContain("adminQuizHostHref");
    expect(list).toContain("location.assign");
    expect(list).not.toContain('href="/quiz"');
    expect(host).not.toContain("QuizJoinClient");
    expect(host).not.toContain("Choose language");
    expect(host).toContain("HostPinPanel");
    expect(existsSync(join(process.cwd(), "src/app/admin/quiz/host/[gameId]/page.tsx"))).toBe(true);
    expect(existsSync(join(process.cwd(), "src/app/admin/quiz/edit/[quizId]/page.tsx"))).toBe(true);
    const legacy = readFileSync(join(process.cwd(), "src/app/admin/quiz/[quizId]/page.tsx"), "utf8");
    expect(legacy).toContain('quizId === "host"');
    expect(legacy).toContain('redirect("/admin/quiz")');
  });

  it("lets a player join the stored PIN and rejects a wrong or finished PIN", () => {
    expect(normalizeGamePin("482 731")).toBe("482731");
    expect(normalizeGamePin("000000")).toBe("000000");
    expect(normalizeGamePin("48273")).toBeNull();
    expect(normalizeGamePin("abcdef")).toBeNull();
    expect(pinIsPlayable("lobby")).toBe(true);
    expect(pinIsPlayable("finished")).toBe(false);
    const storeSrc = readFileSync(join(process.cwd(), "src/lib/quiz/store.ts"), "utf8");
    const joinFn = storeSrc.slice(storeSrc.indexOf("export async function joinGameWithPin"), storeSrc.indexOf("export async function registerPlayer"));
    expect(joinFn).toContain('.eq("pin", pin)');
    expect(joinFn).toContain('.neq("status", "finished")');
    expect(joinFn).toContain("That PIN is not active");
    expect(joinFn).toContain("Enter the 6-digit game PIN");
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
    timerSeconds: 30,
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
    expect(joinUi).toContain("Eesti");
    expect(joinUi).toContain("English");
    expect(joinUi).not.toContain("🇪🇪");
    expect(joinUi).not.toContain("🇬🇧");
    const host = readFileSync(join(process.cwd(), "src/components/quiz/QuizHostClient.tsx"), "utf8");
    expect(host).toContain("useQuizCountdown");
    expect(host).toContain("previewLocale");
    expect(host).toContain("QuizStage");
    expect(host).toContain("100dvh");
    expect(host).toContain("100vw");
    expect(host).toContain("max-w-[1200px]");
    expect(host).toContain("clamp(");
    expect(host).toContain("JOIN THE QUIZ");
    expect(host).toContain("GAME PIN");
    expect(host).toContain("StayWithMyPet Live Quiz");
    expect(host).toContain("Waiting to reveal the answer");
    expect(host).toContain("max-w-[320px]");
    expect(host).toContain("answerPercentage");
    expect(host).toContain("Previous question:");
    expect(host).toContain("answerCountLabel");
    const chrome = readFileSync(join(process.cwd(), "src/components/layout/SiteChrome.tsx"), "utf8");
    expect(chrome).toContain('pathname === "/quiz/play"');
    expect(chrome).toContain("hidden md:block");
    expect(chrome).toContain('pathname.startsWith("/admin/quiz/host/")');
    expect(chrome).toContain("quiz-host-active");

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
    timerSeconds: 30,
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
    const hostAdvance = readFileSync(join(process.cwd(), "src/lib/quiz/store.ts"), "utf8");
    expect(hostAdvance).toContain("nextIndex >= questions.length");
    expect(hostAdvance).toContain('status: "finished"');
    const admin = readFileSync(join(process.cwd(), "src/app/api/admin/quiz/games/[gameId]/route.ts"), "utf8");
    expect(admin).toContain("hostNextQuestion");
  });

  it("9. next question automatically becomes visible to players", () => {
    const patch = openQuestionUpdate({ index: 4, now: new Date("2026-09-11T12:00:00.000Z") });
    expect(patch.status).toBe("question_open");
    expect(patch.current_index).toBe(4);
    expect(patch.question_started_at).toBe("2026-09-11T12:00:00.000Z");
    expect(patch.question_ends_at).toBe("2026-09-11T12:00:25.000Z");
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

describe("shared 25-second countdown", () => {
  it("opens every question for exactly 25 seconds", () => {
    expect(QUIZ_QUESTION_SECONDS).toBe(25);
    const opened = openQuestionUpdate({ index: 0, timerSeconds: 99, now: new Date("2026-09-12T10:00:00.000Z") });
    expect(opened.question_started_at).toBe("2026-09-12T10:00:00.000Z");
    expect(opened.question_ends_at).toBe("2026-09-12T10:00:25.000Z");
    expect(SEEDED_QUIZ_QUESTIONS.every((row) => row.timerSeconds === 25)).toBe(true);
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/20260913070000_live_quiz_timer_25.sql"), "utf8");
    expect(sql).toContain("timer_seconds = 25");
    expect(sql).toContain("set default 25");
  });

  it("gives host and player the same countdown from the same timestamps", () => {
    const endsAt = "2026-09-12T10:00:25.000Z";
    const now = Date.parse("2026-09-12T10:00:07.200Z");
    const hostSeconds = remainingQuizSeconds(endsAt, now);
    const playerSeconds = remainingQuizSeconds(endsAt, now);
    expect(hostSeconds).toBe(18);
    expect(playerSeconds).toBe(hostSeconds);
    const host = readFileSync(join(process.cwd(), "src/components/quiz/QuizHostClient.tsx"), "utf8");
    const play = readFileSync(join(process.cwd(), "src/components/quiz/QuizPlayClient.tsx"), "utf8");
    expect(host).toContain("useQuizCountdown");
    expect(play).toContain("useQuizCountdown");
    expect(host).toContain("QUIZ_QUESTION_SECONDS");
    expect(play).toContain("QUIZ_QUESTION_SECONDS");
  });

  it("does not restart after a refresh 10 seconds in", () => {
    const started = Date.parse("2026-09-12T10:00:00.000Z");
    const endsAt = new Date(started + 25_000).toISOString();
    const afterRefresh = remainingQuizSeconds(endsAt, started + 10_000);
    expect(afterRefresh).toBe(15);
    expect(afterRefresh).not.toBe(25);
  });

  it("does not restart on reconnect and never exceeds 25", () => {
    const endsAt = "2026-09-12T10:00:25.000Z";
    expect(remainingQuizSeconds(endsAt, Date.parse("2026-09-12T10:00:01.000Z"))).toBe(24);
    expect(remainingQuizSeconds(endsAt, Date.parse("2026-09-12T09:59:50.000Z"))).toBe(25);
    expect(remainingQuizSeconds(endsAt, Date.parse("2026-09-12T10:00:25.000Z"))).toBe(0);
  });

  it("expires an open question into waiting_reveal only", () => {
    expect(statusAfterTimerExpiry("question_open", "2026-09-12T10:00:00.000Z", Date.parse("2026-09-12T10:00:26.000Z"))).toBe("waiting_reveal");
    expect(statusAfterTimerExpiry("question_open", "2026-09-12T10:00:25.000Z", Date.parse("2026-09-12T10:00:10.000Z"))).toBe("question_open");
    expect(statusAfterTimerExpiry("reveal", "2026-09-12T10:00:00.000Z", Date.parse("2026-09-12T10:00:26.000Z"))).toBe("reveal");
  });

  it("keeps scoring at +200 after the 25-second timer change", () => {
    expect(scoreAnswer({ correct: true, elapsedMs: 200, limitMs: 25_000 })).toBe(200);
    expect(scoreAnswer({ correct: true, elapsedMs: 24_000, limitMs: 25_000 })).toBe(200);
  });
});

describe("reveal answer percentages", () => {
  it("rounds answer counts to whole percentages and zeros when nobody answered", () => {
    expect(answerPercentage(1, 4)).toBe(25);
    expect(answerPercentage(2, 4)).toBe(50);
    expect(answerPercentage(0, 0)).toBe(0);
    expect(previousQuestionPercentLine({ a: 2, b: 11, c: 6, d: 1 })).toBe("A 10% · B 55% · C 30% · D 5%");
  });

  it("shows four option percentages only after reveal", () => {
    const host = readFileSync(join(process.cwd(), "src/components/quiz/QuizHostClient.tsx"), "utf8");
    expect(host).toContain("answerPercentage");
    expect(host).toContain("{pct}%");
    expect(host).toContain("answerCountLabel");
    const store = readFileSync(join(process.cwd(), "src/lib/quiz/store.ts"), "utf8");
    const hostFn = store.slice(store.indexOf("export async function hostGameState"));
    expect(hostFn).toContain("distribution: revealed ? distribution : null");
    expect(answerKeyIsPublic("question_open")).toBe(false);
    expect(answerKeyIsPublic("waiting_reveal")).toBe(false);
    expect(answerKeyIsPublic("reveal")).toBe(true);
    const live = publicQuestionPayload(
      {
        prompt: "Demo?",
        choices: [
          { id: "a", text: "One" },
          { id: "b", text: "Two" },
          { id: "c", text: "Three" },
          { id: "d", text: "Four" },
        ],
        correctId: "c",
        explanation: "Because science.",
      },
      { index: 1, total: SEEDED_QUIZ_QUESTIONS.length, revealed: false },
    );
    expect(JSON.stringify(live)).not.toContain("%");
    expect(payloadLeaksAnswer(live)).toBe(false);
    expect(SEEDED_QUIZ_QUESTIONS).toHaveLength(12);
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
    const enLive = publicQuestionPayload(en, { index: 2, total: SEEDED_QUIZ_QUESTIONS.length, revealed: false });
    const etLive = publicQuestionPayload(et, { index: 2, total: SEEDED_QUIZ_QUESTIONS.length, revealed: false });
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


