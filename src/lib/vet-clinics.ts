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
  if (options?.limit != null) list = list.slice(0, options.limit);
  return list;
}

export function getClinicsForLocation(
  location: string | null | undefined,
  options?: { limit?: number; emergencyOnly?: boolean },
): VetClinic[] {
  const city = extractCityFromLocation(location);
  if (city) {
    const byCity = getClinicsByCity(city, options);
    if (byCity.length > 0) return byCity;
  }
  return [];
}

export function formatPhoneLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits ? `tel:+${digits.startsWith("372") ? digits : `372${digits}`}` : "";
}

export function formatPhoneDisplay(phone: string): string {
  return phone.trim() || "—";
}

export function clinicMapUrl(clinic: VetClinic): string {
  if (clinic.latitude != null && clinic.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${clinic.latitude},${clinic.longitude}`;
  }
  const q = [clinic.clinic_name, clinic.address, clinic.city, "Estonia"].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** City center for map when clinic has no exact coords. */
export function clinicDisplayCoords(
  clinic: VetClinic,
): { lat: number; lng: number } | null {
  if (clinic.latitude != null && clinic.longitude != null) {
    return { lat: clinic.latitude, lng: clinic.longitude };
  }
  return resolveCityCenter(clinic.city);
}

export function countEmergencyClinics(): number {
  return VET_CLINICS.filter((c) => c.emergency).length;
}
