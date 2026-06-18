/** Collapses whitespace and title-cases each word (e.g. "kush  chadha" → "Kush Chadha"). */
export function normalizeFullName(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toLocaleUpperCase() + word.slice(1).toLocaleLowerCase())
    .join(" ");
}
