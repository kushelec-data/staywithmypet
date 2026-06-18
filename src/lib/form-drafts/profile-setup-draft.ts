import { normalizeAvailabilityDates } from "@/lib/pet-availability";
import { languagesOtherFromDetails } from "@/lib/profile-languages";
import {
  emptyPetFriendProfileForm,
  petFriendFormFromDetailsRaw,
  type PetFriendProfileFormInput,
} from "@/lib/profile-friend-form";
import { profileLocationFromRow, EMPTY_PROFILE_LOCATION_FORM } from "@/lib/profile-location";
import type { ProfileRow } from "@/lib/profile-utils";
import { parseEmergencyContactFromProfile } from "@/lib/trust-safety";
import { parseDialCodeFromE164 } from "@/lib/phone-eu";
import type { TrustSafetyFormValues } from "@/components/profile/TrustSafetyFormSection";
import { emptyTrustSafetyFormValues } from "@/components/profile/TrustSafetyFormSection";
import type { ProfileRole } from "@/lib/profile-setup";
import type { ProfileContentLanguage } from "@/lib/profile-content-language";

export type ProfileSetupDraftData = {
  displayName: string;
  role: ProfileRole;
  profileLocation: ReturnType<typeof profileLocationFromRow>;
  availabilitySelectedDates: string[];
  languages: string[];
  languagesOther: string;
  profileLanguage: ProfileContentLanguage | "";
  bio: string;
  trustSafety: TrustSafetyFormValues;
  petFriendForm: PetFriendProfileFormInput;
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

export function buildProfileSetupDraftFromProfile(profile: ProfileRow): ProfileSetupDraftData {
  const sched = profile.details?.availability_schedule;
  return {
    displayName: profile.display_name?.trim() ?? "",
    role: profile.role ?? "pet_friend",
    profileLocation: profileLocationFromRow(profile),
    availabilitySelectedDates: normalizeAvailabilityDates(sched?.selected_dates ?? []),
    languages: [...(profile.languages ?? [])],
    languagesOther: languagesOtherFromDetails(profile.details),
    profileLanguage: profile.profile_language ?? "",
    bio: profile.bio?.trim() ?? "",
    trustSafety: trustSafetyFromProfile(profile),
    petFriendForm: petFriendFormFromDetailsRaw(
      profile.details,
      normalizeAvailabilityDates(sched?.selected_dates ?? []),
    ),
  };
}

export function emptyProfileSetupDraft(): ProfileSetupDraftData {
  return {
    displayName: "",
    role: "pet_friend",
    profileLocation: { ...EMPTY_PROFILE_LOCATION_FORM },
    availabilitySelectedDates: [],
    languages: [],
    languagesOther: "",
    profileLanguage: "",
    bio: "",
    trustSafety: emptyTrustSafetyFormValues,
    petFriendForm: emptyPetFriendProfileForm(),
  };
}
