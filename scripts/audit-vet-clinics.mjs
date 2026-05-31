/**
 * Audit vet clinic coordinates and map URLs. Run: node scripts/audit-vet-clinics.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const { VET_CLINICS } = await import(
  pathToFileURL(path.join(root, "src/data/vet-clinics.ts")).href
);
const { clinicMapUrl, clinicDisplayCoords, isCoordInEstonia } = await import(
  pathToFileURL(path.join(root, "src/lib/vet-clinics.ts")).href
);

const geocoded = JSON.parse(
  fs.readFileSync(path.join(__dirname, "vet-clinics-geocoded.json"), "utf8"),
);

function normKey(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

const geoByName = new Map(geocoded.map((g) => [normKey(g.name), g]));

const coordGroups = new Map();
for (const c of VET_CLINICS) {
  const key = `${c.latitude},${c.longitude}`;
  if (!coordGroups.has(key)) coordGroups.set(key, []);
  coordGroups.get(key).push(c.clinic_name);
}

const dupes = [...coordGroups.entries()].filter(([, names]) => names.length > 1);

const rows = [];
let fixed = 0;

for (const c of VET_CLINICS) {
  const geo = geoByName.get(normKey(c.clinic_name));
  const mapUrl = clinicMapUrl(c);
  const display = clinicDisplayCoords(c);
  let status = "Correct";

  if (!c.latitude || !c.longitude) {
    status = "Missing data";
  } else if (!isCoordInEstonia(c.latitude, c.longitude)) {
    status = "Needs coordinate fix";
  } else if (dupes.some(([, names]) => names.includes(c.clinic_name))) {
    status = "Needs coordinate fix";
  } else if (!geo?.lat && !geo?.lng) {
    status = "Needs coordinate fix";
  }

  if (
    status === "Correct" &&
    c.latitude != null &&
    Math.abs(c.latitude - 59.437) < 0.0001 &&
    Math.abs(c.longitude - 24.7536) < 0.0001
  ) {
    status = "Needs coordinate fix";
  }

  if (!mapUrl.startsWith("https://www.google.com/maps/")) {
    status = "Needs map URL fix";
  }

  const beforeDup = dupes.length;
  if (status !== "Correct") fixed++;

  rows.push({
    clinic: c.clinic_name,
    address: `${c.address}, ${c.city}`,
    coords: display ? `${display.lat}, ${display.lng}` : "—",
    mapUrl: mapUrl.length > 72 ? mapUrl.slice(0, 72) + "…" : mapUrl,
    status,
  });
}

console.log("| Clinic | Address | Stored Coordinates | Map URL | Status |");
console.log("| --- | --- | --- | --- | --- |");
for (const r of rows) {
  console.log(
    `| ${r.clinic} | ${r.address} | ${r.coords} | ${r.mapUrl} | ${r.status} |`,
  );
}

console.log("\nTotal clinics:", VET_CLINICS.length);
console.log("Duplicate coordinate groups:", dupes.length);
if (dupes.length) {
  for (const [key, names] of dupes) {
    console.log(`  ${key}:`, names.join("; "));
  }
}
console.log("Issues (non-Correct):", rows.filter((r) => r.status !== "Correct").length);
