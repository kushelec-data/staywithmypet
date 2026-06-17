import { normalizeAvailabilityDates } from "@/lib/pet-availability";
import { languagesOtherFromDetails } from "@/lib/profile-languages";
import {
  emptyPetFriendProfileForm,
  petFriendFormFromDetailsRaw,
  type PetFriendProfileFormInput,
} from "@/lib/profile-friend-form";
import {
  emptyPetParentProfileForm,
  petParentFormFromDetailsRaw,
  type PetParentProfileFormInput,
} from "@/lib/profile-parent-form";
import { profileLocationFromRow, EMPTY_PROFILE_LOCATION_FORM, type ProfileLocationFormState } from "@/lib/profile-location";
import type { ProfileRow } from "@/lib/profile-utils";
import { parseEmergencyContactFromProfile } from "@/lib/trust-safety";
import { parseDialCodeFromE164 } from "@/lib/phone-eu";
import type { TrustSafetyFormValues } from "@/components/profile/TrustSafetyFormSection";
import { emptyTrustSafetyFormValues } from "@/components/profile/TrustSafetyFormSection";

export type ProfileEditDraftData = {
  displayName: string;
  profileLocation: ProfileLocationFormState;
  languages: string[];
  languagesOther: string;
  bio: string;
  trustSafety: TrustSafetyFormValues;
  petFriendForm: PetFriendProfileFormInput;
  petParentForm: PetParentProfileFormInput;
  activeStepIndex: number;
};

function trustSafetyFromProfile(profile: ProfileRow): TrustSafetyFormValues {
  const emergency = parseEmergencyContactFromProfile(profile);
  const mainE164 = profile.phone_e164?.trim() || profile.phone?.trim() || "";
  const mainParts = parseDialCodeFromE164(mainE164 || null);
  const ecParts = parseDialCodeFromE164(emergency?.phone ?? null);
  return {
    phoneDialCode: profile.phone_country_code?.trim() || mainParts.dialCode,
    phoneNational: profile.phone_number?.trim() || mainParts.nationalDigits,
    emergencyName: emergency?.name ?? "",
    emergencyDialCode: profile.emergency_contact_phone_country_code?.trim() || ecParts.dialCode,
    emergencyNational: profile.emergency_contact_phone_number?.trim() || ecParts.nationalDigits,
    emergencyRelationship:
      emergency?.relationship ?? profile.details?.emergency_contact_relationship ?? "",
  };
}

export function buildProfileEditDraftFromProfile(
  profile: ProfileRow,
  activeStepIndex = 0,
): ProfileEditDraftData {
  return {
    displayName: profile.display_name?.trim() ?? "",
    profileLocation: profileLocationFromRow(profile),
    languages: [...(profile.languages ?? [])],
    languagesOther: languagesOtherFromDetails(profile.details),
    bio: profile.bio?.trim() ?? "",
    trustSafety: trustSafetyFromProfile(profile),
    petFriendForm: petFriendFormFromDetailsRaw(
      profile.details,
      normalizeAvailabilityDates(profile.details?.availability_schedule?.selected_dates ?? []),
    ),
    petParentForm: petParentFormFromDetailsRaw(profile.details),
    activeStepIndex,
  };
}

export function emptyProfileEditDraft(activeStepIndex = 0): ProfileEditDraftData {
  return {
    displayName: "",
    profileLocation: { ...EMPTY_PROFILE_LOCATION_FORM },
    languages: [],
    languagesOther: "",
    bio: "",
    trustSafety: emptyTrustSafetyFormValues,
    petFriendForm: emptyPetFriendProfileForm(),
    petParentForm: emptyPetParentProfileForm(),
    activeStepIndex,
  };
}
