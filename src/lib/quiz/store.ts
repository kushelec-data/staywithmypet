import "server-only";

import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createOpaqueToken } from "@/lib/email-campaigns/tokens";
import { displayNamesClash, emptyReactionCounts, generateGamePin, liveGameStartPayload, normalizeDisplayName, normalizeGamePin, parseQuizReaction, pinIsPlayable, type QuizReaction } from "@/lib/quiz/pin";
import {
  answerKeyIsPublic,
  hostMayCloseQuestion,
  hostMayNextQuestion,
  hostMayRevealAnswer,
  hostMayShowLeaderboard,
  isQuestionOpen,
  playerMayAnswer,
  playerMayReact,
} from "@/lib/quiz/game-status";
import { publicQuestionPayload, type PublicQuestion } from "@/lib/quiz/public-state";
import { scoreAnswer } from "@/lib/quiz/scoring";
import { applyRoundScores, openQuestionUpdate, QUIZ_QUESTION_SECONDS, remainingFromEndsAt, serverElapsedMs, statusAfterTimerExpiry } from "@/lib/quiz/timer";
import { stripAnswerKey } from "@/lib/quiz/public-state";
import { localizeQuestion, parseQuizLocale, type QuizLocale } from "@/lib/quiz/locale";
import { SEEDED_QUIZ_QUESTIONS, SEEDED_QUIZ_TITLE } from "@/lib/quiz/seed";
import type { QuizQuestionRow } from "@/lib/quiz/types";

type AdminDb = NonNullable<ReturnType<typeof createAdminClient>>;

function db(): AdminDb | null {
  return createAdminClient();
}

export function hashQuizPlayerToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type { QuizQuestionRow } from "@/lib/quiz/types";

export type QuizSummary = {
  id: string;
  title: string;
  status: string;
  questionCount: number;
  updatedAt: string;
};

function mapQuestion(row: Record<string, unknown>): QuizQuestionRow {
  return {
    id: String(row.id),
    quizId: String(row.quiz_id),
    sortOrder: Number(row.sort_order),
    promptEn: String(row.prompt ?? ""),
    promptEt: String(row.prompt_et ?? ""),
    choices: [
      { id: "a", textEn: String(row.choice_a ?? ""), textEt: String(row.choice_a_et ?? "") },
      { id: "b", textEn: String(row.choice_b ?? ""), textEt: String(row.choice_b_et ?? "") },
      { id: "c", textEn: String(row.choice_c ?? ""), textEt: String(row.choice_c_et ?? "") },
      { id: "d", textEn: String(row.choice_d ?? ""), textEt: String(row.choice_d_et ?? "") },
    ],
    correctId: row.correct_id as "a" | "b" | "c" | "d",
    explanationEn: String(row.explanation ?? ""),
    explanationEt: String(row.explanation_et ?? ""),
    sourceLabel: String(row.source_label),
    sourceUrl: String(row.source_url),
    timerSeconds: QUIZ_QUESTION_SECONDS,
  };
}

function questionWritePayload(quizId: string, sortOrder: number, question: QuizQuestionRow | (Omit<QuizQuestionRow, "id" | "quizId"> & { id?: string })) {
  return {
    quiz_id: quizId,
    sort_order: sortOrder,
    prompt: question.promptEn,
    prompt_et: question.promptEt,
    choice_a: question.choices[0]?.textEn ?? "",
    choice_b: question.choices[1]?.textEn ?? "",
    choice_c: question.choices[2]?.textEn ?? "",
    choice_d: question.choices[3]?.textEn ?? "",
    choice_a_et: question.choices[0]?.textEt ?? "",
    choice_b_et: question.choices[1]?.textEt ?? "",
    choice_c_et: question.choices[2]?.textEt ?? "",
    choice_d_et: question.choices[3]?.textEt ?? "",
    correct_id: question.correctId,
    explanation: question.explanationEn,
    explanation_et: question.explanationEt,
    source_label: question.sourceLabel,
    source_url: question.sourceUrl,
    timer_seconds: QUIZ_QUESTION_SECONDS,
  };
}

