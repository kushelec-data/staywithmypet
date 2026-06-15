/**
 * Regenerates src/lib/generated/care-types-content.ts from EST and ENG texts.xlsx (services sheet)
 * Run: node scripts/sync-care-types.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const xlsxPath = path.join(root, "EST and ENG texts.xlsx");
const outPath = path.join(root, "src/lib/generated/care-types-content.ts");
const outMissing = path.join(root, "src/lib/generated/care-types-missing.json");
const zipPath = path.join(root, ".care-types-sync.zip");
const extractDir = path.join(root, ".care-types-sync");

const SECTION_HEADERS = [
  ["Overnight Pet Care / 24h Stay in a Home Environment", "overnight-care"],
  ["Dog Walks & Outdoor Care", "walks"],
  ["Pet Daycare in a Home Environment", "daycare"],
  ["Pet Home Visits", "home-visits"],
  ["Feeding Only Visits", "feeding-only"],
  ["Play Visits & Companionship", "play-visits"],
];

const SLUG_ORDER = [
  "daycare",
  "walks",
  "overnight-care",
  "home-visits",
  "feeding-only",
  "play-visits",
];

const STATIC = {
  daycare: {
    name: { en: "Daycare", et: "Päevahoid" },
    secondaryHref: "/how-it-works",
    secondaryLabel: { en: "How pet sharing works", et: "Loe, kuidas lemmikute jagamine toimib" },
    imageSrc: "/images/trust/real-homes-care.jpg",
    imageAlt: {
      en: "Pet Friend providing gentle home-based daycare",
      et: "Loomasõber pakub rahulikku kodust päevahoidu",
    },
  },
  walks: {
    name: { en: "Walks", et: "Jalutised" },
    secondaryHref: "/#services",
    secondaryLabel: { en: "Explore other care options", et: "Tutvu ka teiste hoiuvõimalustega" },
  },
  "overnight-care": {
    name: { en: "Overnight care", et: "Ööhoid" },
    secondaryHref: "/#services",
    secondaryLabel: { en: "Compare care options", et: "Võrdle hooldusviise" },
  },
  "home-visits": {
    name: { en: "Home Visits", et: "Kodukülastused" },
    secondaryHref: "/#services",
    secondaryLabel: { en: "Compare care types", et: "Võrdle erinevaid hoiu- ja seltsivõimalusi" },
  },
  "feeding-only": {
    name: { en: "Feeding only", et: "Ainult toitmine" },
    secondaryHref: "/care/play-visits",
    secondaryLabel: { en: "Explore play visits", et: "Tutvu mängu- ja seltsikülastustega" },
  },
  "play-visits": {
    name: { en: "Play visits", et: "Mängukülastused" },
    secondaryHref: "/care/overnight-care",
    secondaryLabel: {
      en: "View daycare and overnight options",
      et: "Tutvu päevahoiu ja ööpäevaringse hoiu võimalustega",
    },
  },
};

function ensureExtracted() {
  if (fs.existsSync(extractDir)) return;
  fs.copyFileSync(xlsxPath, zipPath);
  execSync(
    `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${extractDir.replace(/'/g, "''")}' -Force"`,
    { stdio: "inherit" },
  );
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

function isEstonian(text) {
  const t = (text ?? "").trim();
  if (!t) return false;
  if (/[õäüöÕÄÜÖ]/.test(t)) return true;
  return /\b(kuidas|lemmik|looma|hoid|jalut|päev|öö|kodu|sobib|vajab)\b/i.test(t) && !/\b(the|and|your|with|what|who|why|how)\b/i.test(t);
}

function pickPair(en, et) {
  const enT = (en ?? "").trim();
  let etT = (et ?? "").trim();
  if (!etT && isEstonian(enT)) etT = enT;
  return { en: enT, et: etT };
}

function shouldSkipEn(en) {
  const t = (en ?? "").trim();
  if (!t) return true;
  if (/^(ENG|EST|Primary CTA|or)$/i.test(t)) return true;
  if (/^\(Leads to /i.test(t)) return true;
  if (/^👉/.test(t)) return true;
  if (/^Not sure/i.test(t) && t.length < 60) return true;
  if (/^Still deciding/i.test(t)) return true;
  if (/^Looking for /i.test(t)) return true;
  if (/^Need longer care/i.test(t)) return true;
  if (/^A safer, more personal/i.test(t)) return true;
  return false;
}

function isSectionTitle(en) {
  const t = (en ?? "").trim();
  return /^(What|Who|Why|How)\b/.test(t);
}

function isCtaTitle(en) {
  const t = (en ?? "").trim();
  return /^(Ready|Explore|Find|Need|See pets|Browse)/i.test(t);
}

function isBulletLead(en) {
  const t = (en ?? "").trim();
  return (
    /^(With Stay With My Pet|Unlike|You avoid|A pet friend|Dog walks are ideal|Daycare is ideal|Home visits are ideal|Feeding-only visits are perfect|Play visits are great|Overnight pet care is ideal|at the pet friend)/i.test(
      t,
    ) || /^🐾|^🏡|^👤|^❤️|^📅|^🔁|^🕒|^🏠|^🌿|^🚗|^👥|^😌/.test(t)
  );
}

function looksLikeBullet(en) {
  const t = (en ?? "").trim();
  if (!t || t.length > 120) return false;
  if (/^(Pets|Dogs|Cats|Owners|Working|Senior|Fish|Rodents|Young|Social|at the|at your own)/i.test(t)) return true;
  if (/^(Playing|Cuddling|Engaging|Feed your|Refresh|Clean|Spend|Unnecessary|Moving|Stressful)/i.test(t)) return true;
  if (/^🐾|^🏡|^👤|^❤️|^📅|^🔁|^🕒|^🏠|^🌿|^🚗/.test(t)) return true;
  return false;
}

function cleanCtaLabel(text) {
  return (text ?? "").replace(/^👉\s*/, "").trim();
}

