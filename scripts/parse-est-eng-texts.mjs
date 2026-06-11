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
  console.log("");
}
