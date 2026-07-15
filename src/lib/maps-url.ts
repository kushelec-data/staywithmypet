function parseCoord(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function googleMapsSearchUrl(input: {
  formattedAddress?: string | null;
  address?: string | null;
  latitude?: unknown;
  longitude?: unknown;
}): string | null {
  const lat = parseCoord(input.latitude);
  const lng = parseCoord(input.longitude);
  if (lat != null && lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }

  const query = input.formattedAddress?.trim() || input.address?.trim();
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
