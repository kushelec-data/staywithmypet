/**
 * One-off parser for reference vet clinic files → JSON on stdout.
 * DOCX: unzip word/document.xml; XLSX: unzip sheet + sharedStrings.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const docxPath = path.join(
  root,
  "reference-old-site",
  "Nearby Veterinary Clinics in Estonia.docx",
);
const xlsxPath = path.join(root, "reference-old-site", "Vet Clinics list.xlsx");

async function readZipEntries(filePath) {
  const { default: AdmZip } = await import("adm-zip").catch(() => ({ default: null }));
  if (AdmZip) {
    const zip = new AdmZip(filePath);
    const map = new Map();
    for (const e of zip.getEntries()) {
      if (!e.isDirectory) map.set(e.entryName, e.getData().toString("utf8"));
    }
    return map;
  }
  // fallback: use child_process unzip on Windows
  const { execSync } = await import("child_process");
  const os = await import("os");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vet-parse-"));
  execSync(
    `powershell -NoProfile -Command "Expand-Archive -Path '${filePath.replace(/'/g, "''")}' -DestinationPath '${tmp.replace(/'/g, "''")}' -Force"`,
    { stdio: "pipe" },
  );
  const map = new Map();
  function walk(dir, prefix = "") {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const rel = prefix ? `${prefix}/${name}` : name;
      if (fs.statSync(full).isDirectory()) walk(full, rel);
      else map.set(rel.replace(/\\/g, "/"), fs.readFileSync(full, "utf8"));
    }
  }
  // docx/xlsx are zip — Expand-Archive won't work on .docx directly in older PS
  throw new Error("adm-zip required");
}

function parseDocxXml(xml) {
  const text = xml
    .replace(/<w:tab[^/]*\/>/g, "\t")
    .replace(/<w:br[^/]*\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  return text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function colLettersToIndex(col) {
  let n = 0;
  for (const c of col) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}

function parseXlsxSharedStrings(xml) {
  const strings = [];
  const siRe = /<si>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = siRe.exec(xml))) {
    const tRe = /<t[^>]*>([^<]*)<\/t>/g;
    let parts = "";
    let tm;
    while ((tm = tRe.exec(m[1]))) parts += tm[1];
    strings.push(parts);
  }
  return strings;
}

function parseXlsxSheet(xml, shared) {
  const rows = [];
  const rowRe = /<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  let rm;
  while ((rm = rowRe.exec(xml))) {
    const cells = {};
    const cellRe = /<c r="([A-Z]+)(\d+)"([^>]*)>([\s\S]*?)<\/c>/g;
    let cm;
    while ((cm = cellRe.exec(rm[2]))) {
      const col = colLettersToIndex(cm[1]);
      const row = Number(cm[2]);
      const attrs = cm[3];
      const inner = cm[4];
      let val = "";
      const vMatch = inner.match(/<v>([^<]*)<\/v>/);
      if (vMatch) {
        val = vMatch[1];
        if (attrs.includes('t="s"')) val = shared[Number(val)] ?? "";
      } else {
        const tMatch = inner.match(/<t[^>]*>([^<]*)<\/t>/);
        if (tMatch) val = tMatch[1];
      }
      if (!cells[row]) cells[row] = {};
      cells[row][col] = val.trim();
    }
    const rowNum = Number(rm[1]);
    const rowObj = cells[rowNum] ?? {};
    const maxCol = Math.max(-1, ...Object.keys(rowObj).map(Number));
    const arr = [];
    for (let c = 0; c <= maxCol; c++) arr.push(rowObj[c] ?? "");
    if (arr.some(Boolean)) rows.push(arr);
  }
  return rows;
}

async function loadZip(filePath) {
  const { default: JSZip } = await import("jszip");
  const buf = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buf);
  const map = new Map();
  for (const [name, entry] of Object.entries(zip.files)) {
    if (!entry.dir) map.set(name, await entry.async("string"));
  }
  return map;
}

async function main() {
  const docZip = await loadZip(docxPath);
  const docXml = docZip.get("word/document.xml");
  const docLines = parseDocxXml(docXml ?? "");

  const xlsZip = await loadZip(xlsxPath);
  const sharedXml = xlsZip.get("xl/sharedStrings.xml") ?? "";
  const sheetXml =
    xlsZip.get("xl/worksheets/sheet1.xml") ??
    [...xlsZip.keys()].find((k) => k.startsWith("xl/worksheets/") && xlsZip.get(k));
  const shared = parseXlsxSharedStrings(sharedXml);
  const sheetRows = parseXlsxSheet(slsZip.get(sheetXml) ?? sheetXml, shared);

  console.log(JSON.stringify({ docLines, sheetRows, docLineCount: docLines.length, sheetRowCount: sheetRows.length }, null, 2));
}

// fix typo
async function mainFixed() {
  const docZip = await loadZip(docxPath);
  const docXml = docZip.get("word/document.xml");
  const docLines = parseDocxXml(docXml ?? "");

  const xlsZip = await loadZip(xlsxPath);
  const sharedXml = xlsZip.get("xl/sharedStrings.xml") ?? "";
  let sheetXml = xlsZip.get("xl/worksheets/sheet1.xml");
  if (!sheetXml) {
    for (const k of xlsZip.keys()) {
      if (k.startsWith("xl/worksheets/") && k.endsWith(".xml")) {
        sheetXml = xlsZip.get(k);
        break;
      }
    }
  }
  const shared = parseXlsxSharedStrings(sharedXml);
  const sheetRows = parseXlsxSheet(sheetXml ?? "", shared);

  const outPath = path.join(__dirname, "vet-clinics-raw.json");
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      { docLines, sheetRows, docLineCount: docLines.length, sheetRowCount: sheetRows.length },
      null,
      2,
    ),
    "utf8",
  );
  console.log("Wrote", outPath, "rows:", sheetRows.length);
}

mainFixed().catch((e) => {
  console.error(e);
  process.exit(1);
});
