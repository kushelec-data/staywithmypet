/** Result when user picks a suggestion from Google Places Autocomplete. */
export type GooglePlaceSelectPayload = {
  formatted_address: string;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  place_id: string | null;
};

type AddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

type PlaceLike = {
  formatted_address?: string;
  name?: string;
  place_id?: string;
  geometry?: { location?: { lat: () => number; lng: () => number } };
  address_components?: AddressComponent[];
};

function componentLong(components: AddressComponent[] | undefined, ...types: string[]): string | null {
  if (!components?.length) return null;
  const match = components.find((c) => types.some((t) => c.types.includes(t)));
  const name = match?.long_name?.trim();
  return name || null;
}

export function parseGooglePlaceSelection(place: PlaceLike): GooglePlaceSelectPayload | null {
  const formatted = place.formatted_address?.trim() || place.name?.trim() || "";
  if (!formatted) return null;

  const components = place.address_components;
  const city =
    componentLong(components, "locality") ??
    componentLong(components, "postal_town") ??
    componentLong(components, "sublocality", "sublocality_level_1") ??
    componentLong(components, "administrative_area_level_3") ??
    componentLong(components, "administrative_area_level_2");

  const country = componentLong(components, "country");
  const loc = place.geometry?.location;
  const latitude = loc ? loc.lat() : null;
  const longitude = loc ? loc.lng() : null;

  return {
    formatted_address: formatted,
    city,
    country,
    latitude,
    longitude,
    place_id: place.place_id?.trim() || null,
  };
}

/** Short label for DB `location` column (city/area). */
export function shortLocationLabel(place: GooglePlaceSelectPayload): string {
  if (place.city?.trim()) return place.city.trim();
  const first = place.formatted_address.split(",")[0]?.trim();
  return first || place.formatted_address;
}

/** Value shown in the location input while typing (no trim — trim only on save). */
export function locationInputDisplayValue(
  address: string | null | undefined,
  location: string | null | undefined,
): string {
  if (address) return address;
  return location ?? "";
}

/** Trim location/address only when persisting to the database. */
export function finalizeLocationText(value: string): string {
  return value.trim();
}

export function isPlaceSelectionComplete(place: PlaceLike): boolean {
  return Boolean(
    place.formatted_address?.trim() &&
      place.geometry?.location &&
      typeof place.geometry.location.lat === "function",
  );
}