function splitSections(sheetRows) {
  const maxR = Math.max(...Object.keys(sheetRows).map(Number));
  const pairs = [];
  for (let r = 1; r <= maxR; r++) {
    const { en, et } = pickPair(sheetRows[r]?.[1], sheetRows[r]?.[3]);
    if (en || et) pairs.push({ r, en, et });
  }

  const sections = {};
  for (let i = 0; i < SECTION_HEADERS.length; i++) {
    const [header, slug] = SECTION_HEADERS[i];
    const start = pairs.findIndex((p) => p.en === header);
    if (start < 0) continue;
    const end =
      i + 1 < SECTION_HEADERS.length
        ? pairs.findIndex((p, idx) => idx > start && p.en === SECTION_HEADERS[i + 1][0])
        : pairs.length;
    sections[slug] = pairs.slice(start, end === -1 ? undefined : end);
  }
  return sections;
}

function takeIntro(rows) {
  const en = [];
  const et = [];
  let i = 2;
  while (i < rows.length && !isSectionTitle(rows[i].en)) {
    if (!shouldSkipEn(rows[i].en)) {
      en.push(rows[i].en);
      et.push(rows[i].et || rows[i].en);
    }
    i++;
  }
  return {
    introEn: en.join("\n\n"),
    introEt: et.join("\n\n"),
    index: i,
  };
}

function findSection(rows, pattern) {
  const idx = rows.findIndex((r) => pattern.test(r.en));
  return idx >= 0 ? idx : -1;
}

function collectRowsUntil(rows, startIdx, kind) {
  if (startIdx < 0) {
    return { title: { en: "", et: "" }, paragraphs: [], bullets: [] };
  }
  const title = pickPair(rows[startIdx].en, rows[startIdx].et);
  const paragraphs = [];
  const bullets = [];
  let i = startIdx + 1;

  const stop = () =>
    i >= rows.length || isSectionTitle(rows[i].en) || isCtaTitle(rows[i].en);

  if (kind === "who") {
    while (!stop()) {
      const row = rows[i];
      if (shouldSkipEn(row.en)) {
        i++;
        continue;
      }
      if (/ideal for:|perfect for:|great for:/i.test(row.en)) {
        i++;
        continue;
      }
      bullets.push(pickPair(row.en, row.et));
      i++;
    }
    return { title, paragraphs, bullets };
  }

  if (kind === "how") {
    while (!stop()) {
      const row = rows[i];
      if (shouldSkipEn(row.en)) {
        i++;
        continue;
      }
      if (isEstonian(row.en) && !row.et) {
        i++;
        continue;
      }
      bullets.push(pickPair(row.en, row.et));
      i++;
    }
    return { title, paragraphs, bullets };
  }

  // "what" and default
  while (!stop()) {
    const row = rows[i];
    if (shouldSkipEn(row.en)) {
      i++;
      continue;
    }
    if (/visits your home to:|spends time:/i.test(row.en)) {
      i++;
      while (!stop() && (looksLikeBullet(rows[i].en) || rows[i].en.length < 100)) {
        bullets.push(pickPair(rows[i].en, rows[i].et));
        i++;
      }
      break;
    }
    if (looksLikeBullet(row.en)) {
      bullets.push(pickPair(row.en, row.et));
    } else {
      paragraphs.push(pickPair(row.en, row.et));
    }
    i++;
  }

  return { title, paragraphs, bullets };
}

