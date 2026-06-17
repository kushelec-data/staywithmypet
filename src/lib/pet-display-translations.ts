import type { Locale } from "@/i18n/translations";

type Pair = readonly [en: string, et: string];

/** Stored enum-like pet values and card/profile display strings (EN → ET). */
const PET_DISPLAY_PAIRS: Pair[] = [
  ["Needs medication", "Vajab ravimeid"],
  ["Short walks", "Lühikesed jalutuskäigud"],
  ["Long walks", "Pikad jalutuskäigud"],
  ["High activity", "Kõrge aktiivsus"],
  ["Outdoor play", "Õues mängimine"],
  ["dog", "koer"],
  ["cat", "kass"],
  ["rabbit", "jänes"],
  ["bird", "lind"],
  ["rodent", "näriline"],
  ["fish", "kala"],
  ["reptile", "roomaja"],
  ["other", "muu"],
  ["Tallinn area", "Tallinna piirkond"],
  ["Near city center", "Linna centre lähedal"],
  ["Newborn", "Vastsündinu"],
];

const PET_DISPLAY_LOOKUP = new Map<string, string>(
  PET_DISPLAY_PAIRS.map(([en, et]) => [en.trim().toLowerCase(), et]),
);

export function getPetDisplayLabelEt(text: string | null | undefined): string | undefined {
  if (!text?.trim()) return undefined;
  return PET_DISPLAY_LOOKUP.get(text.trim().toLowerCase());
}

const AGE_PATTERNS: { match: RegExp; format: (n: number) => string }[] = [
  { match: /^(\d+)\s+years?\s+old$/i, format: (n) => `${n} aastat vana` },
  { match: /^(\d+)\s+months?\s+old$/i, format: (n) => `${n} kuud vana` },
  { match: /^(\d+)\s+weeks?\s+old$/i, format: (n) => `${n} nädalat vana` },
  { match: /^(\d+)\s+days?\s+old$/i, format: (n) => `${n} päeva vana` },
];

/** Translate a pre-formatted English age label (e.g. from age_label column). */
export function translatePetAgeLabel(text: string | null | undefined, locale: Locale): string {
  if (!text?.trim()) return "";
  const trimmed = text.trim();
  if (locale !== "et") return trimmed;
  for (const { match, format } of AGE_PATTERNS) {
    const m = trimmed.match(match);
    if (m) return format(Number(m[1]));
  }
  return getPetDisplayLabelEt(trimmed) ?? trimmed;
}

/** Species keys and English labels → localized display (cards use lowercase ET). */
export function translatePetSpecies(species: string | null | undefined, locale: Locale): string {
  if (!species?.trim()) return "";
  const trimmed = species.trim();
  if (locale !== "et") {
    if (trimmed === "other") return "other";
    return trimmed.toLowerCase();
  }
  return getPetDisplayLabelEt(trimmed) ?? trimmed.toLowerCase();
}

/** Public area labels from formatNearbyLocation (e.g. "Tallinn area"). */
export function translatePetLocationArea(text: string | null | undefined, locale: Locale): string {
  if (!text?.trim()) return "";
  const trimmed = text.trim();
  if (locale !== "et") return trimmed;
  const direct = getPetDisplayLabelEt(trimmed);
  if (direct) return direct;
  const areaMatch = trimmed.match(/^(.+)\s+area$/i);
  if (areaMatch) {
    const place = areaMatch[1]!.trim();
    const placeEt = getPetDisplayLabelEt(`${place} area`) ?? `${place} piirkond`;
    return placeEt;
  }
  return trimmed;
}

/** Translate stored pet preference / display values by locale. */
export function translatePetDisplayLabel(text: string | null | undefined, locale: Locale): string {
  if (!text?.trim()) return "";
  const trimmed = text.trim();
  if (locale !== "et") return trimmed;
  const age = translatePetAgeLabel(trimmed, locale);
  if (age !== trimmed) return age;
  const location = translatePetLocationArea(trimmed, locale);
  if (location !== trimmed) return location;
  return getPetDisplayLabelEt(trimmed) ?? trimmed;
}
