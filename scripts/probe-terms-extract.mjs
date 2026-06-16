// Quick probe: simulate terms extraction for rows 140-148
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sync = fs.readFileSync(path.join(root, "scripts/sync-site-texts.mjs"), "utf8");
// Evaluate only the helper functions by extracting the block before parseContact
const helperEnd = sync.indexOf("function parseContact");
const helperStart = sync.indexOf("const SKIP_PATTERNS");
const helpers = sync.slice(helperStart, helperEnd);
const xlsxPath = path.join(root, "EST and ENG texts.xlsx");
const zipPath = path.join(root, ".probe.zip");
const extractDir = path.join(root, ".probe");
if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true });
fs.copyFileSync(xlsxPath, zipPath);
fs.mkdirSync(extractDir, { recursive: true });
execSync(`powershell -NoProfile -Command "Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${extractDir.replace(/'/g, "''")}' -Force"`, { stdio: "inherit" });

const prelude = `
import fs from "node:fs";
import path from "node:path";
${helpers}
function parseSharedStrings(xml) {
  const strings = [];
  const re = /<si>([\\s\\S]*?)<\\/si>/g;
  let m;
  while ((m = re.exec(xml))) {
    const texts = [...m[1].matchAll(/<t[^>]*>([\\s\\S]*?)<\\/t>/g)].map((x) => x[1]);
    strings.push(texts.join(""));
  }
  return strings;
}
function col(s) { let n = 0; for (const c of s) n = n * 26 + (c.charCodeAt(0) - 64); return n; }
function parseSheet(xml, strings) {
  const rows = {};
  const rowRe = /<row[^>]*r="(\\d+)"[^>]*>([\\s\\S]*?)<\\/row>/g;
  let rm;
  while ((rm = rowRe.exec(xml))) {
    const r = +rm[1]; rows[r] = {};
    const cellRe = /<c r="([A-Z]+)(\\d+)"([^>]*)>([\\s\\S]*?)<\\/c>/g;
    let cm;
    while ((cm = cellRe.exec(rm[2]))) {
      const cell = cm[3] + cm[4];
      let val = "";
      if (cell.match(/t="s"/)) { const v = cell.match(/<v>(\\d+)<\\/v>/); val = v ? strings[+v[1]] : ""; }
      else { const v = cell.match(/<v>([^<]*)<\\/v>/); val = v ? v[1] : ""; }
      rows[r][col(cm[1])] = val;
    }
  }
  return rows;
}
const strings = parseSharedStrings(fs.readFileSync(path.join(${JSON.stringify(extractDir)}, "xl/sharedStrings.xml"), "utf8"));
const wb = fs.readFileSync(path.join(${JSON.stringify(extractDir)}, "xl/workbook.xml"), "utf8");
const sheetNames = [...wb.matchAll(/name="([^"]+)"/g)].map((m) => m[1]);
const sheetIndex = Object.fromEntries(sheetNames.map((n, i) => [n, i + 1]));
const xml = fs.readFileSync(path.join(${JSON.stringify(extractDir)}, \`xl/worksheets/sheet\${sheetIndex["Terms of Use"]}.xml\`), "utf8");
const termsRows = parseSheet(xml, strings);
const termsMax = Math.max(...Object.keys(termsRows).map(Number), 0);
const blocks = extractLegalBlocks(termsRows, termsMax, { enCol: 2, etCol: 4, titleEn: "Terms of Use" });
const hits = blocks.filter((b) => /18\\. Contact|Lareflexion|Juhkentali 16/.test(b.en));
console.log(hits);
`;

const probePath = path.join(root, "scripts/.probe-extract.mjs");
fs.writeFileSync(probePath, prelude);
execSync(`node ${probePath}`, { stdio: "inherit", cwd: root });
fs.unlinkSync(probePath);
