import { formatAvailableLabel, formatDateListShort } from "@/lib/date-format";

/** ISO YYYY-MM-DD in local calendar (no UTC shift). */
export function localISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODateLocal(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
  return dt;
}

export function eachISODateInRangeInclusive(a: string, b: string): string[] {
  const da = parseISODateLocal(a);
  const db = parseISODateLocal(b);
  if (!da || !db) return [];
  let start = da;
  let end = db;
  if (start > end) [start, end] = [end, start];
  const out: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(localISODate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function mergeUniqueSortedDates(existing: string[], add: string[]): string[] {
  return [...new Set([...existing, ...add])].sort();
}

export function normalizeAvailabilityDates(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is string => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x.trim()))
    .map((x) => x.trim())
    .sort();
}

/** Short label for cards (dates + optional notes). */
export function formatPetAvailabilitySummary(
  dates: string[] | null | undefined,
  notes: string | null | undefined,
  maxDates = 4,
  locale?: string,
): string | null {
  const d = normalizeAvailabilityDates(dates ?? []);
  const n = notes?.trim();
  const parts: string[] = [];
  if (d.length) {
    const available =
      formatAvailableLabel(d, locale) ??
      (() => {
        const list = formatDateListShort(d, { locale, maxShown: maxDates });
        return list ? `Available: ${list}` : null;
      })();
    if (available) parts.push(available);
  }
  if (n) parts.push(n);
  return parts.length ? parts.join(" · ") : null;
}
