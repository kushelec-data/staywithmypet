import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const xlsxPath = path.join(root, "EST and ENG texts.xlsx");
const zipPath = path.join(root, ".dump2.zip");
const extractDir = path.join(root, ".dump2");

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
const xml = fs.readFileSync(
  path.join(extractDir, `xl/worksheets/sheet${sheetIndex["privacy policy"]}.xml`),
  "utf8",
);
const rows = parseSheet(xml, strings);

console.log("=== Section 2 EN col2 ===");
for (let r = 27; r <= 54; r++) {
  const c2 = getCell(rows, r, 2);
  if (c2) console.log(`R${r}: ${c2.slice(0, 70)}`);
}
console.log("\n=== Section 2 ET col3 ===");
for (let r = 27; r <= 54; r++) {
  const c3 = getCell(rows, r, 3);
  if (c3) console.log(`R${r}: ${c3.slice(0, 70)}`);
}
console.log("\n=== Section 2 ET col2 interleaved ===");
for (let r = 27; r <= 54; r++) {
  const c2 = getCell(rows, r, 2);
  if (c2 && /[õäüöÕÄÜÖ]/.test(c2)) console.log(`R${r}: ${c2.slice(0, 70)}`);
}
