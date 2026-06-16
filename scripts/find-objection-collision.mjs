import { createRequire } from "node:module";
// Run sync helpers inline
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sync = fs.readFileSync(path.join(root, "scripts/sync-site-texts.mjs"), "utf8");
const start = sync.indexOf("const SKIP_PATTERNS");
const end = sync.indexOf("function parseContact");
const helpers = sync.slice(start, end);
const fn = new Function("fs", "path", "execSync", `${helpers}
return { normalizeKey, extractPrivacyBlocks, dedupeLegalBlocks, parseSheet, parseSharedStrings, getCell, col, loadRows: null };
`);
// can't easily run - use simpler approach

function normalizeKey(text) {
  return (text ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .slice(0, 200)
    .toLowerCase();
}

const objection =
  "Objection – to object to processing based on legitimate interests, including direct marketing.";
const site = fs.readFileSync(path.join(root, "src/lib/site-texts.ts"), "utf8");
const re = /en: "((?:\\.|[^"\\])*)"/g;
let m;
const keys = [];
while ((m = re.exec(site))) {
  const en = m[1].replace(/\\"/g, '"');
  if (normalizeKey(en) === normalizeKey(objection)) {
    console.log("COLLISION:", en.slice(0, 100));
  }
}
console.log("objection key:", normalizeKey(objection));
console.log("done, scanned", keys.length);
