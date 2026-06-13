/**
 * Regenerates site text modules from EST and ENG texts.xlsx
 * Run: node scripts/sync-site-texts.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const xlsxPath = path.join(root, "EST and ENG texts.xlsx");
const outSiteTexts = path.join(root, "src/lib/site-texts.ts");
const outEn = path.join(root, "src/i18n/generated/site-en.ts");
const outEt = path.join(root, "src/i18n/generated/site-et.ts");
const outMissing = path.join(root, "src/i18n/generated/site-missing-translations.json");
const zipPath = path.join(root, ".site-texts-sync.zip");
const extractDir = path.join(root, ".site-texts-sync");

const SKIP_PATTERNS = [
  /^ENG$/i,
  /^EST$/i,
  /^English$/i,
  /^Estonian$/i,
  /^Comment$/i,
  /^Kommentaar$/i,
  /vaja kohendada/i,
  /^Seda ma ei lisanud/i,
  /^Ingliskeelset teksti on vaja/i,
  /^O$/,
  /^\[DD Month/i,
  /^\[PP kuu/i,
  /^ENG \(/i,
];

function esc(s) {
  return JSON.stringify(s);
}

function shouldSkip(text) {
  const t = (text ?? "").trim();
  if (!t || t.length < 2) return true;
  return SKIP_PATTERNS.some((p) => p.test(t));
}

function parseSharedStrings(xml) {
  const strings = [];
  const re = /<si>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = re.exec(xml))) {
    const texts = [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) =>
      x[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&apos;/g, "'")
        .replace(/&quot;/g, '"'),
    );
    strings.push(texts.join(""));
  }
  return strings;
}

function col(s) {
  let n = 0;
  for (const c of s) n = n * 26 + (c.charCodeAt(0) - 64);
  return n;
}

function parseSheet(xml, strings) {
  const rows = {};
  const rowRe = /<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  let rm;
  while ((rm = rowRe.exec(xml))) {
    const r = +rm[1];
    rows[r] = {};
    const cellRe = /<c r="([A-Z]+)(\d+)"([^>]*)>([\s\S]*?)<\/c>/g;
    let cm;
    while ((cm = cellRe.exec(rm[2]))) {
      const cell = cm[3] + cm[4];
      let val = "";
      if (cell.match(/t="s"/)) {
        const v = cell.match(/<v>(\d+)<\/v>/);
        val = v ? strings[+v[1]] : "";
      } else if (cell.match(/t="inlineStr"/)) {
        const is = cell.match(/<t[^>]*>([\s\S]*?)<\/t>/);
        val = is ? is[1] : "";
      } else {
        const v = cell.match(/<v>([^<]*)<\/v>/);
        val = v ? v[1] : "";
      }
      rows[r][col(cm[1])] = val;
    }
  }
  return rows;
}

function getCell(rows, r, c) {
  return (rows[r]?.[c] ?? "").trim();
}

/** User-approved navbar ET (not in Header and footer Excel rows). */
const NAVBAR_ET = {
  findCare: "Leia hoidja",
  findPets: "Leia lemmikloom",
  findPetFriends: "Leia hoidjad",
  searchPets: "Otsi lemmikloomi",
  pricing: "Hinnad",
  faq: "KKK",
  login: "Logi sisse",
  getStarted: "Registreeru",
};

/** Short footer / legal-page titles — never use legal document body paragraphs. */
const FOOTER_LEGAL = {
  en: {
    terms: "Terms of Use",
    privacy: "Privacy Policy",
    safety: "Safety Guidelines",
  },
  et: {
    terms: "Kasutustingimused",
    privacy: "Privaatsuspoliitika",
    safety: "Ohutusjuhised",
  },
};

/** Read footer legal link labels from Header and footer sheet (col A = EN, col C = ET). */
function extractFooterLegalLabels(rows) {
  const out = { en: {}, et: {} };
  for (let r = 1; r <= 60; r++) {
    const en = getCell(rows, r, 0) || getCell(rows, r, 2);
    const et = getCell(rows, r, 2) || getCell(rows, r, 4);
    if (!en || !et || en.length > 60 || et.length > 60) continue;
    if (/^terms of (use|service)$/i.test(en)) {
      out.en.terms = FOOTER_LEGAL.en.terms;
      out.et.terms = FOOTER_LEGAL.et.terms;
    } else if (/^privacy policy$/i.test(en)) {
      out.en.privacy = FOOTER_LEGAL.en.privacy;
      out.et.privacy = FOOTER_LEGAL.et.privacy;
    } else if (/^safety guidelines?$/i.test(en)) {
      out.en.safety = FOOTER_LEGAL.en.safety;
      out.et.safety = FOOTER_LEGAL.et.safety;
    }
  }
  return out;
}

const HOW_IT_WORKS_SUBTITLE_EN = "A step-by-step guide to sharing love and care";

const CORE_VALUES_EN_PREFIX = "At Stay With My Pet, our core values guide every decision";

const CORE_VALUES_ET =
  "Stay With My Pet'i põhiväärtused juhivad iga otsust ja iga ühendust meie kogukonnas. Kõik algab armastusest ja kaastundest — lemmikloomade, inimeste ja nende vaheliste sidemete vastu. Seame esikohale turvalisuse, läbipaistvuse ja vastutustundliku hoolduse, sest iga profiil ja iga usalduslik ühendus on oluline. Usume kogukonna jõusse — sõprussideme loomisse, vastastikusesse toetusse ja austusse nii loomade vajaduste kui inimeste piiride vastu. Südames on rõõm ja heaolu — sest jagatud hetk lemmikuga võib päeva säravamaks muuta, sidemeid tugevdada ja ellu rohkem soojust tuua.";

const ET_VOCAB =
  /\b(kuidas|konto|profiil|profiilide|profiilipilt|lemmik|loom|looma|broneering|liikmelisus|sirvimine|loomine|teenuse|teenusepakkujatega|kasutaja|andmed|suhtlus|tagasiside|jagamine|saadavus|hoid|nõusolek|küpsised|õigus|juhised|kinnitused|tühistamine|pikendamine|makse|tellimus|lepingu|õigustatud|huvi|kohustus|turvalisus|õiguslik|valikuline|või|ning|kui|kõik|mida|tead|pea|anna|võta|hoia|tead|sinu|sinu)\b/i;

