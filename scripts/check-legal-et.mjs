import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(root, "src/lib/site-texts.ts"), "utf8");

const suspect = [];
const re = /en: "((?:\\.|[^"\\])*)",\s*\n\s*et: "((?:\\.|[^"\\])*)"/g;
let m;
while ((m = re.exec(src))) {
  const en = m[1];
  const et = m[2];
  const looksEn =
    /\b(the|and|your|our|we|this|with|for|you|shall|must|Users|Service|Platform|Performance|Contract|Legitimate)\b/i.test(
      et,
    );
  const looksEt = /[õäüöÕÄÜÖ]/.test(et) || /\b(ja |või |ning |kui |ei |on |teie |meie )\b/i.test(et);
  if (looksEn && !looksEt) suspect.push({ en: en.slice(0, 70), et: et.slice(0, 90) });
}

console.log(`Blocks with likely-English ET: ${suspect.length}`);
for (const row of suspect.slice(0, 20)) {
  console.log(`- EN: ${row.en}`);
  console.log(`  ET: ${row.et}`);
}
