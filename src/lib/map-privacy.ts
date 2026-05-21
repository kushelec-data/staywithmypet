/** Deterministic 0–1 from a string seed (stable across sessions). */
function hashUnit(seed: string, salt: string): number {
  let h = 0;
  const s = `${seed}:${salt}`;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return (Math.abs(h) % 10000) / 10000;
}

const MIN_OFFSET_M = 300;
const MAX_OFFSET_M = 800;

/**
 * Offset lat/lng by 300–800 m in a deterministic direction from `seed` (e.g. pet id).
 * Use only for public map display — never the true home coordinates.
 *
 * Booking detail (`/dashboard/bookings/[id]`) does not expose street addresses today;
 * exact care location should remain gated to accepted bookings when added.
 */
export function blurCoordinates(
  lat: number,
  lng: number,
  seed?: string,
): { lat: number; lng: number } {
  const id = seed ?? "default";
  const angle = hashUnit(id, "angle") * 2 * Math.PI;
  const distanceM = MIN_OFFSET_M + hashUnit(id, "dist") * (MAX_OFFSET_M - MIN_OFFSET_M);
  const latRad = (lat * Math.PI) / 180;
  const metersPerDegLat = 111_320;
  const metersPerDegLng = 111_320 * Math.cos(latRad);

  const latOffset = (distanceM / metersPerDegLat) * Math.cos(angle);
  const lngOffset =
    metersPerDegLng > 0 ? (distanceM / metersPerDegLng) * Math.sin(angle) : 0;

  return {
    lat: Math.round((lat + latOffset) * 1e5) / 1e5,
    lng: Math.round((lng + lngOffset) * 1e5) / 1e5,
  };
}