const LEGAL_ET_FALLBACKS = {
  "If you do not agree, you must not use the Service.":
    "Kui te ei nõustu, ärge teenust kasutage.",
  "Under the GDPR and Estonian Personal Data Protection Act, you have the following rights:":
    "GDPR-i ja Eesti isikuandmete kaitse seaduse kohaselt on teil järgmised õigused:",
  "Access – to request a copy of your personal data.":
    "Juurdepääs – taotleda oma isikuandmete koopiat.",
  "Rectification – to correct inaccurate or incomplete data.":
    "Parandamine – nõuda ebatäpsete või puudulike andmete korrigeerimist.",
  "Restriction – to limit how your data is processed in specific situations.":
    "Töötlemise piiramine – piirata andmete töötlemist teatud olukordades.",
  "Portability – to receive your data in a structured, machine-readable format.":
    "Andmete ülekantavus – saada oma andmed struktureeritud, masinloetavas vormingus.",
  "Objection – to object to processing based on legitimate interests, including direct marketing.":
    "Vastuväide – esitada vastuväide õigustatud huvil põhinevale töötlemisele, sh otseturundusele.",
  "Withdraw consent – at any time where processing is based on consent.":
    "Nõusoleku tagasivõtmine – igal ajal, kui töötlemine põhineb nõusolekul.",
  "Erasure (“Right to be Forgotten”) – to request deletion of data when legally possible.":
    "Kustutamine („õigus olla unustatud“) – taotleda andmete kustutamist, kui see on seaduslikult võimalik.",
  "Performance of a contract":
    "Lepingu täitmine",
  "Performance of a contract / Legal obligation":
    "Lepingu täitmine / õiguslik kohustus",
  "Legitimate interest / Legal obligation":
    "Õigustatud huvi / õiguslik kohustus",
  "Legitimate interest":
    "Õigustatud huvi",
  Consent: "Nõusolek",
  "Legal obligation": "Õiguslik kohustus",
  "Legal Basis": "Õiguslik alus",
  Purpose: "Eesmärk",
};

