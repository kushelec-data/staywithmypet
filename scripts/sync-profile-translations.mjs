/**
 * Regenerates src/lib/profile-translations.ts from Profile translations.xlsx
 * Sheet: Profile translations
 * Run: node scripts/sync-profile-translations.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const xlsxPath = path.join(root, "Profile translations.xlsx");
const outPath = path.join(root, "src/lib/profile-translations.ts");
const zipPath = path.join(root, ".profile-trans-sync.zip");
const extractDir = path.join(root, ".profile-trans-sync");

const SKIP_A = new Set([
  "ENG",
  "EST",
  "PET PARENT",
  "PET FRIEND´S PROFILE",
  "PET FRIEND'S PROFILE",
]);

/** Map internal English labels → Excel English keys (DB values unchanged). */
const CODE_ALIASES = [
  ["Pet name", "Pet´s Name"],
  ["Animal type", "Pet type"],
  ["Weight category", "Size"],
  ["Energy level", "Energy Level"],
  ["Walk needs", "Walk Needs "],
  ["Requires medication", "Requires Medication"],
  ["Care location preference", "Care Location Preference"],
  ["Care type needed", "Care Type Needed"],
  ["Location / address", "Address"],
  ["Pet Friend requirements", "Pet Friend Requirements"],
  ["Requirements", "Pet Friend Requirements"],
  ["Temperament and care", "Temperament and care"],
  ["Friendly", "Friendly"],
  ["Dog-friendly", "Friendly with dogs"],
  ["Cat-friendly", "Friendly with cats"],
  ["At pet friend's home", "At pet friend´s home"],
  ["At pet owner's home", "At pet owner´s home"],
  ["Walks only", "Walks"],
  ["Overnight care / 24h stay", "Overnight care / 24h stay"],
  ["First-time Pet Friend", "First-timer"],
  ["Some pet care experience", "Some experience"],
  ["Experienced with pets", "Very experienced"],
  ["Puppies & kittens", "Puppies/kittens"],
  ["Puppies / kittens", "Puppies/kittens"],
  ["Comfortable with behavioral quirks?", "Behavioral quirks"],
  ["Willing to care for special medical needs?", "Special medical needs"],
  ["Happy to care for senior pets?", "Seniors"],
  ["Happy with puppies & kittens?", "Puppies/kittens"],
  ["Pet types willing to care for", "Types of Pets Willing to Care For"],
  ["Preferred pet size", "Preferred Pet Sizes"],
  ["Available care types", "What types of care are you open to providing?"],
  ["Pet care experience", "Experience Level"],
  ["Pet types previously cared for", "Pet Types Previously Borrowed"],
  ["Living type", "What kind of home do you live in?"],
  ["Languages", "Languahes You Speak"],
  ["Low", "Low"],
  ["Medium", "Medium"],
  ["High", "High"],
  ["Moderate", "Moderate"],
  ["more", "More"],
  ["Neutered", "Neutered"],
  ["Experienced only", "Experienced only"],
  ["No children", "No children"],
  ["No other pets", "No other pets"],
  ["Non-smoker", "Non-smoker"],
  ["Pet-friendly home", "Pet-friendly home"],
  ["Townhouse", "House"],
  ["Farm", "Farm"],
  ["Needs medication", "Requires Medication"],
  ["No medication", "Does not need meds"],
  ["Kid-friendly", "Kid-friendly"],
  ["Vocal", "Vocal"],
  ["Available", "Available"],
  ["Not specified", "None"],
  ["At my home", "At pet friend´s home"],
  ["Flexible — either home works", "Either / flexible"],
  ["Care preferences", "Pet Care preferences"],
  ["Living situation", "Your Living Situation"],
  ["Pet types", "Types of Pets Willing to Care For"],
  ["Care offered", "What types of care are you open to providing?"],
  ["Home", "What kind of home do you live in?"],
  ["Pet-friendly home", "Pet-friendly home"],
  ["No children at home", "No children"],
  ["Has children at home", "Children at home"],
  ["Children at home", "Children at home"],
  ["Yard or garden access", "Do you have a private yard or garden?"],
  ["Nearby park access", "Is there a park or green space nearby for walks or play?"],
  ["Has pets at home", "Do you have other pets at home?"],
  ["No pets at home", "Do you have other pets at home?"],
  ["Your living situation", "Your Living Situation"],
  ["Pet Profile", "Pet Profile"],
  ["Save pet profile", "Save My Pet's Profile"],
  ["Save changes", "Save and Continue"],
  ["Breed", "Breed (if known)"],
  ["Spayed / neutered", "Neutered"],
  ["Add up to 6 photos or videos. The first file is the main listing image.", "Add up to 6 photos or videos that best show your pet's personality and charm!"],
  ["Pet media", "Pet Profile"],
  ["Basic pet details", "Pet Profile"],
  ["Availability and care location", "Availability Calendar"],
  ["Preferred care location", "Care Location Preference"],
  ["Pets at home?", "Do you have other pets at home?"],
  ["Children at home?", "Are there children in your household?"],
  ["Yard or garden access?", "Do you have a private yard or garden?"],
  ["Nearby park access?", "Is there a park or green space nearby for walks or play?"],
  ["Pet care preferences", "Pet Care preferences"],
  ["What pets and care you're comfortable offering.", "Let pet owners know what kinds of pets you're most comfortable with, and how you'd like to care for them. This helps ensure a good match for both you and the pet."],
  ["When and how long you can help.", "Tell us when you're open to welcoming a pet into your routine — whether for a walk, a weekend, or longer."],
  ["Your home environment for Pet Parents.", "Help pet owners understand what kind of space and environment you can offer for their pet."],
  ["Availability Calendar", "Availability Calendar"],
  ["Anything else about your availability?", "Anything else about your availability?"],
];

