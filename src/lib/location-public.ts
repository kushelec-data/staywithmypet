/** General area label for public display — never the full street address. */
export function formatNearbyLocation(location: string | null | undefined): string | null {
  const raw = location?.trim();
  if (!raw) return null;

  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return null;

  if (parts.length === 1) {
    const place = parts[0];
    if (/area$/i.test(place) || /near/i.test(place)) return place;
    if (/center|centre/i.test(place)) return "Near city center";
    return `${place} area`;
  }

  const city = parts[0];
  const region = parts[parts.length - 1];
  if (/center|centre/i.test(city) || /center|centre/i.test(region)) {
    return "Near city center";
  }
  if (city === region) return `${city} area`;
  if (/^\d|street|st\.|ave|road|rd\./i.test(city)) {
    return `${region} area`;
  }
  return `${city} area`;
}