export async function ensureDefaultQuiz(): Promise<string | null> {
  const admin = db();
  if (!admin) return null;
  const { data: existing } = await admin.from("quizzes").select("id").order("created_at", { ascending: true }).limit(1);
  if (existing?.[0]?.id) {
    const quizId = String(existing[0].id);
    const { data: questions } = await admin.from("quiz_questions").select("id, sort_order, prompt_et").eq("quiz_id", quizId);
    for (const row of questions ?? []) {
      if (String(row.prompt_et ?? "").trim()) continue;
      const seed = SEEDED_QUIZ_QUESTIONS.find((item) => item.sortOrder === Number(row.sort_order));
      if (!seed) continue;
      await admin
        .from("quiz_questions")
        .update({
          prompt_et: seed.promptEt,
          choice_a_et: seed.choices[0].textEt,
          choice_b_et: seed.choices[1].textEt,
          choice_c_et: seed.choices[2].textEt,
          choice_d_et: seed.choices[3].textEt,
          explanation_et: seed.explanationEt,
          timer_seconds: QUIZ_QUESTION_SECONDS,
        })
        .eq("id", row.id);
    }
    return quizId;
  }
  const { data: quiz, error } = await admin
    .from("quizzes")
    .insert({ title: SEEDED_QUIZ_TITLE, status: "ready" })
    .select("id")
    .single();
  if (error || !quiz) return null;
  const rows = SEEDED_QUIZ_QUESTIONS.map((question) =>
    questionWritePayload(String(quiz.id), question.sortOrder, {
      promptEn: question.prompt,
      promptEt: question.promptEt,
      choices: question.choices.map((choice) => ({ id: choice.id, textEn: choice.text, textEt: choice.textEt })),
      correctId: question.correctId,
      explanationEn: question.explanation,
      explanationEt: question.explanationEt,
      sourceLabel: question.sourceLabel,
      sourceUrl: question.sourceUrl,
      timerSeconds: QUIZ_QUESTION_SECONDS,
      sortOrder: question.sortOrder,
    }),
  );
  await admin.from("quiz_questions").insert(rows);
  return String(quiz.id);
}

export async function listQuizzes(): Promise<QuizSummary[]> {
  const admin = db();
  if (!admin) return [];
  await ensureDefaultQuiz();
  const { data: quizzes } = await admin.from("quizzes").select("id, title, status, updated_at").order("updated_at", { ascending: false });
  const ids = (quizzes ?? []).map((row) => String(row.id));
  const counts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: questions } = await admin.from("quiz_questions").select("quiz_id").in("quiz_id", ids);
    for (const row of questions ?? []) {
      const key = String(row.quiz_id);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return (quizzes ?? []).map((row) => ({
    id: String(row.id),
    title: String(row.title),
    status: String(row.status),
    questionCount: counts.get(String(row.id)) ?? 0,
    updatedAt: String(row.updated_at),
  }));
}

export async function getQuiz(quizId: string): Promise<{ quiz: QuizSummary; questions: QuizQuestionRow[] } | null> {
  const admin = db();
  if (!admin) return null;
  const { data: quiz } = await admin.from("quizzes").select("id, title, status, updated_at").eq("id", quizId).maybeSingle();
  if (!quiz) return null;
  const { data: questions } = await admin.from("quiz_questions").select("*").eq("quiz_id", quizId).order("sort_order", { ascending: true });
  return {
    quiz: {
      id: String(quiz.id),
      title: String(quiz.title),
      status: String(quiz.status),
      questionCount: (questions ?? []).length,
      updatedAt: String(quiz.updated_at),
    },
    questions: (questions ?? []).map((row) => mapQuestion(row as Record<string, unknown>)),
  };
}

