
import fs from "node:fs";
import path from "node:path";
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

const ESTONIAN_SECTION_HEADER =
  /\b(Kontakt|Küpsised|Andmete|Andmetöötleja|Mõisted|Kasutajate|Kohustused|Privaatsus|Ohutus|Eesmärk|Milliseid|ettevõtte|Tarbijakaebus|Alaealiste|Muudatused|Kaebused|Isikuandmete|turvalisus|säilitamine|jagamine|edastamine|õigused|Puuduvad)\b/i;

function isClearlyEstonian(text) {
  const t = (text ?? "").trim();
  if (!t || shouldSkip(t)) return false;
  if (/[õäüöÕÄÜÖ]/.test(t)) return true;
  if (/,\s*Eesti\s*$/i.test(t)) return true;
  if (/^(E-post|Telefon|Registrikood|Ärinimi):/i.test(t)) return true;
  if (/^\d+\.\s/.test(t) && ESTONIAN_SECTION_HEADER.test(t)) return true;
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
  if (/^\d+\.\s/.test(t) && ESTONIAN_SECTION_HEADER.test(t)) return false;
  if (/,\s*Eesti\s*$/i.test(t)) return false;
  if (/^(E-post|Telefon|Registrikood):/i.test(t)) return false;
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

function acceptEtCandidate(en, et) {
  if (!et || shouldSkip(et)) return false;
  if (normalizeKey(en) === normalizeKey(et)) return true;
  if (isClearlyEstonian(et)) return true;
  if (isClearlyEnglish(et) && !isClearlyEstonian(et)) return false;
  return true;
}

function resolveEt(en, et) {
  if (et && acceptEtCandidate(en, et)) return et;
  return LEGAL_ET_FALLBACKS[en] ?? null;
}

function isLegalContentBlock(text) {
  const t = (text ?? "").trim();
  if (!t || t === "." || t.length < 2) return false;
  if (/Stay With My Pet\s*[\u2013\u2014-]\s*Lareflexion/i.test(t)) return true;
  if (/Lareflexion\s*OÜ/i.test(t)) return true;
  if (/^(Stay With My Pet|Juhkentali|Email:|Phone:|Legal Name|Legal entity|Registered Address|Registry code:)/i.test(t)) {
    return true;
  }
  if (/^\+?\d[\d\s()-]{6,}$/.test(t)) return true;
  if (isClearlyEnglish(t)) return true;
  if (isClearlyEstonian(t)) return false;
  return /\b(the|and|your|our|we|you|with|for|to|is|are|not|may|must|shall)\b/i.test(t);
}

/** Pair EN in enCol with ET from same row, next row, or stacked column. */
function pairEnEtAtRow(rows, maxRow, r, enCol, etCol) {
  const en = getCell(rows, r, enCol);
  if (!en) return null;

  const etSame = getCell(rows, r, etCol);
  if (etSame && acceptEtCandidate(en, etSame)) return resolveEt(en, etSame);

  for (const c of [2, 3, 4, 5, 6]) {
    if (c === enCol || c === etCol) continue;
    const alt = getCell(rows, r, c);
    if (alt && acceptEtCandidate(en, alt) && isClearlyEstonian(alt)) return resolveEt(en, alt);
  }

  const etNext = getCell(rows, r + 1, etCol);
  if (etNext && acceptEtCandidate(en, etNext)) return resolveEt(en, etNext);

  for (const c of [2, 3, 4, 5, 6]) {
    const alt = getCell(rows, r + 1, c);
    if (alt && acceptEtCandidate(en, alt) && isClearlyEstonian(alt)) return resolveEt(en, alt);
  }

  const etStacked = getCell(rows, r + 1, enCol);
  if (etStacked && acceptEtCandidate(en, etStacked) && isClearlyEstonian(etStacked)) {
    return resolveEt(en, etStacked);
  }

  return resolveEt(en, null);
}

function buildSectionHeaderIndex(rows, maxRow) {
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
  const index = new Map();
  for (const [num, en] of enHeaders) {
    const et = etHeaders.get(num);
    if (et) index.set(normalizeKey(en), et);
  }
  return index;
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
  const purposeEtRows = [84, 86, 88, 90, 92, 94, 96, 98, 100, 102];
  for (let i = 0; i < purposeEn.length && i < purposeEtRows.length; i++) {
    const et =
      getCell(rows, purposeEtRows[i], 3) || getCell(rows, purposeEtRows[i], 2);
    if (et && isClearlyEstonian(et)) index.set(normalizeKey(purposeEn[i]), et);
  }
  const extras = [
    ["We process your personal data for the following purposes:", 82, 3],
    ["3. Purpose of Processing", 80, 3],
    ["Legal Basis", 81, 3],
    ["Purpose", 81, 3],
    ["7. Cookies and Similar Technologies", 144, 2],
    ["We use cookies to enhance your experience and ensure the proper functioning of our Service.", 146, 2],
    ["Types of cookies:", 148, 2],
    ["Essential cookies – required for platform functionality and security.", 150, 3],
    ["Analytics cookies – help us understand usage patterns (only with your consent).", 152, 3],
    ["Preference cookies – remember your settings or login status.", 154, 3],
    [
      "You can manage or disable cookies through your browser settings. Consent-based cookies will only be activated with your explicit permission.",
      156,
      3,
    ],
  ];
  for (const [en, row, col] of extras) {
    const et = getCell(rows, row, col);
    if (et && isClearlyEstonian(et)) index.set(normalizeKey(en), et);
  }
}

/**
 * Privacy Policy sheet has EN/ET interleaved in col 2 with column drift in col 3/4.
 * Map known EN cells to their ET source cells from EST and ENG texts.xlsx.
 */
function buildPrivacyEtOverrides(rows) {
  const index = new Map();
  const pair = (er, ec, tr, tc) => {
    const en = getCell(rows, er, ec);
    const et = getCell(rows, tr, tc);
    if (en && et) index.set(normalizeKey(en), et);
  };

  pair(5, 2, 5, 3);
  pair(7, 2, 7, 3);
  pair(9, 2, 9, 3);
  pair(10, 2, 11, 2);
  pair(12, 2, 13, 2);
  pair(14, 2, 15, 2);
  pair(18, 2, 18, 3);
  pair(20, 2, 20, 3);
  pair(22, 2, 21, 2);
  pair(24, 2, 23, 2);
  pair(26, 2, 25, 2);

  pair(28, 2, 27, 2);
  pair(29, 2, 29, 3);
  pair(31, 2, 31, 3);
  pair(32, 2, 33, 3);
  pair(33, 2, 35, 3);
  pair(34, 2, 37, 3);
  pair(35, 2, 39, 3);
  pair(36, 2, 41, 3);
  pair(37, 2, 43, 3);
  pair(38, 2, 45, 3);
  pair(39, 2, 47, 3);
  pair(40, 2, 49, 3);
  pair(41, 2, 51, 3);
  pair(42, 2, 53, 3);
  pair(43, 2, 55, 3);
  pair(44, 2, 58, 4);
  pair(45, 2, 60, 4);
  pair(46, 2, 62, 4);
  pair(47, 2, 64, 4);
  pair(48, 2, 66, 4);
  pair(49, 2, 68, 3);
  pair(50, 2, 70, 3);
  pair(51, 2, 72, 3);
  pair(52, 2, 74, 3);
  pair(53, 2, 76, 3);
  pair(54, 2, 78, 3);

  pair(55, 2, 80, 3);
  pair(56, 2, 82, 3);
  pair(59, 2, 84, 3);
  pair(60, 2, 86, 3);
  pair(61, 2, 88, 2);
  pair(62, 2, 90, 3);
  pair(63, 2, 92, 3);
  pair(64, 2, 94, 3);
  pair(65, 2, 96, 3);
  pair(66, 2, 98, 3);
  pair(67, 2, 100, 3);
  pair(68, 2, 102, 2);

  pair(69, 2, 104, 3);
  pair(70, 2, 106, 3);
  pair(72, 2, 108, 3);
  pair(73, 2, 110, 3);
  pair(74, 2, 112, 3);

  pair(75, 2, 114, 2);
  pair(76, 2, 116, 3);
  pair(78, 2, 118, 2);
  pair(79, 2, 120, 3);
  pair(80, 2, 122, 3);
  pair(81, 2, 124, 3);
  pair(82, 2, 126, 3);
  pair(83, 2, 128, 3);
  pair(84, 2, 130, 2);

  pair(86, 2, 132, 2);
  pair(87, 2, 134, 3);
  pair(89, 2, 136, 3);
  pair(90, 2, 138, 3);
  pair(91, 2, 140, 3);
  pair(92, 2, 142, 2);

  pair(93, 2, 144, 2);
  pair(94, 2, 146, 2);
  pair(96, 2, 148, 2);
  pair(98, 2, 150, 3);
  pair(99, 2, 152, 3);
  pair(100, 2, 154, 3);
  pair(101, 2, 156, 3);

  pair(103, 2, 158, 3);
  pair(104, 2, 160, 3);
  pair(106, 2, 162, 4);
  pair(107, 2, 164, 4);
  pair(108, 2, 166, 4);
  pair(109, 2, 168, 4);
  pair(110, 2, 170, 4);

  pair(112, 2, 172, 4);
  pair(113, 2, 174, 4);
  pair(115, 2, 176, 4);
  pair(116, 2, 178, 4);
  pair(117, 2, 180, 4);

  pair(119, 2, 182, 4);
  pair(120, 2, 184, 4);
  pair(129, 2, 200, 4);
  pair(131, 2, 201, 4);

  pair(133, 2, 203, 4);
  pair(134, 2, 205, 4);
  pair(136, 2, 207, 4);
  pair(140, 2, 209, 4);
  pair(141, 2, 211, 4);
  pair(143, 2, 213, 4);
  pair(145, 2, 214, 4);
  pair(147, 2, 216, 4);

  pair(149, 2, 218, 4);
  pair(150, 2, 220, 4);
  pair(152, 2, 222, 4);
  pair(154, 2, 223, 4);
  pair(156, 2, 224, 4);
  pair(158, 2, 225, 4);
  pair(160, 2, 227, 4);
  pair(162, 2, 229, 4);

  return index;
}

function pairPrivacyEtInterleaved(rows, r, en) {
  const et3 = getCell(rows, r, 3);
  if (et3 && acceptEtCandidate(en, et3) && isClearlyEstonian(et3)) return et3;

  const next2 = getCell(rows, r + 1, 2);
  if (next2 && isClearlyEstonian(next2) && !isClearlyEnglish(next2)) return next2;

  return null;
}

function extractPrivacyBlocks(rows, maxRow) {
  const overrides = buildPrivacyEtOverrides(rows);
  const headerIndex = buildSectionHeaderIndex(rows, maxRow);
  const blocks = [];
  const seen = new Set();

  for (let r = 1; r <= maxRow; r++) {
    const en = getCell(rows, r, 2);
    if (!en || shouldSkip(en)) continue;
    if (normalizeKey(en) === normalizeKey("Privacy Policy")) continue;
    if (isClearlyEstonian(en) && !isClearlyEnglish(en)) continue;
    if (!isLegalContentBlock(en)) continue;

    const key = normalizeKey(en);
    if (seen.has(key)) continue;
    seen.add(key);

    const et =
      overrides.get(key) ??
      pairPrivacyEtInterleaved(rows, r, en) ??
      headerIndex.get(key) ??
      LEGAL_ET_FALLBACKS[en] ??
      null;

    blocks.push({ en, et });
  }

  for (const block of blocks) {
    if (block.et) continue;
    if (LEGAL_ET_FALLBACKS[block.en]) block.et = LEGAL_ET_FALLBACKS[block.en];
  }

  return blocks;
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
  const headerIndex = buildSectionHeaderIndex(rows, maxRow);
  const blocks = [];
  const seen = new Set();

  for (let r = 1; r <= maxRow; r++) {
    const en = getCell(rows, r, enCol);
    if (!en || shouldSkip(en)) continue;
    if (titleEn && normalizeKey(en) === normalizeKey(titleEn)) continue;
    if (!isLegalContentBlock(en)) continue;
    if (isClearlyEstonian(en) && !isClearlyEnglish(en)) continue;

    const key = normalizeKey(en);
    if (seen.has(key)) continue;
    seen.add(key);

    const et =
      pairEnEtAtRow(rows, maxRow, r, enCol, etCol) ??
      headerIndex.get(key) ??
      LEGAL_ET_FALLBACKS[en] ??
      null;

    blocks.push({ en, et });
  }

  for (const block of blocks) {
    if (block.et) continue;
    if (LEGAL_ET_FALLBACKS[block.en]) block.et = LEGAL_ET_FALLBACKS[block.en];
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
    if (!b.en || !isLegalContentBlock(b.en)) return false;
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

function stripFaqQuestionPrefix(text) {
  return (text ?? "").replace(/^\d+\.\s*/, "").trim();
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
      currentQ = {
        questionEn: stripFaqQuestionPrefix(en),
        questionEt: et ? stripFaqQuestionPrefix(et) : null,
        answerEn: "",
        answerEt: null,
      };
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

function parseFounderRoleLine(text) {
  const t = (text ?? "").trim();
  if (!t) return "";
  const parts = t.split(/\s*[–—]\s*/);
  return parts.length > 1 ? parts.slice(1).join(" – ").trim() : t;
}

const ABOUT_INSURANCE_RE =
  /extra peace of mind|insurance\*?\s+and\s+24|^\*for cats and dogs|kindlustus\*|24-tunnine veterinaarne|lisakindlus|praegu võtame maha/i;

function isAboutInsuranceText(text) {
  return ABOUT_INSURANCE_RE.test((text ?? "").trim());
}

function parseAbout(rows) {
  const pair = (r) => {
    const { en, et } = pairRowTexts(rows, r);
    return { en: en || "", et: et || null };
  };

  const badgeEn = getCell(rows, 2, 2) || "";
  const badgeEt = getCell(rows, 2, 4) || null;
  const titleEn = getCell(rows, 3, 2) || "";
  const titleEt = getCell(rows, 3, 4) || null;
  const subtitleEn = titleEn;
  const subtitleEt = titleEt;

  const mission = [6, 8, 10].map(pair).filter((p) => p.en);

  const story = [];
  for (let r = 14; r <= 30; r++) {
    const p = pair(r);
    if (!p.en) continue;
    if (/^Our (Story|Team)$/i.test(p.en)) break;
    if (isAboutInsuranceText(p.en) || isAboutInsuranceText(p.et)) continue;
    story.push(p);
  }

  const teamIntro = pair(27);
  const teamClosing = pair(37);

  const founderRows = [
    { name: "Gerly Kullamaa", roleR: 29, bioR: 31 },
    { name: "Kush Chadha", roleR: 33, bioR: 35 },
  ];
  const founders = founderRows.map(({ name, roleR, bioR }) => {
    const role = pair(roleR);
    const bio = pair(bioR);
    return {
      name,
      roleEn: parseFounderRoleLine(role.en) || role.en,
      roleEt: parseFounderRoleLine(role.et) || role.et,
      bioEn: bio.en,
      bioEt: bio.et,
    };
  });

  const values = [];
  for (let r = 41; r <= 55; r++) {
    const titleRow = pair(r);
    if (!/^\d+\.\s/.test(titleRow.en)) continue;
    const descRow = pair(r + 1);
    values.push({
      titleEn: titleRow.en.replace(/^\d+\.\s*/, "").trim(),
      titleEt: titleRow.et?.replace(/^\d+\.\s*/, "").trim() || null,
      descriptionEn: descRow.en,
      descriptionEt: descRow.et,
    });
    r += 1;
  }

  const whyChooseItems = [];
  for (const r of [65, 67, 69, 71]) {
    const row = pair(r);
    if (!row.en || isAboutInsuranceText(row.en)) continue;
    let titleEn = row.en;
    let descriptionEn = "";
    const colon = row.en.indexOf(":");
    if (colon > 0) {
      titleEn = row.en.slice(0, colon).trim();
      descriptionEn = row.en.slice(colon + 1).trim();
    }
    const descRow = pair(r + 1);
    if (isAboutInsuranceText(descRow.en) || isAboutInsuranceText(descRow.et)) continue;
    const descriptionEt =
      (descRow.et && isClearlyEstonian(descRow.et) ? descRow.et : null) ||
      (descRow.en && isClearlyEstonian(descRow.en) ? descRow.en : null);
    whyChooseItems.push({
      titleEn,
      titleEt: row.et || null,
      descriptionEn,
      descriptionEt,
    });
  }

  const whyChooseClosing = pair(76);

  return {
    badgeEn,
    badgeEt,
    titleEn,
    titleEt,
    subtitleEn,
    subtitleEt,
    mission,
    story,
    teamIntro,
    teamClosing,
    founders,
    values,
    whyChooseItems,
    whyChooseClosing,
  };
}

const FOUNDER_IMAGES = {
  "Gerly Kullamaa": "/images/founders/gerly-kullamaa.jpg",
  "Kush Chadha": "/images/founders/kush-chadha.jpg",
};


function parseSharedStrings(xml) {
  const strings = [];
  const re = /<si>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = re.exec(xml))) {
    const texts = [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]);
    strings.push(texts.join(""));
  }
  return strings;
}
function col(s) { let n = 0; for (const c of s) n = n * 26 + (c.charCodeAt(0) - 64); return n; }
function parseSheet(xml, strings) {
  const rows = {};
  const rowRe = /<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  let rm;
  while ((rm = rowRe.exec(xml))) {
    const r = +rm[1]; rows[r] = {};
    const cellRe = /<c r="([A-Z]+)(\d+)"([^>]*)>([\s\S]*?)<\/c>/g;
    let cm;
    while ((cm = cellRe.exec(rm[2]))) {
      const cell = cm[3] + cm[4];
      let val = "";
      if (cell.match(/t="s"/)) { const v = cell.match(/<v>(\d+)<\/v>/); val = v ? strings[+v[1]] : ""; }
      else { const v = cell.match(/<v>([^<]*)<\/v>/); val = v ? v[1] : ""; }
      rows[r][col(cm[1])] = val;
    }
  }
  return rows;
}
const strings = parseSharedStrings(fs.readFileSync(path.join("C:\\Users\\kush\\staywithmypet\\.probe", "xl/sharedStrings.xml"), "utf8"));
const wb = fs.readFileSync(path.join("C:\\Users\\kush\\staywithmypet\\.probe", "xl/workbook.xml"), "utf8");
const sheetNames = [...wb.matchAll(/name="([^"]+)"/g)].map((m) => m[1]);
const sheetIndex = Object.fromEntries(sheetNames.map((n, i) => [n, i + 1]));
const xml = fs.readFileSync(path.join("C:\\Users\\kush\\staywithmypet\\.probe", `xl/worksheets/sheet${sheetIndex["Terms of Use"]}.xml`), "utf8");
const termsRows = parseSheet(xml, strings);
const termsMax = Math.max(...Object.keys(termsRows).map(Number), 0);
const blocks = extractLegalBlocks(termsRows, termsMax, { enCol: 2, etCol: 4, titleEn: "Terms of Use" });
const hits = blocks.filter((b) => /18\. Contact|Lareflexion|Juhkentali 16/.test(b.en));
console.log(hits);