function parseContentSection(rows, startIdx, kind = "what") {
  return collectRowsUntil(rows, startIdx, kind);
}

function parseWhyChoose(rows, startIdx) {
  if (startIdx < 0) return { title: { en: "", et: "" }, paragraphs: [], bullets: [] };
  const title = pickPair(rows[startIdx].en, rows[startIdx].et);
  const paragraphs = [];
  const bullets = [];
  let i = startIdx + 1;
  while (i < rows.length && !isSectionTitle(rows[i].en) && !isCtaTitle(rows[i].en)) {
    const row = rows[i];
    if (shouldSkipEn(row.en)) {
      i++;
      continue;
    }
    if (/^With Stay With My Pet/i.test(row.en)) {
      i++;
      while (i < rows.length && !isSectionTitle(rows[i].en) && !isCtaTitle(rows[i].en)) {
        const b = rows[i];
        if (shouldSkipEn(b.en)) break;
        if (looksLikeBullet(b.en) || b.en.length < 90) {
          bullets.push(pickPair(b.en, b.et));
          i++;
        } else break;
      }
      break;
    }
    if (/^Unlike /i.test(row.en)) {
      paragraphs.push(pickPair(row.en, row.et));
      i++;
      continue;
    }
    if (/^You avoid/i.test(row.en)) {
      i++;
      while (i < rows.length && looksLikeBullet(rows[i].en)) {
        bullets.push(pickPair(rows[i].en, rows[i].et));
        i++;
      }
      break;
    }
    if (looksLikeBullet(row.en)) {
      bullets.push(pickPair(row.en, row.et));
    } else if (row.en.length < 160) {
      paragraphs.push(pickPair(row.en, row.et));
    }
    i++;
  }
  return { title, paragraphs, bullets };
}

function parseCta(rows) {
  const ctaIdx = rows.findIndex((r) => isCtaTitle(r.en));
  if (ctaIdx < 0) {
    return {
      title: { en: "", et: "" },
      description: { en: "", et: "" },
      primaryLabel: { en: "", et: "" },
    };
  }
  const title = pickPair(rows[ctaIdx].en, rows[ctaIdx].et);
  let primary = { en: "", et: "" };
  let description = { en: "", et: "" };

  for (let i = ctaIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (shouldSkipEn(row.en)) continue;
    if (/^Primary CTA$/i.test(row.en) && row.et) {
      primary = { en: cleanCtaLabel(row.en), et: cleanCtaLabel(row.et) };
      continue;
    }
    if (/^Find |^See pets|^Browse available|^Need simple|^Explore play/i.test(row.en)) {
      if (!primary.en) primary = pickPair(row.en, row.et);
      else if (!description.en) description = pickPair(row.en, row.et);
      continue;
    }
    if (row.et && /^👉/.test(row.et) && !primary.et) {
      primary.et = cleanCtaLabel(row.et);
    }
  }

  if (!primary.en) {
    const findRow = rows.find((r) => /^Find |^See pets/i.test(r.en));
    if (findRow) primary = pickPair(findRow.en, findRow.et);
  }

  // strip parenthetical notes from primary EN
  primary.en = primary.en.replace(/\s*\(Leads to[^)]*\)\s*/gi, "").trim();
  if (primary.et && !isEstonian(primary.et)) {
    const etRow = rows.find((r) => r.et && /^👉/.test(r.et));
    if (etRow) primary.et = cleanCtaLabel(etRow.et);
  }

  return { title, description, primaryLabel: primary };
}

