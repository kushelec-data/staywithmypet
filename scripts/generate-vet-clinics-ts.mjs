/**
 * Generates src/data/vet-clinics.ts from scripts/vet-clinics-raw.json (XLSX source).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(
  fs.readFileSync(path.join(__dirname, "vet-clinics-raw.json"), "utf8"),
);

const CITY_COORDS = {
  tallinn: { lat: 59.437, lng: 24.7536 },
  tartu: { lat: 58.378, lng: 26.729 },
  pärnu: { lat: 58.3859, lng: 24.4971 },
  parnu: { lat: 58.3859, lng: 24.4971 },
  narva: { lat: 59.379, lng: 28.1791 },
  viimsi: { lat: 59.508, lng: 24.848 },
  keila: { lat: 59.3036, lng: 24.4131 },
  laagri: { lat: 59.352, lng: 24.65 },
  saue: { lat: 59.322, lng: 24.552 },
  jõhvi: { lat: 59.359, lng: 27.421 },
  johvi: { lat: 59.359, lng: 27.421 },
  "kohtla-järve": { lat: 59.398, lng: 27.273 },
  "kohtla-jarve": { lat: 59.398, lng: 27.273 },
  rakvere: { lat: 59.346, lng: 26.356 },
  viljandi: { lat: 58.364, lng: 25.591 },
};

function normKey(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

function cityCoords(city) {
  const k = normKey(city);
  return CITY_COORDS[k] ?? null;
}

function formatPhone(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  let digits;
  if (/e/i.test(s)) {
    digits = String(Math.round(parseFloat(s)));
    // Excel float noise: Estonian numbers are 7–8 digits after country code
    if (digits.length > 8) digits = digits.slice(0, 8);
  } else {
    digits = s.replace(/\.0+$/, "").replace(/\D/g, "");
  }
  if (digits.startsWith("372")) digits = digits.slice(3);
  if (digits.length === 7 || digits.length === 8) {
    return `+372 ${digits[0]} ${digits.slice(1, 4)} ${digits.slice(4)}`;
  }
  return digits ? `+372 ${digits}` : "";
}

function isEmergency(name, hours) {
  const h = (hours ?? "").toLowerCase();
  const n = (name ?? "").toLowerCase();
  return h.includes("24/7") || n.includes("emergency") || n.includes("24/7");
}

const CITY_OVERRIDES = {
  "miki animal clinic": "Tallinn",
  "saue animal clinic": "Saue",
};

const rows = raw.sheetRows.slice(1);
const clinics = [];

for (const row of rows) {
  let city = (row[1] ?? "").trim();
  const name = (row[2] ?? "").trim();
  const address = (row[3] ?? "").trim();
  const phone = formatPhone(row[4]);
  const hours = (row[6] ?? "").trim() || undefined;
  if (!name) continue;
  if (!city) city = CITY_OVERRIDES[normKey(name)] ?? "";
  const coords = city ? cityCoords(city) : null;
  const entry = {
    clinic_name: name,
    city,
    address,
    phone,
    ...(isEmergency(name, hours) ? { emergency: true } : {}),
    ...(hours ? { opening_hours: hours } : {}),
    ...(coords ? { latitude: coords.lat, longitude: coords.lng } : {}),
  };
  clinics.push(entry);
}

function esc(s) {
  return JSON.stringify(s);
}

const lines = clinics.map((c) => {
  const parts = [
    `clinic_name: ${esc(c.clinic_name)}`,
    `city: ${esc(c.city)}`,
    `address: ${esc(c.address)}`,
    `phone: ${esc(c.phone)}`,
  ];
  if (c.emergency) parts.push("emergency: true");
  if (c.opening_hours) parts.push(`opening_hours: ${esc(c.opening_hours)}`);
  if (c.latitude != null) parts.push(`latitude: ${c.latitude}`);
  if (c.longitude != null) parts.push(`longitude: ${c.longitude}`);
  return `  { ${parts.join(", ")} }`;
});

const out = `/** Veterinary clinics in Estonia — sourced from reference-old-site/Vet Clinics list.xlsx */
export type VetClinic = {
  clinic_name: string;
  city: string;
  address: string;
  phone: string;
  emergency?: boolean;
  opening_hours?: string;
  latitude?: number;
  longitude?: number;
};

export const VET_CLINICS: VetClinic[] = [
${lines.join(",\n")},
];
`;

const outPath = path.join(__dirname, "..", "src", "data", "vet-clinics.ts");
fs.writeFileSync(outPath, out, "utf8");
console.log("Wrote", outPath, "count:", clinics.length);
