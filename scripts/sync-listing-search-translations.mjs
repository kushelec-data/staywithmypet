/**
 * Regenerates src/lib/listing-search-translations.ts from Listing search translations.xlsx
 * Run: node scripts/sync-listing-search-translations.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const xlsxPath = path.join(root, "Listing search translations.xlsx");
const outPath = path.join(root, "src/lib/listing-search-translations.ts");
const zipPath = path.join(root, ".listing-search-sync.zip");
const extractDir = path.join(root, ".listing-search-sync");

if (!fs.existsSync(xlsxPath)) {
  console.error("Missing:", xlsxPath);
  process.exit(1);
}

if (fs.existsSync(extractDir)) {
  fs.rmSync(extractDir, { recursive: true, force: true });
}
fs.copyFileSync(xlsxPath, zipPath);
fs.mkdirSync(extractDir, { recursive: true });
execSync(
  `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${extractDir.replace(/'/g, "''")}' -Force"`,
  { stdio: "inherit" },
);

const xml = fs.readFileSync(path.join(extractDir, "xl/sharedStrings.xml"), "utf8");
const strings = [];
const re = /<si>([\s\S]*?)<\/si>/g;
let m;
while ((m = re.exec(xml))) {
  const block = m[1];
  const texts = [...block.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) =>
    x[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&apos;/g, "'"),
  );
  strings.push(texts.join(""));
}

const sheet = fs.readFileSync(path.join(extractDir, "xl/worksheets/sheet1.xml"), "utf8");
const rows = [...sheet.matchAll(/<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)];
const cellRe = /<c r="([A-F])(\d+)"[^>]*?(?: t="s")?[^>]*><v>(\d+)<\/v>/g;

const petPairs = [];
const friendPairs = [];
const skipEn = (s) => !s || s.includes("listing page") || s.startsWith("With ");

for (const [, , content] of rows) {
  const row = {};
  let cm;
  while ((cm = cellRe.exec(content))) {
    const [, col, , idx] = cm;
    row[col] = strings[Number(idx)];
  }
  if (row.A && row.B && !skipEn(row.A)) petPairs.push([row.A, row.B]);
  if (row.E && row.F && !skipEn(row.E)) friendPairs.push([row.E, row.F]);
}

/** Internal code labels → Excel ET (values unchanged in DB). */
const CODE_ALIASES_PET = [
  ["Low (chill mode)", "Low (prefers relaxing)"],
  ["High (zoomies all day)", "High (full of energy)"],
  ["No medication needed", "Does not need meds"],
  ["At pet friend's home", "At pet borrower’s home"],
  ["At pet parent's home", "At pet owner’s home"],
  ["Flexible — either home works", "Either / flexible"],
  ["Small–Medium / 5–10 kg", "Small-Medium / 5-10 kg"],
  ["Medium–Large / 10–15 kg", "Medium-Large /10-15 kg"],
  ["dog", "Dog"],
  ["cat", "Cat"],
  ["rabbit", "Rabbit"],
  ["bird", "Bird"],
  ["rodent", "Rodent"],
  ["fish", "Fish"],
  ["reptile", "Reptile"],
  ["other", "Other"],
  ["Dog-friendly", "Friendly with dogs"],
  ["Cat-friendly", "Friendly with cats"],
  ["Active", "Playful"],
  ["Walks", "Walks only"],
  ["Verified profiles only", "Verified"],
];

const CODE_ALIASES_FRIEND = [
  ["Dogs", "Dog"],
  ["Cats", "Cat"],
  ["Rabbits", "Rabbit"],
  ["Birds", "Bird"],
  ["Reptiles", "Reptile"],
  ["First-time Pet Friend", "First-timer"],
  ["Some pet care experience", "Some experience"],
  ["Experienced with pets", "Very experienced"],
  ["Has garden", "Garden"],
  ["Apartment OK", "Apartment"],
  ["Has other pets", "Other Pets"],
  ["Children at home", "Kids"],
  ["dog", "Dog"],
  ["cat", "Cat"],
  ["rabbit", "Rabbit"],
  ["bird", "Bird"],
  ["rodent", "Rodent"],
  ["fish", "Fish"],
  ["reptile", "Reptile"],
  ["Walks", "Walks only"],
];

function toLookup(pairs) {
  const map = new Map();
  for (const [en, et] of pairs) {
    map.set(en.trim().toLowerCase(), et);
  }
  return map;
}

function resolveEt(label, lookup) {
  const key = label.trim().toLowerCase();
  return lookup.get(key);
}

function applyAliases(pairs, aliases, ...lookups) {
  const out = [...pairs];
  for (const [codeEn, excelEn] of aliases) {
    let et;
    for (const lookup of lookups) {
      et = resolveEt(excelEn, lookup);
      if (et) break;
    }
    if (et) out.push([codeEn, et]);
  }
  return out;
}

const petLookup = toLookup(petPairs);
const friendLookup = toLookup(friendPairs);
const finalPet = applyAliases(petPairs, CODE_ALIASES_PET, petLookup, friendLookup);
const finalFriend = applyAliases(friendPairs, CODE_ALIASES_FRIEND, friendLookup, petLookup);

function esc(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function emitPairs(pairs) {
  return pairs.map(([en, et]) => `  ["${esc(en)}", "${esc(et)}"],`).join("\n");
}

const file = `/**
 * EN → ET for pet listing and pet friend listing search UI.
 * AUTO-GENERATED from Listing search translations.xlsx (sheet "Listing search translations").
 * Regenerate: node scripts/sync-listing-search-translations.mjs
 *
 * Columns A/B = pet listing search; E/F = pet friend listing search.
 * Do not use translations.xlsx for these labels.
 */

type Pair = readonly [en: string, et: string];

const PET_LISTING_PAIRS: Pair[] = [
${emitPairs(finalPet)}
];

const PET_FRIEND_LISTING_PAIRS: Pair[] = [
${emitPairs(finalFriend)}
];

function toLookupMap(pairs: Pair[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const [en, et] of pairs) {
    map.set(en.trim().toLowerCase(), et);
  }
  return map;
}

const PET_LISTING_LOOKUP = toLookupMap(PET_LISTING_PAIRS);
const PET_FRIEND_LISTING_LOOKUP = toLookupMap(PET_FRIEND_LISTING_PAIRS);

export type ListingSearchScope = "pet" | "petFriend";

export function getListingSearchLabelEt(
  text: string | null | undefined,
  scope: ListingSearchScope = "pet",
): string | undefined {
  if (!text?.trim()) return undefined;
  const key = text.trim().toLowerCase();
  const lookup = scope === "petFriend" ? PET_FRIEND_LISTING_LOOKUP : PET_LISTING_LOOKUP;
  const direct = lookup.get(key);
  if (direct) return direct;
  if (scope === "petFriend") {
    return PET_LISTING_LOOKUP.get(key);
  }
  return PET_FRIEND_LISTING_LOOKUP.get(key);
}
`;

fs.writeFileSync(outPath, file, "utf8");
console.log(`Wrote ${outPath}`);
console.log(`  pet pairs: ${finalPet.length}, friend pairs: ${finalFriend.length}`);

fs.rmSync(extractDir, { recursive: true, force: true });
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
