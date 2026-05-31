import { VET_CLINICS, type VetClinic } from "@/data/vet-clinics";
import { resolveCityCenter } from "@/lib/estonia-city-coords";

function normalizeCityKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

/** Extract a city name from a profile/pet location label. */
export function extractCityFromLocation(location: string | null | undefined): string | null {
  const raw = location?.trim();
  if (!raw) return null;
  const first = raw.split(/[,/]/)[0]?.trim();
  return first || null;
}

export function citiesMatch(a: string, b: string): boolean {
  const ka = normalizeCityKey(a);
  const kb = normalizeCityKey(b);
  if (!ka || !kb) return false;
  return ka === kb || ka.includes(kb) || kb.includes(ka);
}

export function getClinicsByCity(
  city: string | null | undefined,
  options?: { limit?: number; emergencyOnly?: boolean },
): VetClinic[] {
  const needle = city?.trim();
  if (!needle) return [];
  let list = VET_CLINICS.filter((c) => citiesMatch(c.city, needle));
  if (options?.emergencyOnly) list = list.filter((c) => c.emergency);
  const origin = resolveProximityOrigin(needle, null);
  if (origin) list = sortClinicsByProximity(list, origin);
  if (options?.limit != null) list = list.slice(0, options.limit);
  return list;
}

export function getClinicsForLocation(
  location: string | null | undefined,
  options?: { limit?: number; emergencyOnly?: boolean },
): VetClinic[] {
  const city = extractCityFromLocation(location);
  if (!city) return [];
  let list = VET_CLINICS.filter((c) => citiesMatch(c.city, city));
  if (options?.emergencyOnly) list = list.filter((c) => c.emergency);
  const origin = resolveProximityOrigin(city, location);
  if (origin) list = sortClinicsByProximity(list, origin);
  if (options?.limit != null) list = list.slice(0, options.limit);
  return list;
}

export function formatPhoneLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits ? `tel:+${digits.startsWith("372") ? digits : `372${digits}`}` : "";
}

export function formatPhoneDisplay(phone: string): string {
  return phone.trim() || "—";
}

const ESTONIA_BOUNDS = {
  latMin: 57.5,
  latMax: 59.95,
  lngMin: 21.5,
  lngMax: 28.25,
};

export function isCoordInEstonia(lat: number, lng: number): boolean {
  return (
    lat >= ESTONIA_BOUNDS.latMin &&
    lat <= ESTONIA_BOUNDS.latMax &&
    lng >= ESTONIA_BOUNDS.lngMin &&
    lng <= ESTONIA_BOUNDS.lngMax
  );
}

function clinicAddressQuery(clinic: VetClinic): string {
  return [clinic.address, clinic.city, "Estonia"].filter(Boolean).join(", ");
}

export function clinicMapUrl(clinic: VetClinic): string {
  const { latitude: lat, longitude: lng } = clinic;
  if (
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    isCoordInEstonia(lat, lng)
  ) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  const q = [clinic.clinic_name, clinic.address, clinic.city, "Estonia"].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q || clinicAddressQuery(clinic))}`;
}

/** Coords used for maps and distance sorting (clinic coords, else city center). */
export function clinicDisplayCoords(
  clinic: VetClinic,
): { lat: number; lng: number } | null {
  const { latitude: lat, longitude: lng } = clinic;
  if (
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    isCoordInEstonia(lat, lng)
  ) {
    return { lat, lng };
  }
  return resolveCityCenter(clinic.city);
}

function haversineKm(
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

function sortClinicsByProximity(
  clinics: VetClinic[],
  origin: { lat: number; lng: number },
): VetClinic[] {
  return [...clinics].sort((a, b) => {
    const ca = clinicDisplayCoords(a);
    const cb = clinicDisplayCoords(b);
    if (!ca && !cb) return 0;
    if (!ca) return 1;
    if (!cb) return -1;
    return haversineKm(origin, ca) - haversineKm(origin, cb);
  });
}

function resolveProximityOrigin(
  city: string | null | undefined,
  location: string | null | undefined,
): { lat: number; lng: number } | null {
  return resolveCityCenter(city) ?? resolveCityCenter(location);
}

export function countEmergencyClinics(): number {
  return VET_CLINICS.filter((c) => c.emergency).length;
}