export async function createQuiz(title: string): Promise<{ id: string } | { error: string }> {
  const admin = db();
  if (!admin) return { error: "Unavailable" };
  const name = title.trim() || "New quiz";
  const { data, error } = await admin.from("quizzes").insert({ title: name, status: "draft" }).select("id").single();
  if (error || !data) return { error: error?.message ?? "create_failed" };
  return { id: String(data.id) };
}

export async function saveQuiz(
  quizId: string,
  input: { title: string; questions: Array<Omit<QuizQuestionRow, "id" | "quizId"> & { id?: string }> },
): Promise<{ ok: true } | { error: string }> {
  const admin = db();
  if (!admin) return { error: "Unavailable" };
  await admin.from("quizzes").update({ title: input.title.trim() || "Quiz", status: "ready", updated_at: new Date().toISOString() }).eq("id", quizId);
  const { data: existing } = await admin.from("quiz_questions").select("id").eq("quiz_id", quizId);
  const keep = new Set(input.questions.map((row) => row.id).filter(Boolean) as string[]);
  for (const row of existing ?? []) {
    if (!keep.has(String(row.id))) await admin.from("quiz_questions").delete().eq("id", row.id);
  }
  let order = 1;
  for (const question of input.questions) {
    const payload = questionWritePayload(quizId, order, question);
    order += 1;
    if (question.id) {
      await admin.from("quiz_questions").update(payload).eq("id", question.id).eq("quiz_id", quizId);
    } else {
      await admin.from("quiz_questions").insert(payload);
    }
  }
  return { ok: true };
}

export async function duplicateQuiz(quizId: string): Promise<{ id: string } | { error: string }> {
  const packed = await getQuiz(quizId);
  if (!packed) return { error: "Not found" };
  const created = await createQuiz(`${packed.quiz.title} (copy)`);
  if ("error" in created) return created;
  await saveQuiz(created.id, {
    title: `${packed.quiz.title} (copy)`,
    questions: packed.questions.map(({ id: _id, quizId: _quizId, ...rest }) => rest),
  });
  return created;
}

export async function startLiveGame(
  quizId: string,
  hostUserId: string,
): Promise<{ id: string; gameId: string; pin: string; status: string } | { error: string }> {
  const admin = db();
  if (!admin) return { error: "Unavailable" };
  const packed = await getQuiz(quizId);
  if (!packed || packed.questions.length === 0) return { error: "Add questions first" };
  const { data: active } = await admin.from("live_quiz_games").select("pin").neq("status", "finished");
  const pin = generateGamePin((active ?? []).map((row) => String(row.pin)));
  const payload = {
    quiz_id: quizId,
    pin,
    status: "lobby" as const,
    current_index: 0,
    host_user_id: hostUserId,
  };
  let inserted = await admin.from("live_quiz_games").insert(payload).select("id, pin, status").single();
  if (inserted.error && hostUserId) {
    const { host_user_id: _host, ...withoutHost } = payload;
    inserted = await admin.from("live_quiz_games").insert(withoutHost).select("id, pin, status").single();
  }
  if (inserted.error || !inserted.data) {
    return { error: inserted.error?.message ?? "Could not create the live game. Try again." };
  }
  return liveGameStartPayload({
    id: String(inserted.data.id),
    pin: String(inserted.data.pin),
    status: String(inserted.data.status ?? "lobby"),
  });
}

type GameRow = {
  id: string;
  quiz_id: string;
  pin: string;
  status: string;
  current_index: number;
  question_started_at: string | null;
  question_ends_at: string | null;
  round_scored: boolean;
  ended_at: string | null;
};

function mapGame(row: Record<string, unknown>): GameRow {
  const ends = row.question_ends_at ?? row.question_closes_at ?? null;
  return {
    id: String(row.id),
    quiz_id: String(row.quiz_id),
    pin: String(row.pin),
    status: String(row.status),
    current_index: Number(row.current_question_index ?? row.current_index ?? 0),
    question_started_at: row.question_started_at ? String(row.question_started_at) : null,
    question_ends_at: ends ? String(ends) : null,
    round_scored: Boolean(row.round_scored),
    ended_at: row.ended_at ? String(row.ended_at) : null,
  };
}

