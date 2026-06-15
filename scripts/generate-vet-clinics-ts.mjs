/**
 * Generates src/data/vet-clinics.ts from scripts/vet-clinics-raw.json (XLSX source).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raw = readJson(path.join(__dirname, "vet-clinics-raw.json"));

function readJson(file) {
  const text = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(text);
}

function normKey(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

const geocodedPath = path.join(__dirname, "vet-clinics-geocoded.json");
const geoByName = fs.existsSync(geocodedPath)
  ? new Map(readJson(geocodedPath).map((g) => [normKey(g.name), g]))
  : new Map();

const MANUAL_COORDS = {
  "petcity lonakeskuse loomakliinik": { lat: 58.34231, lng: 26.732342 },
  "petcity parnu clinic": { lat: 58.386898, lng: 24.501691 },
};

function clinicCoords(name) {
  const geo = geoByName.get(normKey(name));
  if (geo?.lat != null && geo?.lng != null) return { lat: geo.lat, lng: geo.lng };
  const manual = MANUAL_COORDS[normKey(name)];
  return manual ?? null;
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
  const website = (row[5] ?? "").trim() || undefined;
  const hours = (row[6] ?? "").trim() || undefined;
  if (!name) continue;
  if (!city) city = CITY_OVERRIDES[normKey(name)] ?? "";
  const coords = clinicCoords(name);
  const entry = {
    clinic_name: name,
    city,
    address,
    phone,
    ...(website ? { website } : {}),
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
  if (c.website) parts.push(`website: ${esc(c.website)}`);
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
  website?: string;
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
