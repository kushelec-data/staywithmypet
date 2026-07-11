"use client";

import { GooglePlacesInput } from "@/components/location/GooglePlacesInput";
import { getGoogleMapsApiKey } from "@/lib/google-places-loader";
import { PROFILE_LOCATION_CITY_OPTIONS, PROFILE_LOCATION_DATALIST_ID } from "@/lib/location-datalist";
import { RequiredFieldLabel, FormFieldError } from "@/components/forms/RequiredFieldLabel";
import {
  applyGooglePlaceToFormState,
  clearProfileLocationConfirmation,
  type ProfileLocationFormState,
} from "@/lib/profile-location";

type ProfileLocationFieldProps = {
  id?: string;
  name?: string;
  label: string;
  placeholder: string;
  hintGoogle: string;
  hintFallback: string;
  value: ProfileLocationFormState;
  onChange: (next: ProfileLocationFormState) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string | null;
};

export function profileLocationInputValue(state: ProfileLocationFormState): string {
  return state.formattedAddress || state.location || "";
}

export function ProfileLocationField({
  id = "profile-location-input",
  name = "location",
  label,
  placeholder,
  hintGoogle,
  hintFallback,
  value,
  onChange,
  disabled,
  required,
  error,
}: ProfileLocationFieldProps) {
  const useGoogle = Boolean(getGoogleMapsApiKey());

  return (
    <div>
      <RequiredFieldLabel htmlFor={id} required={required}>
        {label}
      </RequiredFieldLabel>
      <GooglePlacesInput
        id={id}
        name={name}
        value={profileLocationInputValue(value)}
        onChange={(text) => onChange(clearProfileLocationConfirmation(value, text))}
        onPlaceSelect={(place) => onChange(applyGooglePlaceToFormState(place))}
        required={required}
        disabled={disabled}
        autoComplete="street-address"
        className="input-field mt-1"
        placeholder={placeholder}
        datalistId={useGoogle ? undefined : PROFILE_LOCATION_DATALIST_ID}
        forceGoogleSelection={useGoogle}
      />
      {!useGoogle ? (
        <datalist id={PROFILE_LOCATION_DATALIST_ID}>
          {PROFILE_LOCATION_CITY_OPTIONS.map((city) => (
            <option key={city} value={city} />
          ))}
        </datalist>
      ) : null}
      <p className="mt-1 whitespace-pre-line text-xs text-muted">
        {useGoogle ? hintGoogle : hintFallback}
      </p>
      {error ? (
        <p className="mt-1 text-xs text-brand-pink" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
