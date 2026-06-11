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

const missing = JSON.parse(
  fs.readFileSync(path.join(root, "src/i18n/generated/site-missing-translations.json"), "utf8"),
);

for (const sheet of ["privacy policy", "Terms of Use", "Safety guidelines"]) {
  const rows = parseSheet(
    fs.readFileSync(path.join(extractDir, `xl/worksheets/sheet${idx[sheet]}.xml`), "utf8"),
    strings,
  );
  const maxR = Math.max(...Object.keys(rows).map(Number));
  console.log(`\n=== ${sheet} (missing lookup) ===`);
  for (const item of missing.filter((m) => m.key.includes(sheet.split(" ")[0].toLowerCase()) || 
    (sheet.includes("Terms") && m.key === "legal.terms") ||
    (sheet.includes("Safety") && m.key === "legal.safety") ||
    (sheet.includes("privacy") && m.key === "legal.privacy"))) {
    const needle = item.en.replace(/…$/, "").slice(0, 40);
    for (let r = 1; r <= maxR; r++) {
      for (let c = 2; c <= 6; c++) {
        const v = rows[r]?.[c] ?? "";
        if (!v.includes(needle) && !needle.includes(v.slice(0, 20))) continue;
        if (v.length < 3) continue;
        const cells = [2, 3, 4, 5, 6]
          .map((cc) => ({ c: cc, v: rows[r]?.[cc] ?? "" }))
          .filter((x) => x.v);
        const below = [2, 3, 4, 5, 6]
          .map((cc) => ({ c: cc, v: rows[r + 1]?.[cc] ?? "" }))
          .filter((x) => x.v);
        console.log(`\nMISSING: ${item.en.slice(0, 70)}`);
        console.log(`  R${r}:`, cells.map((x) => `C${x.c}:${x.v.slice(0, 90)}`).join(" | "));
        if (below.length) console.log(`  R${r + 1}:`, below.map((x) => `C${x.c}:${x.v.slice(0, 90)}`).join(" | "));
        break;
      }
    }
  }
}
