export const BIO_WORD_MIN = 20;
export const BIO_WORD_MAX = 250;
/** Orange counter from this count through one below `BIO_WORD_GOOD_MIN`. */
export const BIO_WORD_ORANGE_MIN = 20;
export const BIO_WORD_GOOD_MIN = 50;

export type BioWordStatus = "empty" | "too_few" | "building" | "good" | "too_many";

/** Count words after trimming; collapses whitespace between words. */
export function countBioWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function bioWordStatus(count: number): BioWordStatus {
  if (count === 0) return "empty";
  if (count > BIO_WORD_MAX) return "too_many";
  if (count < BIO_WORD_MIN) return "too_few";
  if (count < BIO_WORD_GOOD_MIN) return "building";
  return "good";
}

export function isBioWordCountValid(count: number): boolean {
  return count >= BIO_WORD_MIN && count <= BIO_WORD_MAX;
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

export function bioCounterTextClass(status: BioWordStatus): string {
  switch (status) {
    case "too_few":
    case "empty":
    case "too_many":
      return "text-brand-pink";
    case "building":
      return "text-orange-600";
    case "good":
      return "text-brand-teal";
    default:
      return "text-muted";
  }
}
