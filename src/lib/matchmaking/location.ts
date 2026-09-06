import { parseCoord } from "@/lib/parse-coord";

export function locationAreaKey(input: {
  city?: string | null;
  public_location?: string | null;
  location?: string | null;
}): string | null {
  const raw = (input.city || input.public_location || input.location || "").trim();
  if (!raw) return null;
  return raw.split(",")[0].trim().toLowerCase();
}

export function coordsFromRow(row: {
  latitude?: unknown;
  longitude?: unknown;
}): { lat: number; lng: number } | null {
  const lat = parseCoord(row.latitude);
  const lng = parseCoord(row.longitude);
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function titleCaseArea(key: string): string {
  return key
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