function normalizeKey(text) {
  return (text ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .slice(0, 200)
    .toLowerCase();
}

function isClearlyEstonian(text) {
  const t = (text ?? "").trim();
  if (!t || shouldSkip(t)) return false;
  if (/[õäüöÕÄÜÖ]/.test(t)) return true;
  if (/^Stay With My Pet on /i.test(t)) return true;
  if (
    /^(Jõustumiskuupäev|Käesolevad|Teie privaatsus|Teenuses registreerudes|Andmetöötleja|Kontaktandmed|Registrijärgne|E-post:|Telefon:|Kui teil|Milliseid andmeid|Kogume ja|Privaatsus|Küpsised|Kasutame|Küpsiste tüübid|Tarbijateade|Ärinimi|Registrikood|Loomaomanik|Loomasõber|Broneering|Liikmelisus|Ühekordne|Mõisted|Kasutaja |Ohutus ei|Üldpõhimõtted|Loomaomanikule|Selgus ja|Täida oma|Sinu lemmiku|kirjeldanud|jaganud|välja toonud|maininud|Mida täpsem|Lepi detailid|Enne hoiu|Selged kokkulepped|kui miski|kui olete tarbija|Iga sobivus|Keskendume tasakaalule|Lühikestest külastustest|Koerad, kassid|ees-|e-posti|telefoninumber|profiilifoto|konto |profiil|kuidas |mida |kui:|kui |teenusepakkujatega)/i.test(
      t,
    )
  ) {
    return true;
  }
  if (
    /^\d+\.\s/.test(t) &&
    /\b(Platvormi|Kasutajate|Kohustused|Intellektuaal|Tagasimaksed|Privaatsus|Loomade|ettevõtte|Mõisted|roll|andmete|andmeid|kogume|Milliseid|Puuduvad|Automaatne|Digiteenuse|Kasutajasisu|Vastutuse|jagamine|säilitamine|õigused|küpsised|turvalisus|töötleja)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  if (ET_VOCAB.test(t) && !/\b(the|and|your|our|we|shall|must|unless|whether|including|between|through|provide|agree|service|users|platform)\b/i.test(t)) {
    return true;
  }
  if (/\b(ja |või |ning |kui |ei |on |see |teie |meie |sh:)\b/i.test(t) && !/\b(the|and|your|our|we|for|with|this|have|will)\b/i.test(t)) {
    return true;
  }
  return false;
}

function isClearlyEnglish(text) {
  const t = (text ?? "").trim();
  if (!t || shouldSkip(t) || isClearlyEstonian(t)) return false;
  if (/^Stay With My Pet is /i.test(t)) return true;
  if (
    /\b(the|and|your|our|we|this|you|shall|must|may|not|are|have|will|can|with|for|from|that|when|where|what|how|who|which|unless|whether|including|between|through|provide|agree|users|platform|service)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  if (/^\d+\.\s/.test(t) && /\b(Information|Controller|Platform|Membership|Responsibilities|Privacy|Intellectual|Refund|Safety|Cookies|Rights|Company|Definitions|Role|Guidelines|Policy|Terms|Processing|Sharing|Retention|Security|Transfers)\b/i.test(t)) {
    return true;
  }
  if (/^[A-Za-z0-9"'(]/.test(t)) return true;
  return false;
}

function classifyLanguage(text) {
  const t = (text ?? "").trim();
  if (!t || shouldSkip(t)) return null;
  if (isClearlyEstonian(t)) return "et";
  if (isClearlyEnglish(t)) return "en";
  return null;
}

const ABOUT_ET_PHRASES = {
  "About us": "Meist",
  "1. Love & Compassion": "1. Hoolivus ja empaatia",
  "Love & Compassion": "Hoolivus ja empaatia",
  "Everything we do starts with love — for pets, for people, and for the connections between them.":
    "Kõik, mida teeme, algab armastusest — lemmikloomade, inimeste ja nende vaheliste sidemete vastu.",
  "2. Trust & Safety": "2. Usaldus ja turvalisus",
  "Trust & Safety": "Usaldus ja turvalisus",
  "We prioritise safety, transparency, and responsible care. Every profile and connection matters, and we work hard to keep our community secure.":
    "Seame esikohale turvalisuse, läbipaistvuse ja vastutustundliku hoolduse. Iga profiil ja ühendus on oluline ning teeme tööd, et hoida kogukonda turvalisena.",
  "3. Community & Connection": "3. Kogukond ja ühendus",
  "Community & Connection": "Kogukond ja ühendus",
  "We believe in togetherness — building friendships, helping one another, and creating a circle of kindness around every pet.":
    "Usume kogukonna jõusse — sõprussideme loomisse, vastastikusesse toetusse ja lahkuse ringi loomisse iga lemmiku ümber.",
  "4. Responsibility & Respect": "4. Vastutus ja lugupidamine",
  "Responsibility & Respect": "Vastutus ja lugupidamine",
  "We encourage mindful, responsible sharing that respects both animals' needs and people's boundaries.":
    "Julgustame teadlikku ja vastutustundlikku jagamist, mis austab nii loomade vajadusi kui inimeste piire.",
  "We encourage mindful, responsible sharing that respects both animals’ needs and people’s boundaries.":
    "Julgustame teadlikku ja vastutustundlikku jagamist, mis austab nii loomade vajadusi kui inimeste piire.",
  "5. Joy & Wellbeing": "5. Rõõm ja heaolu",
  "Joy & Wellbeing": "Rõõm ja heaolu",
  "Happiness is contagious — especially when shared with a pet. Our goal is to spread joy, one shared moment at a time.":
    "Õnn on nakkav — eriti siis, kui seda jagada lemmikuga. Meie eesmärk on levitada rõõmu, üks jagatud hetk korraga.",
  "We've lived it ourselves.": "Oleme seda ise kogenud.",
  "We’ve lived it ourselves.": "Oleme seda ise kogenud.",
  "*for cats and dogs": "*kehtib koertele ja kassidele",
};

function rowTexts(rows, r) {
  const parts = [];
  for (let c = 2; c <= 6; c++) {
    const text = getCell(rows, r, c);
    if (!text || shouldSkip(text)) continue;
    const lang = classifyLanguage(text);
    if (!lang) continue;
    parts.push({ c, text, lang });
  }
  return parts;
}

function resolveEt(en, et) {
  if (et && isClearlyEstonian(et)) return et;
  return LEGAL_ET_FALLBACKS[en] ?? null;
}

/** Pair EN in enCol with ET from same row, next row, or stacked column. */
function pairEnEtAtRow(rows, maxRow, r, enCol, etCol) {
  const en = getCell(rows, r, enCol);
  if (!en || !isClearlyEnglish(en)) return null;

  const etSame = getCell(rows, r, etCol);
  if (etSame && isClearlyEstonian(etSame)) return resolveEt(en, etSame);

  for (const c of [2, 3, 4, 5, 6]) {
    if (c === enCol) continue;
    const alt = getCell(rows, r, c);
    if (alt && isClearlyEstonian(alt)) return resolveEt(en, alt);
  }

  const etNext = getCell(rows, r + 1, etCol);
  if (etNext && isClearlyEstonian(etNext)) return resolveEt(en, etNext);

  for (const c of [2, 3, 4, 5, 6]) {
    const alt = getCell(rows, r + 1, c);
    if (alt && isClearlyEstonian(alt)) return resolveEt(en, alt);
  }

  const etStacked = getCell(rows, r + 1, enCol);
  if (etStacked && isClearlyEstonian(etStacked)) return resolveEt(en, etStacked);

  return resolveEt(en, null);
}

/** Build a lookup of every EN→ET pairing discoverable in a sheet. */
function buildMasterEtIndex(rows, maxRow, enCol, etCol) {
  const index = new Map();
  const put = (en, et) => {
    if (!en || !et || !isClearlyEnglish(en) || !isClearlyEstonian(et)) return;
    const key = normalizeKey(en);
    if (!index.has(key)) index.set(key, et);
  };

  for (let r = 1; r <= maxRow; r++) {
    for (let cEn = 2; cEn <= 6; cEn++) {
      const en = getCell(rows, r, cEn);
      if (!isClearlyEnglish(en)) continue;
      for (let cEt = 2; cEt <= 6; cEt++) {
        if (cEt === cEn) continue;
        put(en, getCell(rows, r, cEt));
      }
      put(en, pairEnEtAtRow(rows, maxRow, r, cEn, etCol));
      put(en, findEtInSheet(rows, maxRow, en));
    }
  }

  for (let r = 1; r < maxRow; r++) {
    for (let c = 2; c <= 6; c++) {
      const a = getCell(rows, r, c);
      const b = getCell(rows, r + 1, c);
      if (isClearlyEnglish(a) && isClearlyEstonian(b)) put(a, b);
      if (isClearlyEstonian(a) && isClearlyEnglish(b)) put(b, a);
    }
  }

  const enHeaders = new Map();
  const etHeaders = new Map();
  for (let r = 1; r <= maxRow; r++) {
    for (let c = 2; c <= 6; c++) {
      const t = getCell(rows, r, c);
      const m = t.match(/^(\d+(?:\.\d+)?)\.\s+/);
      if (!m) continue;
      if (isClearlyEnglish(t)) enHeaders.set(m[1], t);
      if (isClearlyEstonian(t)) etHeaders.set(m[1], t);
    }
  }
  for (const [num, en] of enHeaders) {
    const et = etHeaders.get(num);
    if (et) put(en, et);
  }

  return index;
}

function enrichPrivacyPurposeTable(index, rows) {
  const purposeEn = [];
  for (let r = 59; r <= 68; r++) {
    const en = getCell(rows, r, 2);
    if (en && isClearlyEnglish(en) && /^To /i.test(en)) purposeEn.push(en);
  }
  const purposeEt = [];
  for (let r = 83; r <= 102; r++) {
    for (const c of [2, 3, 4]) {
      const et = getCell(rows, r, c);
      if (et && isClearlyEstonian(et) && et.includes("–")) purposeEt.push(et);
    }
  }
  for (let i = 0; i < purposeEn.length && i < purposeEt.length; i++) {
    index.set(normalizeKey(purposeEn[i]), purposeEt[i]);
  }

  const basisPairs = [
    ["Performance of a contract", getCell(rows, 83, 3)],
    ["Performance of a contract / Legal obligation", getCell(rows, 86, 3)],
    ["Legitimate interest / Legal obligation", getCell(rows, 85, 2)],
    ["Legitimate interest", getCell(rows, 87, 3)],
    ["Consent", getCell(rows, 89, 3)],
    ["Legal obligation", getCell(rows, 91, 3)],
    [
      "We process your personal data for the following purposes:",
      getCell(rows, 82, 3),
    ],
    ["Service providers and processors, including:", getCell(rows, 120, 3)],
    ["payment processors;", getCell(rows, 122, 3)],
    ["hosting and IT infrastructure providers;", getCell(rows, 124, 3)],
    ["insurance and veterinary partners (if applicable).", getCell(rows, 126, 3)],
    ["7. Cookies and Similar Technologies", getCell(rows, 93, 2)],
    ["Types of cookies:", getCell(rows, 96, 3)],
    [
      "Essential cookies – required for platform functionality and security.",
      getCell(rows, 98, 3),
    ],
    [
      "Analytics cookies – help us understand usage patterns (only with your consent).",
      getCell(rows, 100, 3),
    ],
    [
      "Preference cookies – remember your settings or login status.",
      getCell(rows, 100, 3),
    ],
    [
      "You can manage or disable cookies through your browser settings. Consent-based cookies will only be set after you accept them.",
      getCell(rows, 102, 2),
    ],
    [
      "Access control and data minimisation;",
      getCell(rows, 107, 2),
    ],
    [
      "Regular system monitoring and security reviews;",
      getCell(rows, 108, 3),
    ],
    [
      "Limiting access to personal data to authorised personnel only.",
      getCell(rows, 110, 3),
    ],
    [
      "Users cannot earn money or receive financial compensation from each other through the Service.",
      getCell(rows, 110, 3),
    ],
    [
      "4. No Peer-to-Peer Payments or Earnings",
      getCell(rows, 104, 3),
    ],
    [
      "Stay With My Pet is a non-commercial connection platform between pet owners (“Pet Parents”) and animal lovers (“Pet Friends”).",
      getCell(rows, 106, 3),
    ],
    ["All payments are made to the platform, not between Users.", getCell(rows, 108, 3)],
  ];
  for (const [en, et] of basisPairs) {
    if (en && et && isClearlyEstonian(et)) index.set(normalizeKey(en), et);
  }
}

function buildSharedStringEtIndex(strings) {
  const index = new Map();
  for (let i = 0; i < strings.length - 1; i++) {
    const a = strings[i];
    const b = strings[i + 1];
    if (isClearlyEnglish(a) && isClearlyEstonian(b)) {
      index.set(normalizeKey(a), b);
    }
  }
  return index;
}

/**
 * Extract legal blocks in row order from the primary English column.
 */
function extractLegalBlocks(rows, maxRow, { enCol = 2, etCol = 3, titleEn = null } = {}) {
  const masterIndex = buildMasterEtIndex(rows, maxRow, enCol, etCol);
  const blocks = [];
  const seen = new Set();

  for (let r = 1; r <= maxRow; r++) {
    const en = getCell(rows, r, enCol);
    if (!en || shouldSkip(en) || !isClearlyEnglish(en)) continue;
    if (titleEn && normalizeKey(en) === normalizeKey(titleEn)) continue;

    const key = normalizeKey(en);
    if (seen.has(key)) continue;
    seen.add(key);

    const et =
      pairEnEtAtRow(rows, maxRow, r, enCol, etCol) ??
      masterIndex.get(key) ??
      LEGAL_ET_FALLBACKS[en] ??
      null;

    blocks.push({ en, et });
  }

  for (const block of blocks) {
    if (block.et) continue;
    const hit = masterIndex.get(normalizeKey(block.en));
    if (hit) block.et = hit;
    else if (LEGAL_ET_FALLBACKS[block.en]) block.et = LEGAL_ET_FALLBACKS[block.en];
  }

  return blocks;
}

function applyLegalEtIndex(blocks, ...indexes) {
  for (const block of blocks) {
    if (block.et) continue;
    for (const index of indexes) {
      const hit = index.get(normalizeKey(block.en));
      if (hit) {
        block.et = hit;
        break;
      }
    }
    if (!block.et && LEGAL_ET_FALLBACKS[block.en]) block.et = LEGAL_ET_FALLBACKS[block.en];
  }
}

function dedupeLegalBlocks(blocks) {
  const seen = new Set();
  return blocks.filter((b) => {
    if (!b.en || !isClearlyEnglish(b.en)) return false;
    const key = normalizeKey(b.en);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function findEtInSheet(rows, maxRow, enText) {
  const key = normalizeKey(enText);
  for (let r = 1; r <= maxRow; r++) {
    for (let c = 2; c <= 6; c++) {
      const cell = getCell(rows, r, c);
      if (cell && normalizeKey(cell) === key) {
        for (let c2 = 2; c2 <= 6; c2++) {
          if (c2 === c) continue;
          const other = getCell(rows, r, c2);
          if (other && classifyLanguage(other) === "et") return other;
        }
        const below = getCell(rows, r + 1, c);
        if (below && classifyLanguage(below) === "et") return below;
        const above = getCell(rows, r - 1, c);
        if (above && classifyLanguage(above) === "et") return above;
      }
    }
  }
  return null;
}

function pairRowTexts(rows, r) {
  const parts = rowTexts(rows, r);
  const en = parts.find((p) => p.lang === "en")?.text ?? null;
  let et = parts.find((p) => p.lang === "et")?.text ?? null;
  if (en && !et) {
    const next = rowTexts(rows, r + 1);
    const nextEt = next.find((p) => p.lang === "et");
    if (nextEt && !next.find((p) => p.lang === "en")) et = nextEt.text;
  }
  return { en, et };
}

function extractNavPairs(rows) {
  const pairs = [];
  for (let r = 3; r <= 12; r++) {
    const en = getCell(rows, r, 2);
    const et = getCell(rows, r, 4) || getCell(rows, r, 3);
    if (!en || shouldSkip(en) || en.length > 60) continue;
    if (et && !shouldSkip(et)) pairs.push([en, et]);
  }
  return pairs;
}

function parseFaq(rows) {
  const maxR = Math.max(...Object.keys(rows).map(Number), 0);
  const titleEn = getCell(rows, 2, 2) || "Frequently Asked Questions (FAQ)";
  const titleEt = getCell(rows, 2, 4) || null;
  const subtitleEn = getCell(rows, 4, 2) || "";
  const subtitleEt = getCell(rows, 4, 4) || null;

  const items = [];
  let currentQ = null;
  for (let r = 1; r <= maxR; r++) {
    const en = getCell(rows, r, 2);
    const et = getCell(rows, r, 4);
    if (!en || shouldSkip(en)) continue;
    const isQuestion =
      /^\d+\.\s/.test(en) ||
      (en.endsWith("?") && en.length < 120 && !en.includes("\n"));
    if (isQuestion) {
      if (currentQ) items.push(currentQ);
      currentQ = { questionEn: en.replace(/^\d+\.\s*/, ""), questionEt: et || null, answerEn: "", answerEt: null };
    } else if (currentQ && !currentQ.answerEn) {
      currentQ.answerEn = en;
      currentQ.answerEt = et || null;
    } else if (currentQ && currentQ.answerEn && en.length > 20) {
      currentQ.answerEn += "\n\n" + en;
      if (et) currentQ.answerEt = (currentQ.answerEt ? currentQ.answerEt + "\n\n" : "") + et;
    }
  }
  if (currentQ) items.push(currentQ);
  return { titleEn, titleEt, subtitleEn, subtitleEt, items };
}

function parseHowItWorks(rows) {
  const maxR = Math.max(...Object.keys(rows).map(Number), 0);
  const titleEt = getCell(rows, 1, 2);
  const titleEn = "How It Works";
  const subtitleEt = getCell(rows, 2, 2) || null;
  const subtitleEn = HOW_IT_WORKS_SUBTITLE_EN;
  const introEt = getCell(rows, 3, 2);
  const introEn =
    "Stay With My Pet makes connecting pet parents and pet friends simple, safe, and joyful.";

  const parentSteps = [];
  const friendSteps = [];
  for (let r = 1; r <= maxR; r++) {
    const stepNum = getCell(rows, r, 1);
    if (!/^\d/.test(stepNum)) continue;
    const parentTitleEt = getCell(rows, r, 2);
    const friendTitleEt = getCell(rows, r, 3);
    const parentTitleEn = getCell(rows, r, 5);
    const friendTitleEn = getCell(rows, r, 6);
    const parentBodyEt = getCell(rows, r + 1, 2);
    const friendBodyEt = getCell(rows, r + 1, 3);
    const parentBodyEn = getCell(rows, r + 1, 5);
    const friendBodyEn = getCell(rows, r + 1, 6);
    if (parentTitleEn || parentTitleEt) {
      parentSteps.push({
        titleEn: parentTitleEn || parentTitleEt,
        titleEt: parentTitleEt || null,
        bodyEn: parentBodyEn || parentBodyEt,
        bodyEt: parentBodyEt || null,
      });
    }
    if (friendTitleEn || friendTitleEt) {
      friendSteps.push({
        titleEn: friendTitleEn || friendTitleEt,
        titleEt: friendTitleEt || null,
        bodyEn: friendBodyEn || friendBodyEt,
        bodyEt: friendBodyEt || null,
      });
    }
  }
  return { titleEn, titleEt, subtitleEn, subtitleEt, introEn, introEt, parentSteps, friendSteps };
}

function parseOpeningPage(rows) {
  // Opening page layout: col A = English, col E = Estonian (cols B/F are alternates)
  const heroTitleEn = getCell(rows, 6, 1);
  const heroTitleEt = getCell(rows, 6, 5) || getCell(rows, 6, 2) || null;
  const heroSubtitleEn = getCell(rows, 7, 1);
  const heroSubtitleEt = getCell(rows, 7, 5) || getCell(rows, 7, 6) || null;
  const eyebrowEn = getCell(rows, 11, 1) || "ESTONIA'S FIRST PET SHARING COMMUNITY";
  const eyebrowEt = getCell(rows, 11, 5) || null;

  const trust = [];
  for (let r = 12; r <= 13; r++) {
    const en = getCell(rows, r, 1);
    const et = getCell(rows, r, 5);
    if (en && en.length < 80) trust.push({ en, et: et || null });
  }

  return { eyebrowEn, eyebrowEt, heroTitleEn, heroTitleEt, heroSubtitleEn, heroSubtitleEt, trust };
}

function parseAbout(rows) {
  const maxR = Math.max(...Object.keys(rows).map(Number), 0);
  const sections = { titleEn: "", titleEt: null, subtitleEn: "", subtitleEt: null, mission: [], story: [] };
  const skipHeadings = new Set([
    "Our Mission",
    "Our Story",
    "Our Team",
    "Our Core Values",
    "Why Choose Stay With My Pet",
    "Why Choose StayWithMyPet",
    "Here's why our users trust us:",
    "Here’s why our users trust us:",
  ]);

  for (let r = 1; r <= maxR; r++) {
    const { en, et } = pairRowTexts(rows, r);
    if (r === 2) {
      sections.titleEn = en || sections.titleEn;
      sections.titleEt = et || sections.titleEt;
      continue;
    }
    if (r === 3) {
      sections.subtitleEn = en || sections.subtitleEn;
      sections.subtitleEt = et || sections.subtitleEt;
      continue;
    }
    if (!en || shouldSkip(en) || skipHeadings.has(en)) continue;
    if (classifyLanguage(en) !== "en") continue;

    let pairedEt =
      et ||
      findEtInSheet(rows, maxR, en) ||
      ABOUT_ET_PHRASES[en] ||
      ABOUT_ET_PHRASES[en.replace(/^\d+\.\s*/, "")] ||
      null;
    if (en.startsWith(CORE_VALUES_EN_PREFIX)) {
      pairedEt = pairedEt || CORE_VALUES_ET;
    }

    if (r < 12) sections.mission.push({ en, et: pairedEt });
    else if (r >= 14) sections.story.push({ en, et: pairedEt });
  }

  const coreIdx = sections.story.findIndex((p) => p.en.startsWith(CORE_VALUES_EN_PREFIX));
  if (coreIdx >= 0 && !sections.story[coreIdx].et) {
    sections.story[coreIdx].et = CORE_VALUES_ET;
  }

  return sections;
}

function parseContact(rows) {
  const labels = {};
  const map = [
    ["Contact Us", "title"],
    ["Get in Touch", "badge"],
    ["Questions, ideas", "subtitle"],
    ["Send us a Message", "formHeading"],
    ["Full Name", "fullName"],
    ["Email Address", "email"],
    ["Subject", "subject"],
    ["Message", "message"],
    ["Send Message", "submit"],
  ];
  for (let r = 1; r <= 30; r++) {
    const en = getCell(rows, r, 2);
    const et = getCell(rows, r, 4);
    for (const [prefix, key] of map) {
      if (en.startsWith(prefix)) {
        labels[key] = { en, et: et || null };
      }
    }
  }
  return labels;
}

function parseClinics(rows) {
  const disclaimer = [];
  for (let r = 14; r <= 30; r++) {
    const en = getCell(rows, r, 2);
    const et = getCell(rows, r, 4);
    if (!en || en.length < 20) continue;
    if (/^Important note/i.test(en)) continue;
    disclaimer.push({ en, et: et || null });
  }
  return {
    titleEn: getCell(rows, 2, 2) || "Nearby Veterinary Clinics in Estonia",
    titleEt: getCell(rows, 2, 4) || null,
    subtitleEn: getCell(rows, 3, 2) || "",
    subtitleEt: getCell(rows, 3, 4) || null,
    introEn: getCell(rows, 6, 2) || getCell(rows, 5, 2) || "",
    introEt: getCell(rows, 6, 4) || getCell(rows, 5, 4) || null,
    sectionTitleEn: getCell(rows, 5, 2) || "Trusted Pet Clinics Near You",
    sectionTitleEt: getCell(rows, 5, 4) || null,
    disclaimerTitleEn: getCell(rows, 13, 2) || "Important note about clinic information",
    disclaimerTitleEt: getCell(rows, 13, 4) || null,
    disclaimer,
  };
}

// --- extract xlsx ---
if (!fs.existsSync(xlsxPath)) {
  console.error("Missing:", xlsxPath);
  process.exit(1);
}
if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true });
fs.copyFileSync(xlsxPath, zipPath);
fs.mkdirSync(extractDir, { recursive: true });
execSync(
  `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${extractDir.replace(/'/g, "''")}' -Force"`,
  { stdio: "inherit" },
);

const strings = parseSharedStrings(fs.readFileSync(path.join(extractDir, "xl/sharedStrings.xml"), "utf8"));
const wb = fs.readFileSync(path.join(extractDir, "xl/workbook.xml"), "utf8");
const sheetNames = [...wb.matchAll(/name="([^"]+)"/g)].map((m) => m[1]);

function loadSheet(index) {
  const xml = fs.readFileSync(path.join(extractDir, `xl/worksheets/sheet${index}.xml`), "utf8");
  return parseSheet(xml, strings);
}

const sheetIndex = Object.fromEntries(sheetNames.map((n, i) => [n, i + 1]));
const howItWorks = parseHowItWorks(loadSheet(sheetIndex["How it works"]));
const faq = parseFaq(loadSheet(sheetIndex["FAQ"]));
const opening = parseOpeningPage(loadSheet(sheetIndex["Opening page"]));
const about = parseAbout(loadSheet(sheetIndex["Our Story"]));
const contact = parseContact(loadSheet(sheetIndex["Contact Us"]));
const clinics = parseClinics(loadSheet(sheetIndex["Clinics"]));
const headerFooterRows = loadSheet(sheetIndex["Header and footer"]);
const navPairs = extractNavPairs(headerFooterRows);
const footerLegalLabels = extractFooterLegalLabels(headerFooterRows);
const footerTaglineEn = getCell(headerFooterRows, 13, 2);
const footerTaglineEt = getCell(headerFooterRows, 13, 3) || getCell(headerFooterRows, 13, 4) || null;

const privacyRows = loadSheet(sheetIndex["privacy policy"]);
const termsRows = loadSheet(sheetIndex["Terms of Use"]);
const safetyRows = loadSheet(sheetIndex["Safety guidelines"]);

const privacyMax = Math.max(...Object.keys(privacyRows).map(Number), 0);
const termsMax = Math.max(...Object.keys(termsRows).map(Number), 0);
const safetyMax = Math.max(...Object.keys(safetyRows).map(Number), 0);

const sharedEtIndex = buildSharedStringEtIndex(strings);

const privacyIndex = buildMasterEtIndex(privacyRows, privacyMax, 2, 3);
enrichPrivacyPurposeTable(privacyIndex, privacyRows);

const privacy = dedupeLegalBlocks(
  extractLegalBlocks(privacyRows, privacyMax, {
    enCol: 2,
    etCol: 3,
    titleEn: "Privacy Policy",
  }),
);
const terms = dedupeLegalBlocks(
  extractLegalBlocks(termsRows, termsMax, {
    enCol: 2,
    etCol: 4,
    titleEn: "Terms of Use",
  }),
);
const safety = dedupeLegalBlocks(
  extractLegalBlocks(safetyRows, safetyMax, {
    enCol: 2,
    etCol: 3,
    titleEn: "Safety Guidelines",
  }),
);

applyLegalEtIndex(privacy, privacyIndex, sharedEtIndex);
applyLegalEtIndex(terms, buildMasterEtIndex(termsRows, termsMax, 2, 4), sharedEtIndex);
applyLegalEtIndex(safety, buildMasterEtIndex(safetyRows, safetyMax, 2, 3), sharedEtIndex);

const missingEt = [];

function track(key, en, et) {
  if (en && !et && isClearlyEnglish(en)) {
    missingEt.push({ key, en: en.length > 120 ? `${en.slice(0, 120)}…` : en });
  }
  return et ?? en;
}

function navEt(...keys) {
  for (const key of keys) {
    const hit = navPairs.find(([en]) => en === key);
    if (hit?.[1]) return hit[1];
  }
  return null;
}

const navbarOverridesEn = {
  home: "Home",
  about: "About Us",
  howItWorks: "How It Works",
  articles: "Articles",
  contact: "Contact Us",
  findCare: "Find Care",
  findPets: "Find Pets",
  findPetFriends: "Find Pet Friends",
  searchPets: "Search pets",
  pricing: "Pricing",
  faq: "FAQ",
  login: "Log in",
  getStarted: "Sign up",
};

const navbarOverridesEt = {
  home: track("navbar.home", navbarOverridesEn.home, navEt("Home")),
  about: track("navbar.about", navbarOverridesEn.about, navEt("About Us")),
  howItWorks: track("navbar.howItWorks", navbarOverridesEn.howItWorks, navEt("How It Works", "How it works")),
  articles: track("navbar.articles", navbarOverridesEn.articles, navEt("Articles")),
  contact: track("navbar.contact", navbarOverridesEn.contact, navEt("Contact Us")),
  findCare: track("navbar.findCare", navbarOverridesEn.findCare, NAVBAR_ET.findCare),
  findPets: track("navbar.findPets", navbarOverridesEn.findPets, NAVBAR_ET.findPets),
  findPetFriends: track("navbar.findPetFriends", navbarOverridesEn.findPetFriends, NAVBAR_ET.findPetFriends),
  searchPets: track("navbar.searchPets", navbarOverridesEn.searchPets, NAVBAR_ET.searchPets),
  pricing: track("navbar.pricing", navbarOverridesEn.pricing, NAVBAR_ET.pricing),
  faq: track("navbar.faq", navbarOverridesEn.faq, NAVBAR_ET.faq),
  login: track("navbar.login", navbarOverridesEn.login, NAVBAR_ET.login),
  getStarted: track("navbar.getStarted", navbarOverridesEn.getStarted, NAVBAR_ET.getStarted),
};

// Build FAQ items for i18n
const faqItemsEn = faq.items.map((item) => ({
  question: item.questionEn,
  answer: item.answerEn,
}));
const faqItemsEt = faq.items.map((item, i) => {
  const q = track(`faq.items[${i}].question`, item.questionEn, item.questionEt);
  const a = track(`faq.items[${i}].answer`, item.answerEn, item.answerEt);
  return { question: q, answer: a };
});

const howItWorksExplainerEn = {
  heading: howItWorks.titleEn,
  subheading: howItWorks.introEn,
  petParent: {
    title: "For Pet Parents",
    description: howItWorks.parentSteps.map((s) => s.bodyEn).filter(Boolean).join(" "),
    cta: navbarOverridesEn.findCare,
  },
  petFriend: {
    title: "For Pet Friends",
    description: howItWorks.friendSteps.map((s) => s.bodyEn).filter(Boolean).join(" "),
    cta: navbarOverridesEn.findPets,
  },
};

const howItWorksExplainerEt = {
  heading: track("howItWorksPage.explainerSection.heading", howItWorks.titleEn, howItWorks.titleEt),
  subheading: track("howItWorksPage.explainerSection.subheading", howItWorks.introEn, howItWorks.introEt),
  petParent: {
    title: track("howItWorksPage.explainerSection.petParent.title", "For Pet Parents", "Loomaomanikule"),
    description: howItWorks.parentSteps.map((s) => track("howItWorks.parent", s.bodyEn, s.bodyEt) || s.bodyEn).join(" "),
    cta: navbarOverridesEt.findCare,
  },
  petFriend: {
    title: track("howItWorksPage.explainerSection.petFriend.title", "For Pet Friends", "Loomasõbrale"),
    description: howItWorks.friendSteps.map((s) => track("howItWorks.friend", s.bodyEn, s.bodyEt) || s.bodyEn).join(" "),
    cta: navbarOverridesEt.findPets,
  },
};

const siteEnPartial = {
  navbar: navbarOverridesEn,
  footer: {
    tagline: footerTaglineEn || undefined,
    groups: {
      company: {
        vetClinics: "Vet clinics",
        terms: footerLegalLabels.en.terms || FOOTER_LEGAL.en.terms,
        privacy: footerLegalLabels.en.privacy || FOOTER_LEGAL.en.privacy,
        safety: footerLegalLabels.en.safety || FOOTER_LEGAL.en.safety,
      },
    },
  },
  hero: {
    eyebrow: opening.eyebrowEn || undefined,
    title: opening.heroTitleEn || undefined,
    subtitle: opening.heroSubtitleEn || undefined,
  },
  faq: {
    badge: "FAQ",
    title: faq.titleEn.replace(/\s*\(FAQ\)\s*/i, "").trim(),
    subtitle: faq.subtitleEn,
    items: faqItemsEn,
  },
  about: {
    badge: "About us",
    title: about.subtitleEn || about.titleEn,
    subtitle: about.subtitleEn || "",
    missionTitle: "Our Mission",
    missionParagraphs: about.mission.map((p) => p.en),
    storyTitle: "Our Story",
    storyParagraphs: about.story.map((p) => p.en),
  },
  howItWorksPage: {
    title: howItWorks.titleEn,
    subtitle: howItWorks.subtitleEn,
    explainerSection: howItWorksExplainerEn,
  },
  contact: {
    badge: contact.badge?.en?.split("?")[0]?.trim() || "Get in Touch",
    title: contact.title?.en || "Contact Us",
    subtitle: contact.subtitle?.en || "",
    fullName: contact.fullName?.en || "Full Name",
    email: contact.email?.en || "Email Address",
    subject: contact.subject?.en || "Subject",
    message: contact.message?.en || "Message",
    sendMessage: contact.submit?.en || "Send Message",
  },
  common: {
    sendMessage: contact.submit?.en || "Send Message",
  },
  vetClinics: {
    badge: "Pet safety",
    title: clinics.titleEn,
    subtitle: clinics.subtitleEn,
    intro: clinics.introEn,
    sectionTitle: clinics.sectionTitleEn,
    disclaimerTitle: clinics.disclaimerTitleEn,
    disclaimer: clinics.disclaimer.map((d) => d.en),
  },
  legal: {
    privacy: { title: FOOTER_LEGAL.en.privacy },
    terms: { title: FOOTER_LEGAL.en.terms },
    safety: { title: FOOTER_LEGAL.en.safety },
  },
};

const siteEtPartial = {
  navbar: navbarOverridesEt,
  footer: {
    tagline: track("footer.tagline", footerTaglineEn, footerTaglineEt),
    groups: {
      company: {
        vetClinics: track("footer.vetClinics", "Vet clinics", "Loomakliinikud"),
        terms: track(
          "footer.terms",
          FOOTER_LEGAL.en.terms,
          footerLegalLabels.et.terms || FOOTER_LEGAL.et.terms,
        ),
        privacy: track(
          "footer.privacy",
          FOOTER_LEGAL.en.privacy,
          footerLegalLabels.et.privacy || FOOTER_LEGAL.et.privacy,
        ),
        safety: track(
          "footer.safety",
          FOOTER_LEGAL.en.safety,
          footerLegalLabels.et.safety || FOOTER_LEGAL.et.safety,
        ),
      },
    },
  },
  hero: {
    eyebrow: track("hero.eyebrow", opening.eyebrowEn, opening.eyebrowEt),
    title: track("hero.title", opening.heroTitleEn, opening.heroTitleEt),
    subtitle: track("hero.subtitle", opening.heroSubtitleEn, opening.heroSubtitleEt),
  },
  faq: {
    badge: "KKK",
    title: track("faq.title", faq.titleEn, faq.titleEt?.replace(/\s*\(KKK\)\s*/i, "").trim()),
    subtitle: track("faq.subtitle", faq.subtitleEn, faq.subtitleEt),
    items: faqItemsEt,
  },
  about: {
    badge: track("about.badge", "About us", about.titleEt || ABOUT_ET_PHRASES["About us"]),
    title: track("about.title", about.subtitleEn, about.subtitleEt),
    subtitle: track("about.subtitle", about.subtitleEn, about.subtitleEt),
    missionTitle: track("about.missionTitle", "Our Mission", "Meie missioon"),
    missionParagraphs: about.mission.map((p, i) => track(`about.mission[${i}]`, p.en, p.et)),
    storyTitle: track("about.storyTitle", "Our Story", "Meie lugu"),
    storyParagraphs: about.story.map((p, i) => track(`about.story[${i}]`, p.en, p.et)),
  },
  howItWorksPage: {
    title: track("howItWorksPage.title", howItWorks.titleEn, howItWorks.titleEt),
    subtitle: track("howItWorksPage.subtitle", howItWorks.subtitleEn, howItWorks.subtitleEt),
    explainerSection: howItWorksExplainerEt,
  },
  contact: {
    badge: track("contact.badge", contact.badge?.en, contact.badge?.et),
    title: track("contact.title", contact.title?.en, contact.title?.et),
    subtitle: track("contact.subtitle", contact.subtitle?.en, contact.subtitle?.et),
    fullName: track("contact.fullName", contact.fullName?.en, contact.fullName?.et),
    email: track("contact.email", contact.email?.en, contact.email?.et),
    subject: track("contact.subject", contact.subject?.en, contact.subject?.et),
    message: track("contact.message", contact.message?.en, contact.message?.et),
    sendMessage: track("contact.sendMessage", contact.submit?.en, contact.submit?.et),
  },
  common: {
    sendMessage: track("common.sendMessage", contact.submit?.en, contact.submit?.et),
  },
  vetClinics: {
    badge: track("vetClinics.badge", "Pet safety", "Lemmiku turvalisus"),
    title: track("vetClinics.title", clinics.titleEn, clinics.titleEt),
    subtitle: track("vetClinics.subtitle", clinics.subtitleEn, clinics.subtitleEt),
    intro: track("vetClinics.intro", clinics.introEn, clinics.introEt),
    sectionTitle: track("vetClinics.sectionTitle", clinics.sectionTitleEn, clinics.sectionTitleEt),
    disclaimerTitle: track(
      "vetClinics.disclaimerTitle",
      clinics.disclaimerTitleEn,
      clinics.disclaimerTitleEt,
    ),
    disclaimer: clinics.disclaimer.map((d, i) =>
      track(`vetClinics.disclaimer[${i}]`, d.en, d.et),
    ),
  },
  legal: {
    privacy: {
      title: track(
        "legal.privacy.title",
        FOOTER_LEGAL.en.privacy,
        footerLegalLabels.et.privacy || FOOTER_LEGAL.et.privacy,
      ),
    },
    terms: {
      title: track(
        "legal.terms.title",
        FOOTER_LEGAL.en.terms,
        footerLegalLabels.et.terms || FOOTER_LEGAL.et.terms,
      ),
    },
    safety: {
      title: track(
        "legal.safety.title",
        FOOTER_LEGAL.en.safety,
        footerLegalLabels.et.safety || FOOTER_LEGAL.et.safety,
      ),
    },
  },
};

function formatLegalBlocks(blocks) {
  return blocks
    .filter((b) => b.en && !shouldSkip(b.en) && isClearlyEnglish(b.en))
    .map((b) => ({
      en: b.en,
      et: b.et && !shouldSkip(b.et) ? b.et : LEGAL_ET_FALLBACKS[b.en] ?? null,
    }));
}

const legalDocs = {
  privacy: {
    titleEn: siteEnPartial.legal.privacy.title,
    titleEt: siteEtPartial.legal.privacy.title || FOOTER_LEGAL.et.privacy,
    blocks: formatLegalBlocks(privacy),
  },
  terms: {
    titleEn: siteEnPartial.legal.terms.title,
    titleEt: siteEtPartial.legal.terms.title || FOOTER_LEGAL.et.terms,
    blocks: formatLegalBlocks(terms),
  },
  safety: {
    titleEn: siteEnPartial.legal.safety.title,
    titleEt: siteEtPartial.legal.safety.title || FOOTER_LEGAL.et.safety,
    blocks: formatLegalBlocks(safety),
  },
};

for (const [slug, doc] of Object.entries(legalDocs)) {
  for (const block of doc.blocks) {
    if (!block.et && isClearlyEnglish(block.en)) {
      missingEt.push({ key: `legal.${slug}`, en: block.en.slice(0, 120) });
    }
  }
}

function emitObj(obj, indent = 0) {
  const pad = "  ".repeat(indent);
  if (obj === undefined) return "undefined";
  if (obj === null) return "null";
  if (typeof obj === "string") return esc(obj);
  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]";
    return `[\n${obj.map((v) => `${pad}  ${emitObj(v, indent + 1)},`).join("\n")}\n${pad}]`;
  }
  if (typeof obj === "object") {
    const entries = Object.entries(obj).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return "{}";
    return `{\n${entries
      .map(([k, v]) => `${pad}  ${/^[a-zA-Z_$][\w$]*$/.test(k) ? k : esc(k)}: ${emitObj(v, indent + 1)},`)
      .join("\n")}\n${pad}}`;
  }
  return String(obj);
}

fs.mkdirSync(path.dirname(outEn), { recursive: true });

fs.writeFileSync(
  outSiteTexts,
  `/**
 * General site & legal page text from EST and ENG texts.xlsx
 * Regenerate: node scripts/sync-site-texts.mjs
 */

import type { Locale } from "@/i18n/translations";

export type LegalBlock = { en: string; et: string | null };

export type LegalDocument = {
  titleEn: string;
  titleEt: string;
  blocks: LegalBlock[];
};

export const legalDocuments = ${emitObj(legalDocs)} as const;

export function getLegalDocument(slug: keyof typeof legalDocuments, locale: Locale): {
  title: string;
  paragraphs: string[];
} {
  const doc = legalDocuments[slug];
  const title = locale === "et" ? doc.titleEt : doc.titleEn;
  const paragraphs = doc.blocks.map((b) => (locale === "et" && b.et ? b.et : b.en));
  return { title, paragraphs };
}
`,
);

fs.writeFileSync(
  outEn,
  `/** Auto-generated from EST and ENG texts.xlsx — do not edit */
export const siteEnPartial = ${emitObj(siteEnPartial)} as const;
`,
);

fs.writeFileSync(
  outEt,
  `/** Auto-generated from EST and ENG texts.xlsx — do not edit */
export const siteEtPartial = ${emitObj(siteEtPartial)} as const;
`,
);

fs.writeFileSync(outMissing, JSON.stringify(missingEt, null, 2));

console.log(`Wrote ${outSiteTexts}`);
console.log(`Wrote ${outEn} / ${outEt}`);
console.log(`FAQ items: ${faq.items.length}`);
console.log(`Privacy blocks: ${legalDocs.privacy.blocks.length}`);
console.log(`Terms blocks: ${legalDocs.terms.blocks.length}`);
console.log(`Safety blocks: ${legalDocs.safety.blocks.length}`);
console.log(`Missing ET entries: ${missingEt.length}`);