function esc(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function isHelperText(text) {
  const t = text.trim();
  return (
    t.length > 55 ||
    /^The (full name|exact address)/i.test(t) ||
    /^Could /i.test(t) ||
    /^Can I /i.test(t) ||
    /^These animal types/i.test(t) ||
    /^Help /i.test(t) ||
    /^Let /i.test(t) ||
    /^Tell us /i.test(t) ||
    /^Set expectations/i.test(t) ||
    /^Select days/i.test(t) ||
    /^Start typing/i.test(t) ||
    /^Choose a suggested/i.test(t)
  );
}

if (!fs.existsSync(xlsxPath)) {
  console.error("Missing:", xlsxPath);
  process.exit(1);
}

if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true });
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
const cellRe = /<c r="([A-Z]+)(\d+)"[^>]*?(?: t="s")?[^>]*><v>(\d+)<\/v>/g;

const labelPairs = [];
const optionPairs = [];
const helperPairs = [];

for (const [, , content] of rows) {
  const row = {};
  let cm;
  while ((cm = cellRe.exec(content))) {
    const [, col, , idx] = cm;
    row[col] = strings[Number(idx)];
  }

  const a = row.A?.trim();
  const g = row.G?.trim();
  const d = row.D?.trim();
  const j = row.J?.trim();
  const e = row.E?.trim();
  const k = row.K?.trim();

  if (a && g && !SKIP_A.has(a)) labelPairs.push([a, g]);
  if (d && j) optionPairs.push([d, j]);
  if (e && k) {
    if (isHelperText(e)) helperPairs.push([e, k]);
    else optionPairs.push([e, k]);
  }
}

function toLookup(pairs) {
  const map = new Map();
  for (const [en, et] of pairs) map.set(en.trim().toLowerCase(), et);
  return map;
}

const labelLookup = toLookup(labelPairs);
const optionLookup = toLookup(optionPairs);
const helperLookup = toLookup(helperPairs);

function resolveEt(excelEn, ...lookups) {
  const key = excelEn.trim().toLowerCase();
  for (const lookup of lookups) {
    const hit = lookup.get(key);
    if (hit) return hit;
  }
  return undefined;
}