async function loadGame(admin: AdminDb, gameId: string): Promise<GameRow | null> {
  const { data } = await admin.from("live_quiz_games").select("*").eq("id", gameId).maybeSingle();
  if (!data) return null;
  return mapGame(data as Record<string, unknown>);
}

async function loadQuestions(admin: AdminDb, quizId: string): Promise<QuizQuestionRow[]> {
  const { data } = await admin.from("quiz_questions").select("*").eq("quiz_id", quizId).order("sort_order", { ascending: true });
  return (data ?? []).map((row) => mapQuestion(row as Record<string, unknown>));
}

async function scoreOpenRound(admin: AdminDb, game: GameRow, question: QuizQuestionRow): Promise<void> {
  const { data: claimed } = await admin
    .from("live_quiz_games")
    .update({ round_scored: true })
    .eq("id", game.id)
    .eq("round_scored", false)
    .select("id")
    .maybeSingle();
  if (!claimed) return;
  const { data: answers } = await admin
    .from("live_quiz_answers")
    .select("player_id, points")
    .eq("game_id", game.id)
    .eq("question_id", question.id);
  const { data: players } = await admin.from("live_quiz_players").select("id, score").eq("game_id", game.id);
  const nextScores = applyRoundScores(
    (players ?? []).map((player) => ({ id: String(player.id), score: Number(player.score) })),
    (answers ?? []).map((row) => ({ player_id: String(row.player_id), points: Number(row.points) })),
  );
  for (const player of nextScores) {
    const current = (players ?? []).find((row) => String(row.id) === player.id);
    if (current && Number(current.score) !== player.score) {
      await admin.from("live_quiz_players").update({ score: player.score }).eq("id", player.id);
    }
  }
}

async function expireOpenQuestion(admin: AdminDb, gameId: string): Promise<GameRow | null> {
  const nowIso = new Date().toISOString();
  const { data } = await admin
    .from("live_quiz_games")
    .update({ status: "waiting_reveal" })
    .eq("id", gameId)
    .in("status", ["question_open", "question"])
    .lte("question_ends_at", nowIso)
    .select("*")
    .maybeSingle();
  if (data) return mapGame(data as Record<string, unknown>);
  const legacy = await admin
    .from("live_quiz_games")
    .update({ status: "waiting_reveal" })
    .eq("id", gameId)
    .in("status", ["question_open", "question"])
    .lte("question_closes_at", nowIso)
    .select("*")
    .maybeSingle();
  if (legacy.data) return mapGame(legacy.data as Record<string, unknown>);
  return loadGame(admin, gameId);
}

export async function closeQuestionIfDue(gameId: string): Promise<GameRow | null> {
  const admin = db();
  if (!admin) return null;
  const game = await loadGame(admin, gameId);
  if (!game) return null;
  if (statusAfterTimerExpiry(game.status, game.question_ends_at) !== "waiting_reveal") return game;
  return expireOpenQuestion(admin, gameId);
}

export async function hostStartQuiz(gameId: string): Promise<{ ok: true } | { error: string }> {
  const admin = db();
  if (!admin) return { error: "Unavailable" };
  const game = await loadGame(admin, gameId);
  if (!game) return { error: "Not found" };
  if (game.status !== "lobby") return { error: "Quiz already started" };
  const questions = await loadQuestions(admin, game.quiz_id);
  const question = questions[0];
  if (!question) return { error: "No questions" };
  await admin.from("live_quiz_games").update(openQuestionUpdate({ index: 0 })).eq("id", gameId).eq("status", "lobby");
  return { ok: true };
}

export async function hostShowLeaderboard(gameId: string): Promise<{ ok: true } | { error: string }> {
  const admin = db();
  if (!admin) return { error: "Unavailable" };
  const game = await closeQuestionIfDue(gameId);
  if (!game) return { error: "Not found" };
  if (!hostMayShowLeaderboard(game.status)) return { error: "Reveal the answer first" };
  const { data } = await admin
    .from("live_quiz_games")
    .update({ status: "leaderboard" })
    .eq("id", gameId)
    .eq("status", "reveal")
    .select("id")
    .maybeSingle();
  if (!data) return { error: "Reveal the answer first" };
  return { ok: true };
}

