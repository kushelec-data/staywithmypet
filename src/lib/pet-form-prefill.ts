import type { User } from "@supabase/supabase-js";
import type { PetProfileFormInput } from "@/lib/pet-data";
import {
  EMPTY_PROFILE_LOCATION_FORM,
  profileLocationFromRow,
  profileLocationToSaveInput,
  type ProfileLocationFormState,
} from "@/lib/profile-location";
import { parseDialCodeFromE164, DEFAULT_PHONE_DIAL_CODE } from "@/lib/phone-eu";
import { resolveProfileDisplayName } from "@/lib/profile-display-name";
import type { ProfileRow } from "@/lib/profile-utils";

export function prefillDisplayNameIfEmpty(
  current: string,
  user: User | null,
  existingProfileName?: string | null,
): string {
  if (current.trim()) return current;
  if (!user) return current;
  return resolveProfileDisplayName(user, existingProfileName);
}

export function prefillProfileLocationIfEmpty(
  current: ProfileLocationFormState,
  profile: ProfileRow | null | undefined,
): ProfileLocationFormState {
  if (
    current.placeConfirmed ||
    current.formattedAddress.trim() ||
    current.location.trim()
  ) {
    return current;
  }
  if (!profile) return current;
  return profileLocationFromRow(profile);
}

export function prefillLanguagesIfEmpty(
  current: string[],
  profile: ProfileRow | null | undefined,
): string[] {
  if (current.length > 0) return current;
  return [...(profile?.languages ?? [])];
}

export function prefillPhoneCountryFromProfile(
  profile: ProfileRow | null | undefined,
): { dialCode: string; national: string } {
  const mainE164 = profile?.phone_e164?.trim() || profile?.phone?.trim() || "";
  const parts = parseDialCodeFromE164(mainE164 || null);
  return {
    dialCode: profile?.phone_country_code?.trim() || parts.dialCode || DEFAULT_PHONE_DIAL_CODE,
    national: profile?.phone_number?.trim() || parts.nationalDigits,
  };
}

export function prefillTrustPhoneIfEmpty(
  current: { phoneDialCode: string; phoneNational: string },
  profile: ProfileRow | null | undefined,
): { phoneDialCode: string; phoneNational: string } {
  if (current.phoneNational.trim()) {
    return current;
  }
  const fromProfile = prefillPhoneCountryFromProfile(profile);
  return {
    phoneDialCode: current.phoneDialCode || fromProfile.dialCode,
    phoneNational: fromProfile.national,
  };
}

export function profileLocationToPetFormFields(
  profile: ProfileRow,
): Pick<
  PetProfileFormInput,
  "location" | "address" | "latitude" | "longitude" | "googlePlaceId"
> {
  const formState = profileLocationFromRow(profile);
  if (
    !formState.placeConfirmed &&
    !formState.formattedAddress.trim() &&
    !formState.location.trim()
  ) {
    return {
      location: "",
      address: "",
      latitude: null,
      longitude: null,
      googlePlaceId: null,
    };
  }
  const save = profileLocationToSaveInput(formState);
  const address = save.formattedAddress?.trim() || save.location.trim();
  const location = save.publicLocation?.trim() || save.location.trim() || address;
  return {
    location,
    address,
    latitude: save.latitude,
    longitude: save.longitude,
    googlePlaceId: save.googlePlaceId,
  };
}

export function petFormLocationIsEmpty(form: Pick<PetProfileFormInput, "location" | "address">): boolean {
  return !form.location.trim() && !form.address.trim();
}

export function emptyPetFormLocation(): Pick<
  PetProfileFormInput,
  "location" | "address" | "latitude" | "longitude" | "googlePlaceId"
> {
  return {
    location: "",
    address: "",
    latitude: null,
    longitude: null,
    googlePlaceId: null,
  };
}

/** Returns profile location mapped for pet form only when pet location fields are empty. */
export function applyProfileLocationToPetFormIfEmpty(
  form: PetProfileFormInput,
  profile: ProfileRow | null | undefined,
): PetProfileFormInput {
  if (!profile || !petFormLocationIsEmpty(form)) {
    return form;
  }
  return { ...form, ...profileLocationToPetFormFields(profile) };
}

export function isProfileLocationUsableForPetPrefill(profile: ProfileRow | null | undefined): boolean {
  if (!profile) return false;
  const state = profileLocationFromRow(profile);
  return Boolean(
    state.placeConfirmed ||
      state.formattedAddress.trim() ||
      state.location.trim() ||
      profile.location?.trim(),
  );
}

export { EMPTY_PROFILE_LOCATION_FORM };
