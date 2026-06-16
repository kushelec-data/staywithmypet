import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const xlsxPath = path.join(root, "EST and ENG texts.xlsx");
const zipPath = path.join(root, ".legal-debug.zip");
const extractDir = path.join(root, ".legal-debug");

if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true });
fs.copyFileSync(xlsxPath, zipPath);
fs.mkdirSync(extractDir, { recursive: true });
execSync(
  `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${extractDir.replace(/'/g, "''")}' -Force"`,
  { stdio: "inherit" },
);

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

const strings = parseSharedStrings(
  fs.readFileSync(path.join(extractDir, "xl/sharedStrings.xml"), "utf8"),
);
const wb = fs.readFileSync(path.join(extractDir, "xl/workbook.xml"), "utf8");
const sheetNames = [...wb.matchAll(/name="([^"]+)"/g)].map((m) => m[1]);
const sheetIndex = Object.fromEntries(sheetNames.map((n, i) => [n, i + 1]));

function loadSheet(name) {
  const xml = fs.readFileSync(
    path.join(extractDir, `xl/worksheets/sheet${sheetIndex[name]}.xml`),
    "utf8",
  );
  return parseSheet(xml, strings);
}

function dumpSheet(name, enCol, etCol, start = 1, end = 120) {
  const rows = loadSheet(name);
  console.log(`\n=== ${name} enCol=${enCol} etCol=${etCol} rows ${start}-${end} ===`);
  for (let r = start; r <= end; r++) {
    const cols = {};
    for (let c = 2; c <= 5; c++) cols[c] = getCell(rows, r, c);
    const en = getCell(rows, r, enCol);
    const et = getCell(rows, r, etCol);
    if (!en && !et && !cols[2] && !cols[3] && !cols[4]) continue;
    console.log(
      `R${r}`,
      `C2=${JSON.stringify(cols[2].slice(0, 60))}`,
      `C3=${JSON.stringify(cols[3].slice(0, 60))}`,
      `C4=${JSON.stringify(cols[4].slice(0, 60))}`,
    );
  }
}

dumpSheet("privacy policy", 2, 3, 1, 45);
dumpSheet("privacy policy", 2, 3, 55, 115);
// Find terms contact section rows
const termsRows = loadSheet("Terms of Use");
const termsMax = Math.max(...Object.keys(termsRows).map(Number), 0);
console.log("termsMax", termsMax);
dumpSheet("privacy policy", 2, 3, 115, 180);