export async function hostRevealAnswer(gameId: string): Promise<{ ok: true } | { error: string }> {
  const admin = db();
  if (!admin) return { error: "Unavailable" };
  const game = await closeQuestionIfDue(gameId);
  if (!game) return { error: "Not found" };
  if (!hostMayRevealAnswer(game.status)) return { error: "Close the question first" };
  const questions = await loadQuestions(admin, game.quiz_id);
  const question = questions[game.current_index];
  if (!question) return { error: "Missing question" };
  await scoreOpenRound(admin, game, question);
  const { data } = await admin
    .from("live_quiz_games")
    .update({ status: "reveal" })
    .eq("id", gameId)
    .eq("status", "waiting_reveal")
    .select("id")
    .maybeSingle();
  if (!data) return { error: "Close the question first" };
  return { ok: true };
}

export async function hostEndQuestion(gameId: string): Promise<{ ok: true } | { error: string }> {
  const admin = db();
  if (!admin) return { error: "Unavailable" };
  const game = await loadGame(admin, gameId);
  if (!game) return { error: "Not found" };
  if (!hostMayCloseQuestion(game.status)) return { error: "No open question" };
  const nowIso = new Date().toISOString();
  const { data } = await admin
    .from("live_quiz_games")
    .update({ status: "waiting_reveal", question_ends_at: nowIso, question_closes_at: nowIso })
    .eq("id", gameId)
    .in("status", ["question_open", "question"])
    .select("id")
    .maybeSingle();
  if (!data) return { error: "Question already closed" };
  return { ok: true };
}

export async function hostNextQuestion(gameId: string): Promise<{ ok: true; finished?: boolean } | { error: string }> {
  const admin = db();
  if (!admin) return { error: "Unavailable" };
  const game = await closeQuestionIfDue(gameId);
  if (!game) return { error: "Not found" };
  if (!hostMayNextQuestion(game.status)) return { error: "Show the leaderboard first" };
  const questions = await loadQuestions(admin, game.quiz_id);
  const nextIndex = game.current_index + 1;
  if (nextIndex >= questions.length) {
    await admin
      .from("live_quiz_games")
      .update({ status: "finished", ended_at: new Date().toISOString() })
      .eq("id", gameId)
      .eq("status", "leaderboard");
    return { ok: true, finished: true };
  }
  const question = questions[nextIndex];
  await admin
    .from("live_quiz_games")
    .update(openQuestionUpdate({ index: nextIndex }))
    .eq("id", gameId)
    .eq("status", "leaderboard");
  return { ok: true };
}

export async function joinGameWithPin(pinRaw: string): Promise<{ gameId: string; status: string } | { error: string }> {
  const admin = db();
  if (!admin) return { error: "Unavailable" };
  const pin = normalizeGamePin(pinRaw);
  if (!pin) return { error: "Enter the 6-digit game PIN" };
  const { data } = await admin
    .from("live_quiz_games")
    .select("id, status, pin")
    .eq("pin", pin)
    .neq("status", "finished")
    .maybeSingle();
  if (!data || !pinIsPlayable(String(data.status))) return { error: "That PIN is not active" };
  return { gameId: String(data.id), status: String(data.status) };
}