function buildLocaleCopy(rows, slug) {
  const metaTitle = pickPair(rows[0].en, rows[0].et);
  const hero = pickPair(rows[1].en, rows[1].et);
  const { introEn, introEt } = takeIntro(rows);

  const whatIdx = findSection(rows, /^What /);
  const whoIdx = findSection(rows, /^Who /);
  const whyIdx = findSection(rows, /^Why /);
  const howIdx = findSection(rows, /^How /);

  const whatIsIt = parseContentSection(rows, whatIdx, "what");
  const whoIsItFor = parseContentSection(rows, whoIdx, "who");
  const whyChoose = parseWhyChoose(rows, whyIdx);
  const howItWorks = parseContentSection(rows, howIdx, "how");
  const cta = parseCta(rows);

  const staticMeta = STATIC[slug];
  const cardSummary = {
    en: introEn.split("\n\n")[0] || hero.en,
    et: introEt.split("\n\n")[0] || hero.et,
  };

  return {
    slug,
    name: staticMeta.name,
    meta: {
      title: metaTitle,
      description: {
        en: introEn.split("\n\n").slice(0, 2).join(" ") || hero.en,
        et: introEt.split("\n\n").slice(0, 2).join(" ") || hero.et,
      },
    },
    heroTitle: hero,
    intro: { en: introEn, et: introEt },
    cardSummary,
    whatIsIt,
    whoIsItFor,
    whyChoose,
    howItWorks,
    cta,
    secondaryLabel: staticMeta.secondaryLabel,
    secondaryHref: staticMeta.secondaryHref,
    imageSrc: staticMeta.imageSrc,
    imageAlt: staticMeta.imageAlt,
  };
}

function localizePair(pair, locale) {
  if (locale === "et") return pair.et || (isEstonian(pair.en) ? pair.en : "");
  if (isEstonian(pair.en) && !pair.et) return "";
  return pair.en || "";
}

function toSectionTs(section, locale) {
  const title = localizePair(section.title, locale) || section.title.en || "";
  const paragraphs = section.paragraphs
    .map((p) => localizePair(p, locale))
    .filter(Boolean);
  const bullets = section.bullets.map((b) => localizePair(b, locale)).filter(Boolean);
  const out = { title };
  if (paragraphs.length) out.paragraphs = paragraphs;
  if (bullets.length) out.bullets = bullets;
  return out;
}

function esc(s) {
  return JSON.stringify(s);
}

function emitCopy(copy) {
  const lines = [];
  lines.push(`  ${esc(copy.slug)}: {`);
  lines.push(`    name: { en: ${esc(copy.name.en)}, et: ${esc(copy.name.et)} },`);
  lines.push(`    meta: {`);
  lines.push(`      title: { en: ${esc(copy.meta.title.en)}, et: ${esc(copy.meta.title.et)} },`);
  lines.push(
    `      description: { en: ${esc(copy.meta.description.en)}, et: ${esc(copy.meta.description.et)} },`,
  );
  lines.push(`    },`);
  lines.push(`    heroTitle: { en: ${esc(copy.heroTitle.en)}, et: ${esc(copy.heroTitle.et)} },`);
  lines.push(`    intro: { en: ${esc(copy.intro.en)}, et: ${esc(copy.intro.et)} },`);
  lines.push(`    cardSummary: { en: ${esc(copy.cardSummary.en)}, et: ${esc(copy.cardSummary.et)} },`);

  for (const key of ["whatIsIt", "whoIsItFor", "whyChoose", "howItWorks"]) {
    lines.push(`    ${key}: {`);
    lines.push(`      en: ${JSON.stringify(toSectionTs(copy[key], "en"), null, 8).replace(/\n/g, "\n      ")},`);
    lines.push(`      et: ${JSON.stringify(toSectionTs(copy[key], "et"), null, 8).replace(/\n/g, "\n      ")},`);
    lines.push(`    },`);
  }

  lines.push(`    cta: {`);
  lines.push(`      title: { en: ${esc(copy.cta.title.en)}, et: ${esc(copy.cta.title.et)} },`);
  lines.push(
    `      description: { en: ${esc(copy.cta.description.en)}, et: ${esc(copy.cta.description.et)} },`,
  );
  lines.push(
    `      primaryLabel: { en: ${esc(copy.cta.primaryLabel.en)}, et: ${esc(copy.cta.primaryLabel.et)} },`,
  );
  lines.push(
    `      secondaryLabel: { en: ${esc(copy.secondaryLabel.en)}, et: ${esc(copy.secondaryLabel.et)} },`,
  );
  lines.push(`      secondaryHref: ${esc(copy.secondaryHref)},`);
  if (copy.imageSrc) {
    lines.push(`      imageSrc: ${esc(copy.imageSrc)},`);
    lines.push(
      `      imageAlt: { en: ${esc(copy.imageAlt.en)}, et: ${esc(copy.imageAlt.et)} },`,
    );
  }
  lines.push(`    },`);
  lines.push(`  },`);
  return lines.join("\n");
}

