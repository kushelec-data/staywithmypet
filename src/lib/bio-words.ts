export const BIO_WORD_MIN = 20;
export const BIO_WORD_MAX = 250;
/** Amber “excellent” tier from this count through max. */
export const BIO_WORD_EXCELLENT_MIN = 100;

export type BioWordStatus = "empty" | "too_few" | "good" | "excellent" | "too_many";

export function getWordCount(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/** @deprecated Use `getWordCount` — kept for existing imports. */
export function countBioWords(text: string): number {
  return getWordCount(text);
}

export function bioWordStatus(count: number): BioWordStatus {
  if (count === 0) return "empty";
  if (count > BIO_WORD_MAX) return "too_many";
  if (count < BIO_WORD_MIN) return "too_few";
  if (count >= BIO_WORD_EXCELLENT_MIN) return "excellent";
  return "good";
}

export function isBioWordCountValid(count: number): boolean {
  return count >= BIO_WORD_MIN && count <= BIO_WORD_MAX;
}

/** Tailwind class for live bio word counter (<20 red, 20–99 green, 100+ amber; over max red). */
export function bioCounterClass(wordCount: number): string {
  if (wordCount > BIO_WORD_MAX || wordCount < BIO_WORD_MIN) {
    return "text-red-500";
  }
  if (wordCount < BIO_WORD_EXCELLENT_MIN) {
    return "text-green-600";
  }
  return "text-amber-600";
}

/** @deprecated Use `bioCounterClass(wordCount)` for counter styling. */
export function bioCounterTextClass(status: BioWordStatus): string {
  switch (status) {
    case "too_few":
    case "empty":
    case "too_many":
      return "text-red-500";
    case "good":
      return "text-green-600";
    case "excellent":
      return "text-amber-600";
    default:
      return "text-muted";
  }
}

/** Keeps at most `maxWords` words; trims leading/trailing space on the result. */
export function truncateBioToMaxWords(text: string, maxWords = BIO_WORD_MAX): string {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= maxWords) return text;
  return parts.slice(0, maxWords).join(" ");
}

/** Normalize stored bio: trim and single spaces between words. */
export function normalizeBioForSave(text: string): string {
  return text.trim().split(/\s+/).filter(Boolean).join(" ");
}
