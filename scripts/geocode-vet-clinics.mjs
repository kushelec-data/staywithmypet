/**
 * Geocode vet clinics (UTF-8). Run: node scripts/geocode-vet-clinics.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(
  fs.readFileSync(path.join(__dirname, "vet-clinics-raw.json"), "utf8"),
);

const CITY_OVERRIDES = {
  "miki animal clinic": "Tallinn",
  "saue animal clinic": "Saue",
};

function normKey(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    q: query,
    format: "json",
    limit: "1",
    countrycodes: "ee",
  })}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "StayWithMyPet/1.0 (vet-clinic-audit)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data[0]) return null;
  return {
    lat: Math.round(parseFloat(data[0].lat) * 1e6) / 1e6,
    lng: Math.round(parseFloat(data[0].lon) * 1e6) / 1e6,
    display_name: data[0].display_name,
  };
}

const rows = raw.sheetRows.slice(1);
const results = [];

for (const row of rows) {
  let city = (row[1] ?? "").trim();
  const name = (row[2] ?? "").trim();
  const address = (row[3] ?? "").trim();
  if (!name) continue;
  if (!city) city = CITY_OVERRIDES[normKey(name)] ?? "";

  const query = `${address}, ${city}, Estonia`;
  let coords = await geocode(query);
  if (!coords) coords = await geocode(`${name}, ${city}, Estonia`);
  results.push({ name, city, address, query, ...coords });
  console.log(coords ? "OK" : "MISS", name, coords?.lat, coords?.lng);
  await sleep(1100);
}

const out = path.join(__dirname, "vet-clinics-geocoded.json");
fs.writeFileSync(out, JSON.stringify(results, null, 2), "utf8");
console.log("Wrote", out, results.length);
