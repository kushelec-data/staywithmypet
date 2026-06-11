/**
 * Debug parser for EST and ENG texts.xlsx
 * Run: node scripts/parse-est-eng-texts.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const xlsxPath = path.join(root, "EST and ENG texts.xlsx");
const zipPath = path.join(root, ".est-eng-parse.zip");
const extractDir = path.join(root, ".est-eng-parse");

function ensureExtracted() {
  if (!fs.existsSync(extractDir)) {
    fs.copyFileSync(xlsxPath, zipPath);
    execSync(`powershell -Command "Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${extractDir.replace(/'/g, "''")}' -Force"`, {
      stdio: "inherit",
    });
  }
}

function parseSharedStrings(xml) {
  const strings = [];
  const re = /<si>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = re.exec(xml))) {
    const t = m[1]
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .trim();
    strings.push(t);
  }
  return strings;
}

function col(s) {
  let n = 0;
  for (const c of s) n = n * 26 + (c.charCodeAt(0) - 64);
  return n;
}

function cellVal(cell, strings) {
  const t = cell.match(/t="s"/) ? "s" : cell.match(/t="inlineStr"/) ? "inline" : "n";
  if (t === "s") {
    const v = cell.match(/<v>(\d+)<\/v>/);
    return v ? strings[+v[1]] : "";
  }
  if (t === "inline") {
    const is = cell.match(/<t[^>]*>([^<]*)<\/t>/);
    return is ? is[1] : "";
  }
  const v = cell.match(/<v>([^<]*)<\/v>/);
  return v ? v[1] : "";
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
      rows[r][col(cm[1])] = cellVal(cm[3] + cm[4], strings);
    }
  }
  return rows;
}

ensureExtracted();
const wb = fs.readFileSync(path.join(extractDir, "xl/workbook.xml"), "utf8");
const sheetNames = [...wb.matchAll(/name="([^"]+)"/g)].map((m) => m[1]);
const strings = parseSharedStrings(fs.readFileSync(path.join(extractDir, "xl/sharedStrings.xml"), "utf8"));

console.log("Sheets:", sheetNames.join(", "));
console.log("");

function getCell(rows, r, c) {
  return (rows[r]?.[c] ?? "").trim();
}

function isClearlyEstonian(text) {
  const t = (text ?? "").trim();
  if (!t) return false;
  if (/[õäüöÕÄÜÖ]/.test(t)) return true;
  if (/^Stay With My Pet on /i.test(t)) return true;
  if (/\b(kuidas|konto|profiil|lemmik|loom|broneering|liikmelisus|sirvimine|andmeid|kogume|teenusepakkujatega)\b/i.test(t)) {
    return !/\b(the|and|your|our|we|shall|must|unless|including|between|through)\b/i.test(t);
  }
  return false;
}

function isClearlyEnglish(text) {
  const t = (text ?? "").trim();
  if (!t || isClearlyEstonian(t)) return false;
  if (/^Stay With My Pet is /i.test(t)) return true;
  return /\b(the|and|your|our|we|this|you|shall|must|with|for|users|service|platform)\b/i.test(t) || /^[A-Za-z0-9]/.test(t);
}

function pairAtRow(rows, r, enCol, etCol) {
  const en = getCell(rows, r, enCol);
  if (!isClearlyEnglish(en)) return null;
  const same = getCell(rows, r, etCol);
  if (isClearlyEstonian(same)) return { en, et: same, mode: "same-row" };
  const next = getCell(rows, r + 1, etCol);
  if (isClearlyEstonian(next)) return { en, et: next, mode: "offset-row" };
  const stacked = getCell(rows, r + 1, enCol);
  if (isClearlyEstonian(stacked)) return { en, et: stacked, mode: "stacked-col" };
  return { en, et: null, mode: "missing" };
}

const legalLayouts = {
  "privacy policy": { enCol: 2, etCol: 3 },
  "Terms of Use": { enCol: 2, etCol: 4 },
  "Safety guidelines": { enCol: 2, etCol: 3 },
};

for (let i = 1; i <= sheetNames.length; i++) {
  const name = sheetNames[i - 1];
  const xml = fs.readFileSync(path.join(extractDir, `xl/worksheets/sheet${i}.xml`), "utf8");
  const rows = parseSheet(xml, strings);
  const maxR = Math.max(...Object.keys(rows).map(Number));
  console.log(`=== ${name} (${maxR} rows) ===`);
  for (let r = 1; r <= Math.min(maxR, 15); r++) {
    if (!rows[r]) continue;
    const vals = [];
    for (let c = 1; c <= 6; c++) vals.push((rows[r][c] || "").slice(0, 100));
    if (vals.some((v) => v)) console.log(`R${r}:`, vals.join(" | "));
  }

  const layout = legalLayouts[name];
  if (layout) {
    let paired = 0;
    let missing = 0;
    const samples = [];
    for (let r = 1; r <= maxR; r++) {
      const hit = pairAtRow(rows, r, layout.enCol, layout.etCol);
      if (!hit) continue;
      if (hit.et) paired++;
      else {
        missing++;
        if (samples.length < 5) samples.push(hit.en.slice(0, 80));
      }
    }
    console.log(`  Pairing: ${paired} paired, ${missing} EN-only (raw row scan)`);
    if (samples.length) console.log(`  Unpaired samples: ${samples.join(" | ")}`);
  }
  console.log("");
}

const missingPath = path.join(root, "src/i18n/generated/site-missing-translations.json");
if (fs.existsSync(missingPath)) {
  const missing = JSON.parse(fs.readFileSync(missingPath, "utf8"));
  console.log(`site-missing-translations.json: ${missing.length} entries`);
}
