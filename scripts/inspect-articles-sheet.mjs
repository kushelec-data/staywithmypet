/**
 * Inspect Articles sheet in EST and ENG texts.xlsx
 * Run: node scripts/inspect-articles-sheet.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extractDir = path.join(root, ".xlsx-extract-ESTandENGtextsxlsx");

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

const strings = parseSharedStrings(
  fs.readFileSync(path.join(extractDir, "xl/sharedStrings.xml"), "utf8"),
);
const xml = fs.readFileSync(path.join(extractDir, "xl/worksheets/sheet11.xml"), "utf8");
const rows = parseSheet(xml, strings);
const maxR = Math.max(...Object.keys(rows).map(Number));

console.log("Articles sheet rows:", maxR);
console.log("");

for (let r = 1; r <= maxR; r++) {
  if (!rows[r]) continue;
  const cols = [];
  for (let c = 1; c <= 8; c++) {
    const v = rows[r][c] || "";
    cols.push(v.length > 100 ? v.slice(0, 100) + "…" : v);
  }
  if (cols.some((v) => v)) {
    console.log(`R${r}:`, cols.join(" | "));
  }
}
