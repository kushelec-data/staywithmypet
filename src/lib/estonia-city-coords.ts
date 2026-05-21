/** Approximate city centers for map fallback when pets lack stored coordinates. */
const ESTONIA_CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  tallinn: { lat: 59.437, lng: 24.7536 },
  tartu: { lat: 58.378, lng: 26.729 },
  pärnu: { lat: 58.3859, lng: 24.4971 },
  parnu: { lat: 58.3859, lng: 24.4971 },
  narva: { lat: 59.379, lng: 28.1791 },
  viimsi: { lat: 59.508, lng: 24.848 },
  keila: { lat: 59.3036, lng: 24.4131 },
  haapsalu: { lat: 58.9431, lng: 23.5414 },
  kuressaare: { lat: 58.248, lng: 22.5039 },
  laagri: { lat: 59.352, lng: 24.65 },
  saue: { lat: 59.322, lng: 24.552 },
  johvi: { lat: 59.359, lng: 27.421 },
  "kohtla-jarve": { lat: 59.398, lng: 27.273 },
  rakvere: { lat: 59.346, lng: 26.356 },
  viljandi: { lat: 58.364, lng: 25.591 },
};

function normalizeLocationKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

/** Match a city name inside a location label and return approximate center coords. */
export function resolveCityCenter(
  location: string | null | undefined,
): { lat: number; lng: number } | null {
  const raw = location?.trim();
  if (!raw) return null;

  const normalized = normalizeLocationKey(raw);
  for (const [city, coords] of Object.entries(ESTONIA_CITY_COORDS)) {
    const key = normalizeLocationKey(city);
    if (normalized.includes(key)) return coords;
  }
  return null;
}
