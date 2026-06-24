/**
 * Formats a person's full or display name for storage and UI.
 *
 * @example
 * formatPersonName("hanna-betta tamm") // "Hanna-Betta Tamm"
 * formatPersonName("HANNA-BETTA TAMM") // "Hanna-Betta Tamm"
 * formatPersonName("hanna - betta tamm") // "Hanna-Betta Tamm"
 * formatPersonName("kush chadha") // "Kush Chadha"
 * formatPersonName("anna-maria saar") // "Anna-Maria Saar"
 */
export function formatPersonName(value: string): string {
  const collapsed = value.trim().replace(/\s+/g, " ");
  if (!collapsed) return "";

  const normalizedHyphens = collapsed.replace(/\s*-\s*/g, "-");

  return normalizedHyphens
    .split(" ")
    .filter(Boolean)
    .map(formatNamePart)
    .join(" ");
}

function formatNamePart(part: string): string {
  return part
    .split("-")
    .filter(Boolean)
    .map(formatNameSegment)
    .join("-");
}

function formatNameSegment(segment: string): string {
  const lower = segment.toLocaleLowerCase();
  if (!lower) return "";
  return lower.charAt(0).toLocaleUpperCase() + lower.slice(1);
}

/** @alias formatPersonName — used by signup and profile name fields. */
export function normalizeFullName(value: string): string {
  return formatPersonName(value);
}