const aliasPairs = [];
for (const [codeEn, excelEn] of CODE_ALIASES) {
  const et =
    resolveEt(excelEn, labelLookup, optionLookup, helperLookup) ??
    resolveEt(codeEn, labelLookup, optionLookup, helperLookup);
  if (et) aliasPairs.push([codeEn, et]);
}

const allLabel = [...labelPairs, ...aliasPairs.filter(([en]) => !labelPairs.some(([a]) => a === en))];
const allOption = [...optionPairs];
for (const [en, et] of aliasPairs) {
  if (!allOption.some(([a]) => a.toLowerCase() === en.toLowerCase())) {
    allOption.push([en, et]);
  }
}

function emitPairs(pairs) {
  return pairs.map(([en, et]) => `  ["${esc(en)}", "${esc(et)}"],`).join("\n");
}

const file = `/**
 * Profile page EN → ET translations.
 * Source: C:\\\\Users\\\\kush\\\\staywithmypet\\\\Profile translations.xlsx
 * Sheet: Profile translations
 *   - Column A → G: field labels, section titles, buttons
 *   - Column D → J: dropdown / multiselect option values
 *   - Column E → K: helper text and breed names
 *
 * Regenerate: node scripts/sync-profile-translations.mjs
 * Do not use translations.xlsx for profile UI.
 */

import type { Locale } from "@/i18n/translations";

type Pair = readonly [en: string, et: string];

const PROFILE_LABEL_PAIRS: Pair[] = [
${emitPairs(allLabel)}
];

const PROFILE_OPTION_PAIRS: Pair[] = [
${emitPairs(allOption)}
];

const PROFILE_HELPER_PAIRS: Pair[] = [
${emitPairs(helperPairs)}
];

function toLookupMap(pairs: Pair[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const [en, et] of pairs) {
    map.set(en.trim().toLowerCase(), et);
  }
  return map;
}

const LABEL_LOOKUP = toLookupMap(PROFILE_LABEL_PAIRS);
const OPTION_LOOKUP = toLookupMap(PROFILE_OPTION_PAIRS);
const HELPER_LOOKUP = toLookupMap(PROFILE_HELPER_PAIRS);

function lookupEt(text: string): string | undefined {
  const key = text.trim().toLowerCase();
  return (
    LABEL_LOOKUP.get(key) ??
    OPTION_LOOKUP.get(key) ??
    HELPER_LOOKUP.get(key)
  );
}

/** Returns Estonian from Profile translations.xlsx if present. */
export function getProfileLabelEt(text: string | null | undefined): string | undefined {
  if (!text?.trim()) return undefined;
  return lookupEt(text.trim());
}

/** Returns Estonian helper copy from column E/K when present. */
export function getProfileHelperEt(text: string | null | undefined): string | undefined {
  if (!text?.trim()) return undefined;
  const key = text.trim().toLowerCase();
  return HELPER_LOOKUP.get(key) ?? LABEL_LOOKUP.get(key);
}

/** Translate visible profile label; falls back to English when missing in Excel. */
export function translateProfileLabel(text: string | null | undefined, locale: Locale): string {
  if (!text?.trim()) return "";
  const trimmed = text.trim();
  if (locale !== "et") return trimmed;
  return lookupEt(trimmed) ?? trimmed;
}

export function translateProfileLabels(values: string[], locale: Locale): string[] {
  return values.map((v) => translateProfileLabel(v, locale)).filter(Boolean);
}

/** Helper / hint text (column E/K). Falls back to English source when missing. */
export function translateProfileHelper(text: string | null | undefined, locale: Locale): string {
  if (!text?.trim()) return "";
  const trimmed = text.trim();
  if (locale !== "et") return trimmed;
  return getProfileHelperEt(trimmed) ?? trimmed;
}
`;

fs.writeFileSync(outPath, file, "utf8");
console.log(`Wrote ${outPath}`);
console.log(
  `  labels: ${allLabel.length}, options: ${allOption.length}, helpers: ${helperPairs.length}, aliases: ${aliasPairs.length}`,
);

fs.rmSync(extractDir, { recursive: true, force: true });
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
