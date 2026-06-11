import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extractDir = path.join(root, ".site-texts-sync");

function parseSharedStrings(xml) {
  const strings = [];
  for (const m of xml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    strings.push(
      [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
        .map((x) => x[1])
        .join("")
        .replace(/&amp;/g, "&"),
    );
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
  for (const rm of xml.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const r = +rm[1];
    rows[r] = {};
    for (const cm of rm[2].matchAll(/<c r="([A-Z]+)(\d+)"([^>]*)>([\s\S]*?)<\/c>/g)) {
      const cell = cm[3] + cm[4];
      let val = "";
      if (cell.includes('t="s"')) {
        const v = cell.match(/<v>(\d+)<\/v>/);
        val = v ? strings[+v[1]] : "";
      } else {
        const v = cell.match(/<v>([^<]*)<\/v>/);
        val = v ? v[1] : "";
      }
      rows[r][col(cm[1])] = val.trim();
    }
  }
  return rows;
}

const strings = parseSharedStrings(fs.readFileSync(path.join(extractDir, "xl/sharedStrings.xml"), "utf8"));
const wb = fs.readFileSync(path.join(extractDir, "xl/workbook.xml"), "utf8");
const names = [...wb.matchAll(/name="([^"]+)"/g)].map((m) => m[1]);
const idx = Object.fromEntries(names.map((n, i) => [n, i + 1]));
const rows = parseSheet(
  fs.readFileSync(path.join(extractDir, `xl/worksheets/sheet${idx["privacy policy"]}.xml`), "utf8"),
  strings,
);

for (let r = 28; r <= 130; r++) {
  if (!rows[r]) continue;
  const parts = [];
  for (let c = 2; c <= 5; c++) {
    const v = rows[r][c];
    if (v) parts.push(`C${c}:${v.slice(0, 75)}`);
  }
  if (parts.length) console.log(`R${r}`, parts.join(" | "));
}
