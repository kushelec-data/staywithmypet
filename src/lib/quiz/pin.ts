export function normalizeGamePin(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 6) return null;
  return digits;
}

export function isExactSixDigitPin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

export function generateGamePin(taken: Iterable<string>): string {
  const used = new Set([...taken].map((pin) => pin.replace(/\D/g, "")));
  for (let i = 0; i < 80; i += 1) {
    const pin = String(100000 + Math.floor(Math.random() * 900000));
    if (!used.has(pin) && isExactSixDigitPin(pin)) return pin;
  }
  throw new Error("Could not generate a free game PIN");
}

export function liveGameStartPayload(row: { id: string; pin: string; status?: string }) {
  const pin = normalizeGamePin(row.pin);
  if (!pin || !isExactSixDigitPin(pin)) {
    return { error: "Live game was created without a valid 6-digit PIN" };
  }
  const id = String(row.id);
  return {
    id,
    gameId: id,
    pin,
    status: row.status || "lobby",
  };
}

export function pinIsPlayable(status: string): boolean {
  return (
    status === "lobby" ||
    status === "question" ||
    status === "question_open" ||
    status === "waiting_reveal" ||
    status === "reveal" ||
    status === "leaderboard"
  );
}

export function formatDisplayPin(pin: string): string {
  const digits = pin.replace(/\D/g, "").slice(0, 6);
  if (digits.length !== 6) return digits;
  return `${digits.slice(0, 3)} ${digits.slice(3)}`;
}

export const QUIZ_PUBLIC_JOIN_HOST = "staywithmypet.ee/quiz";
export const ADMIN_QUIZ_HOST_PREFIX = "/admin/quiz/host";

export function adminQuizHostHref(gameId: string): string {
  return `${ADMIN_QUIZ_HOST_PREFIX}/${gameId}`;
}

export const HOST_PIN_STORAGE_PREFIX = "swmp_host_pin:";

export function hostPinStorageKey(gameId: string): string {
  return `${HOST_PIN_STORAGE_PREFIX}${gameId}`;
}

export const QUIZ_REACTIONS = ["love", "wow", "funny", "angry"] as const;
export type QuizReaction = (typeof QUIZ_REACTIONS)[number];

export function parseQuizReaction(value: unknown): QuizReaction | null {
  if (value === "love" || value === "wow" || value === "funny" || value === "angry") return value;
  return null;
}

export function emptyReactionCounts(): Record<QuizReaction, number> {
  return { love: 0, wow: 0, funny: 0, angry: 0 };
}

export function normalizeDisplayName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 24) return null;
  return name;
}

export function displayNamesClash(existing: string[], candidate: string): boolean {
  const target = candidate.trim().toLowerCase();
  return existing.some((name) => name.trim().toLowerCase() === target);
}
