import { getGoogleMapsApiKey } from "@/lib/google-places-loader";
import type { GooglePlaceSelectPayload } from "@/lib/google-places-parse";
import { shortLocationLabel } from "@/lib/google-places-parse";
import type { ProfileDetails } from "@/lib/profile-details";
import type { ProfileRow } from "@/lib/profile-utils";
import type { ProfileDbRow } from "@/lib/profile-load";

export type ProfileLocationFormState = {
  /** Private formatted address shown in the input after Google selection. */
  formattedAddress: string;
  /** Legacy short city label (kept for backward compatibility). */
  location: string;
  city: string | null;
  country: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  googlePlaceId: string | null;
  publicLocation: string | null;
  /** User picked a Google suggestion (or loaded an already-confirmed profile location). */
  placeConfirmed: boolean;
};

export type ProfileLocationSaveInput = {
  formattedAddress: string | null;
  location: string;
  city: string | null;
  country: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  googlePlaceId: string | null;
  publicLocation: string | null;
};

export const EMPTY_PROFILE_LOCATION_FORM: ProfileLocationFormState = {
  formattedAddress: "",
  location: "",
  city: null,
  country: null,
  postalCode: null,
  latitude: null,
  longitude: null,
  googlePlaceId: null,
  publicLocation: null,
  placeConfirmed: false,
};

export function buildPublicLocationLabel(
  city: string | null | undefined,
  country: string | null | undefined,
): string | null {
  const c = city?.trim();
  const co = country?.trim();
  if (c && co) return `${c}, ${co}`;
  if (c) return c;
  if (co) return co;
  return null;
}

export function applyGooglePlaceToFormState(place: GooglePlaceSelectPayload): ProfileLocationFormState {
  const publicLocation = buildPublicLocationLabel(place.city, place.country);
  return {
    formattedAddress: place.formatted_address,
    location: shortLocationLabel(place),
    city: place.city,
    country: place.country,
    postalCode: place.postal_code,
    latitude: place.latitude,
    longitude: place.longitude,
    googlePlaceId: place.place_id,
    publicLocation,
    placeConfirmed: Boolean(
      place.place_id && place.latitude != null && place.longitude != null && place.formatted_address.trim(),
    ),
  };
}

export function clearProfileLocationConfirmation(
  state: ProfileLocationFormState,
  typedValue: string,
): ProfileLocationFormState {
  return {
    ...state,
    formattedAddress: typedValue,
    location: typedValue,
    city: null,
    country: null,
    postalCode: null,
    latitude: null,
    longitude: null,
    googlePlaceId: null,
    publicLocation: null,
    placeConfirmed: false,
  };
}

function googlePlaceIdFromDetails(details: ProfileDetails | undefined): string | null {
  const raw = details as Record<string, unknown> | undefined;
  const id = raw?.google_place_id;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

export function profileLocationFromRow(
  profile: Pick<
    ProfileRow,
    | "location"
    | "address"
    | "latitude"
    | "longitude"
    | "formatted_address"
    | "city"
    | "country"
    | "postal_code"
    | "google_place_id"
    | "public_location"
    | "details"
  >,
): ProfileLocationFormState {
  const formattedAddress =
    profile.formatted_address?.trim() || profile.address?.trim() || profile.location?.trim() || "";
  const googlePlaceId = profile.google_place_id?.trim() || googlePlaceIdFromDetails(profile.details);
  const hasCoords = profile.latitude != null && profile.longitude != null;
  const placeConfirmed = Boolean(googlePlaceId && hasCoords && formattedAddress);

  return {
    formattedAddress,
    location: profile.location?.trim() || profile.public_location?.trim() || shortLocationLabel({
      formatted_address: formattedAddress,
      city: profile.city,
      country: profile.country,
      latitude: profile.latitude,
      longitude: profile.longitude,
      place_id: googlePlaceId,
      postal_code: profile.postal_code,
    }),
    city: profile.city?.trim() || null,
    country: profile.country?.trim() || null,
    postalCode: profile.postal_code?.trim() || null,
    latitude: profile.latitude,
    longitude: profile.longitude,
    googlePlaceId,
    publicLocation: profile.public_location?.trim() || buildPublicLocationLabel(profile.city, profile.country),
    placeConfirmed,
  };
}

export function profileLocationToSaveInput(state: ProfileLocationFormState): ProfileLocationSaveInput {
  const formattedAddress = state.formattedAddress.trim() || null;
  const publicLocation = state.publicLocation?.trim() || buildPublicLocationLabel(state.city, state.country);
  return {
    formattedAddress,
    location: state.location.trim() || publicLocation || formattedAddress || "",
    city: state.city?.trim() || null,
    country: state.country?.trim() || null,
    postalCode: state.postalCode?.trim() || null,
    latitude: state.latitude,
    longitude: state.longitude,
    googlePlaceId: state.googlePlaceId?.trim() || null,
    publicLocation,
  };
}

export function buildProfileLocationDbFields(
  input: ProfileLocationSaveInput,
): Record<string, unknown> {
  const formatted = input.formattedAddress?.trim() || null;
  return {
    location: input.location.trim() || input.publicLocation?.trim() || formatted,
    address: formatted,
    formatted_address: formatted,
    city: input.city,
    country: input.country,
    postal_code: input.postalCode,
    latitude: input.latitude,
    longitude: input.longitude,
    google_place_id: input.googlePlaceId,
    public_location: input.publicLocation,
  };
}

export function isProfileLocationPlaceConfirmed(state: ProfileLocationFormState): boolean {
  return Boolean(
    state.placeConfirmed &&
      state.googlePlaceId?.trim() &&
      state.latitude != null &&
      state.longitude != null &&
      state.formattedAddress.trim(),
  );
}

export function mustSelectGooglePlaceForSave(): boolean {
  return Boolean(getGoogleMapsApiKey());
}

export type ProfileLocationValidationError = "empty" | "placeRequired";

export function validateProfileLocationForSave(
  state: ProfileLocationFormState,
): { ok: true } | { ok: false; error: ProfileLocationValidationError } {
  const text = state.formattedAddress.trim() || state.location.trim();
  if (!text) return { ok: false, error: "empty" };
  if (mustSelectGooglePlaceForSave() && !isProfileLocationPlaceConfirmed(state)) {
    return { ok: false, error: "placeRequired" };
  }
  return { ok: true };
}

export function hasSavedProfileLocation(
  profile: Pick<
    ProfileRow,
    "location" | "public_location" | "city" | "country" | "google_place_id" | "latitude" | "longitude"
  > | null,
): boolean {
  if (!profile) return false;
  return Boolean(resolveProfilePublicLocation(profile) || profile.location?.trim());
}

export function resolveProfilePublicLocation(
  row: Pick<
    ProfileDbRow,
    "public_location" | "location" | "city" | "country" | "google_place_id" | "latitude" | "longitude"
  >,
): string | null {
  const publicLoc = row.public_location?.trim();
  if (publicLoc) return publicLoc;

  const fromParts = buildPublicLocationLabel(
    typeof row.city === "string" ? row.city : null,
    typeof row.country === "string" ? row.country : null,
  );
  if (fromParts && row.google_place_id) return fromParts;

  const legacy = row.location?.trim();
  if (!legacy) return null;

  if (row.google_place_id || (row.latitude != null && row.longitude != null)) {
    return fromParts || legacy;
  }

  return legacy;
}

export function resolvePrivateFormattedAddress(
  row: Pick<ProfileDbRow, "formatted_address" | "address">,
): string | null {
  return row.formatted_address?.trim() || row.address?.trim() || null;
}