export async function registerPlayer(
  pinRaw: string,
  displayNameRaw: string,
  localeRaw?: unknown,
): Promise<{ gameId: string; playerId: string; token: string; locale: QuizLocale } | { error: string }> {
  const admin = db();
  if (!admin) return { error: "Unavailable" };
  const joined = await joinGameWithPin(pinRaw);
  if ("error" in joined) return joined;
  const name = normalizeDisplayName(displayNameRaw);
  if (!name) return { error: "Enter a name (2–24 characters)" };
  const { data: players } = await admin.from("live_quiz_players").select("display_name").eq("game_id", joined.gameId);
  if (displayNamesClash((players ?? []).map((row) => String(row.display_name)), name)) {
    return { error: "That name is already in this game" };
  }
  const token = createOpaqueToken();
  const locale = parseQuizLocale(localeRaw);
  const { data, error } = await admin
    .from("live_quiz_players")
    .insert({
      game_id: joined.gameId,
      display_name: name,
      display_name_key: name.toLowerCase(),
      token_hash: hashQuizPlayerToken(token),
      locale,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not join" };
  return { gameId: joined.gameId, playerId: String(data.id), token, locale };
}

async function loadReactionCounts(admin: AdminDb, gameId: string, questionId: string) {
  const { data } = await admin
    .from("live_quiz_reaction_counts")
    .select("love, wow, funny, angry")
    .eq("game_id", gameId)
    .eq("question_id", questionId)
    .maybeSingle();
  return {
    love: Number(data?.love ?? 0),
    wow: Number(data?.wow ?? 0),
    funny: Number(data?.funny ?? 0),
    angry: Number(data?.angry ?? 0),
  };
}

async function loadAnswerDistribution(admin: AdminDb, gameId: string, questionId: string) {
  const counts = { a: 0, b: 0, c: 0, d: 0 };
  const { data } = await admin.from("live_quiz_answers").select("choice_id").eq("game_id", gameId).eq("question_id", questionId);
  for (const row of data ?? []) {
    const id = String(row.choice_id);
    if (id === "a" || id === "b" || id === "c" || id === "d") counts[id] += 1;
  }
  return counts;
}

export type PlayerPublicState = {
  gameId: string;
  status: string;
  pin: string;
  title: string;
  locale: QuizLocale;
  serverNow: string;
  answered: number;
  totalPlayers: number;
  question: PublicQuestion | null;
  endsAt: string | null;
  remainingMs: number;
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

export async function playerState(token: string): Promise<PlayerPublicState | { error: string }> {
  const admin = db();
  if (!admin) return { error: "Unavailable" };
  const { data: player } = await admin
    .from("live_quiz_players")
    .select("id, game_id, display_name, score, locale")
    .eq("token_hash", hashQuizPlayerToken(token))
    .maybeSingle();
  if (!player) return { error: "Join the game again" };
  const locale = parseQuizLocale(player.locale);
  const game = await closeQuestionIfDue(String(player.game_id));
  if (!game) return { error: "Game not found" };
  const questions = await loadQuestions(admin, game.quiz_id);
  const { data: quiz } = await admin.from("quizzes").select("title").eq("id", game.quiz_id).maybeSingle();
  const { data: roster } = await admin.from("live_quiz_roster").select("player_id, display_name, score").eq("game_id", game.id).order("score", { ascending: false });
  const question = questions[game.current_index] ?? null;
  const revealed = answerKeyIsPublic(game.status);
  const showQuestion = Boolean(question && (isQuestionOpen(game.status) || game.status === "reveal"));
  const ranked = (roster ?? []).map((row) => ({ id: String(row.player_id), name: String(row.display_name), score: Number(row.score) }));
  const rank = ranked.findIndex((row) => row.id === String(player.id)) + 1 || null;
  let answered = false;
  let choiceId: "a" | "b" | "c" | "d" | null = null;
  let lastPoints: number | null = null;
  let lastCorrect: boolean | null = null;
  let yourReaction: QuizReaction | null = null;
  let reactionCounts = emptyReactionCounts();
  if (question) {
    const { data: mine } = await admin
      .from("live_quiz_answers")
      .select("points, is_correct, choice_id")
      .eq("game_id", game.id)
      .eq("player_id", player.id)
      .eq("question_id", question.id)
      .maybeSingle();
    answered = Boolean(mine);
    if (mine && (mine.choice_id === "a" || mine.choice_id === "b" || mine.choice_id === "c" || mine.choice_id === "d")) {
      choiceId = mine.choice_id;
    }
    if (revealed && mine) {
      lastPoints = Number(mine.points);
      lastCorrect = Boolean(mine.is_correct);
    }
    if (revealed) {
      reactionCounts = await loadReactionCounts(admin, game.id, question.id);
      const { data: reactionRow } = await admin
        .from("live_quiz_reactions")
        .select("reaction")
        .eq("player_id", player.id)
        .eq("question_id", question.id)
        .maybeSingle();
      yourReaction = parseQuizReaction(reactionRow?.reaction);
    }
  }
  let answeredCount = 0;
  if (question && (isQuestionOpen(game.status) || game.status === "waiting_reveal" || game.status === "reveal" || game.status === "leaderboard")) {
    const { count } = await admin
      .from("live_quiz_answers")
      .select("id", { count: "exact", head: true })
      .eq("game_id", game.id)
      .eq("question_id", question.id);
    answeredCount = count ?? 0;
  }
  const showBoard = game.status === "leaderboard" || game.status === "finished";
  const localized = question ? localizeQuestion(question, locale) : null;
  const payload = showQuestion && localized
    ? publicQuestionPayload(localized, {
        index: game.current_index + 1,
        total: questions.length,
        revealed: answerKeyIsPublic(game.status),
      })
    : null;
  const serverNow = new Date();
  const state: PlayerPublicState = {
    gameId: game.id,
    status: game.status,
    pin: game.pin,
    title: String(quiz?.title ?? SEEDED_QUIZ_TITLE),
    locale,
    serverNow: serverNow.toISOString(),
    answered: answeredCount,
    totalPlayers: ranked.length,
    question: payload && !answerKeyIsPublic(game.status) ? stripAnswerKey(payload) : payload,
    endsAt: game.question_ends_at,
    remainingMs: remainingFromEndsAt(game.question_ends_at, serverNow.getTime()),
    currentQuestionIndex: game.current_index,
    you: {
      id: String(player.id),
      name: String(player.display_name),
      score: Number(player.score),
      rank,
      answered,
      choiceId,
      lastPoints,
      lastCorrect,
      reaction: yourReaction,
    },
    reactionCounts: revealed ? reactionCounts : emptyReactionCounts(),
    leaderboard: showBoard
      ? { rank: rank ?? ranked.length, score: Number(player.score), top: ranked.slice(0, 5).map(({ name, score }) => ({ name, score })) }
      : null,
    finished: game.status === "finished",
  };
  if (!answerKeyIsPublic(state.status)) {
    state.you.lastPoints = null;
    state.you.lastCorrect = null;
    state.you.reaction = null;
  }
  return state;
}

export async function submitAnswer(
  token: string,
  choiceId: "a" | "b" | "c" | "d",
): Promise<{ ok: true } | { error: string }> {
  const admin = db();
  if (!admin) return { error: "Unavailable" };
  const { data: player } = await admin
    .from("live_quiz_players")
    .select("id, game_id")
    .eq("token_hash", hashQuizPlayerToken(token))
    .maybeSingle();
  if (!player) return { error: "Join the game again" };
  const game = await closeQuestionIfDue(String(player.game_id));
  if (!game) return { error: "Game not found" };
  if (!playerMayAnswer(game.status)) return { error: "Wait for the next question" };
  const questions = await loadQuestions(admin, game.quiz_id);
  const question = questions[game.current_index];
  if (!question) return { error: "Missing question" };
  const elapsedMs = serverElapsedMs(game.question_started_at, Date.now(), QUIZ_QUESTION_SECONDS * 1000);
  const correct = choiceId === question.correctId;
  const points = scoreAnswer({ correct, elapsedMs, limitMs: QUIZ_QUESTION_SECONDS * 1000 });
  const { error } = await admin.from("live_quiz_answers").insert({
    game_id: game.id,
    player_id: player.id,
    question_id: question.id,
    choice_id: choiceId,
    elapsed_ms: elapsedMs,
    is_correct: correct,
    points,
  });
  if (error) return { error: "You already answered" };
  return { ok: true };
}

export async function submitReaction(token: string, reactionRaw: unknown): Promise<{ ok: true } | { error: string }> {
  const admin = db();
  if (!admin) return { error: "Unavailable" };
  const reaction = parseQuizReaction(reactionRaw);
  if (!reaction) return { error: "Pick a reaction" };
  const { data: player } = await admin
    .from("live_quiz_players")
    .select("id, game_id")
    .eq("token_hash", hashQuizPlayerToken(token))
    .maybeSingle();
  if (!player) return { error: "Join the game again" };
  const game = await closeQuestionIfDue(String(player.game_id));
  if (!game) return { error: "Game not found" };
  if (!playerMayReact(game.status)) {
    return { error: "Wait until the answer is revealed" };
  }
  const questions = await loadQuestions(admin, game.quiz_id);
  const question = questions[game.current_index];
  if (!question) return { error: "Missing question" };
  const { error } = await admin.from("live_quiz_reactions").insert({
    game_id: game.id,
    question_id: question.id,
    player_id: player.id,
    reaction,
  });
  if (error) return { error: "You already reacted" };
  return { ok: true };
}

export async function hostGameState(gameId: string) {
  const admin = db();
  if (!admin) return null;
  const game = await closeQuestionIfDue(gameId);
  if (!game) return null;
  const questions = await loadQuestions(admin, game.quiz_id);
  const { data: quiz } = await admin.from("quizzes").select("title").eq("id", game.quiz_id).maybeSingle();
  const { data: roster } = await admin.from("live_quiz_roster").select("player_id, display_name, score").eq("game_id", game.id).order("score", { ascending: false });
  const question = questions[game.current_index] ?? null;
  const revealed = answerKeyIsPublic(game.status);
  let answeredCount = 0;
  let distribution = { a: 0, b: 0, c: 0, d: 0 };
  let reactionCounts = emptyReactionCounts();
  if (question) {
    const { count } = await admin
      .from("live_quiz_answers")
      .select("id", { count: "exact", head: true })
      .eq("game_id", game.id)
      .eq("question_id", question.id);
    answeredCount = count ?? 0;
    if (revealed) {
      distribution = await loadAnswerDistribution(admin, game.id, question.id);
      reactionCounts = await loadReactionCounts(admin, game.id, question.id);
    }
  }
  const players = (roster ?? []).map((row) => ({ id: String(row.player_id), name: String(row.display_name), score: Number(row.score) }));
  const english = question ? localizeQuestion(question, "en") : null;
  const estonian = question ? localizeQuestion(question, "et") : null;
  const live = game.status !== "lobby";
  const serverNow = new Date();
  return {
    gameId: game.id,
    pin: game.pin,
    status: game.status,
    title: String(quiz?.title ?? ""),
    serverNow: serverNow.toISOString(),
    currentIndex: game.current_index,
    currentQuestionIndex: game.current_index,
    total: questions.length,
    questionId: question?.id ?? null,
    prompt: live ? english?.prompt ?? null : null,
    promptEn: live ? english?.prompt ?? null : null,
    promptEt: live ? estonian?.prompt ?? null : null,
    choices: revealed && english ? english.choices : [],
    choicesEn: revealed && english ? english.choices : [],
    choicesEt: revealed && estonian ? estonian.choices : [],
    correctId: revealed && question ? question.correctId : null,
    explanation: revealed && english ? english.explanation : null,
    explanationEn: revealed && english ? english.explanation : null,
    explanationEt: revealed && estonian ? estonian.explanation : null,
    distribution: revealed ? distribution : null,
    reactionCounts: revealed ? reactionCounts : emptyReactionCounts(),
    endsAt: game.question_ends_at,
    remainingMs: remainingFromEndsAt(game.question_ends_at, serverNow.getTime()),
    answered: answeredCount,
    players,
    top5: players.slice(0, 5),
    finished: game.status === "finished",
  };
}