ensureExtracted();
const wb = fs.readFileSync(path.join(extractDir, "xl/workbook.xml"), "utf8");
const sheetNames = [...wb.matchAll(/name="([^"]+)"/g)].map((m) => m[1]);
const servicesIdx = sheetNames.indexOf("services") + 1;
if (!servicesIdx) {
  console.error("services sheet not found");
  process.exit(1);
}

const strings = parseSharedStrings(
  fs.readFileSync(path.join(extractDir, "xl/sharedStrings.xml"), "utf8"),
);
const sheetRows = parseSheet(
  fs.readFileSync(path.join(extractDir, `xl/worksheets/sheet${servicesIdx}.xml`), "utf8"),
  strings,
);

const sections = splitSections(sheetRows);
const copies = {};
const missing = [];

for (const slug of SLUG_ORDER) {
  const rows = sections[slug];
  if (!rows?.length) {
    missing.push({ slug, issue: "section not found in Excel" });
    continue;
  }
  copies[slug] = buildLocaleCopy(rows, slug);

  for (const field of ["heroTitle", "intro"]) {
    if (!copies[slug][field]?.et) missing.push({ slug, field, locale: "et" });
  }
  for (const section of ["whatIsIt", "whoIsItFor", "whyChoose", "howItWorks"]) {
    if (!copies[slug][section].title.et) missing.push({ slug, section: `${section}.title`, locale: "et" });
  }
  if (!copies[slug].cta.primaryLabel.et) missing.push({ slug, field: "cta.primaryLabel", locale: "et" });
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
const body = SLUG_ORDER.map((slug) => (copies[slug] ? emitCopy(copies[slug]) : "")).filter(Boolean).join("\n");

const ts = `/** Generated by scripts/sync-care-types.mjs — do not edit manually */\n\nexport type CareTypeLocaleSection = {\n  title: string;\n  paragraphs?: string[];\n  bullets?: string[];\n};\n\nexport type CareTypeLocaleCopy = {\n  name: { en: string; et: string };\n  meta: { title: { en: string; et: string }; description: { en: string; et: string } };\n  heroTitle: { en: string; et: string };\n  intro: { en: string; et: string };\n  cardSummary: { en: string; et: string };\n  whatIsIt: { en: CareTypeLocaleSection; et: CareTypeLocaleSection };\n  whoIsItFor: { en: CareTypeLocaleSection; et: CareTypeLocaleSection };\n  whyChoose: { en: CareTypeLocaleSection; et: CareTypeLocaleSection };\n  howItWorks: { en: CareTypeLocaleSection; et: CareTypeLocaleSection };\n  cta: {\n    title: { en: string; et: string };\n    description: { en: string; et: string };\n    primaryLabel: { en: string; et: string };\n    secondaryLabel: { en: string; et: string };\n    secondaryHref: string;\n    imageSrc?: string;\n    imageAlt?: { en: string; et: string };\n  };\n};\n\nexport const CARE_TYPES_LOCALE_COPY: Record<string, CareTypeLocaleCopy> = {\n${body}\n};\n`;

fs.writeFileSync(outPath, ts);
fs.writeFileSync(outMissing, JSON.stringify(missing, null, 2));

console.log(`Wrote ${outPath}`);
console.log(`Services synced: ${Object.keys(copies).length}`);
if (missing.length) {
  console.log(`Missing ET fields: ${missing.length}`);
  for (const m of missing.slice(0, 20)) console.log(" -", m);
}
