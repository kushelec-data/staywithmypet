import { resolveProfileDisplayName } from "@/lib/profile-display-name";
import {
  initialActiveModeForRole,
  roleAfterModeSwitch,
  type ProfileActiveMode,
} from "@/lib/profile-mode";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  attachMemberships,
  fetchUserProfile,
  formatSupabaseError,
  mapProfileRow,
  PROFILE_SELECT,
  type ProfileDbRow,
} from "@/lib/profile-load";
import {
  mergeDetailsGooglePlace,
  mergeDetailsTrustFlags,
} from "@/lib/profile-details";
import {
  mergePetFriendCalendarDates,
  mergePetFriendIntoDetails,
  type PetFriendProfileFormInput,
} from "@/lib/profile-friend-form";
import { emptyMembershipsByRole } from "@/lib/membership";
import { applyMembershipsToProfile, type ProfileRow } from "@/lib/profile-utils";
import { normalizeAvailabilityDates } from "@/lib/pet-availability";
import { countCompletedBookingsForUser, countReviewsAsReviewee } from "@/lib/bookings-stats";
import {
  buildPhoneE164,
  isValidE164,
  normalizeDialCode,
  normalizeNationalDigits,
} from "@/lib/phone-eu";
import {
  computeTrustScorePercent,
  trustInputFromProfileSnapshot,
} from "@/lib/trust-score";

export type ProfileRole = "pet_parent" | "pet_friend" | "both";

export type ProfileSetupInput = {
  displayName: string;
  role: ProfileRole;
  location: string;
  languages: string[];
  bio: string;
  phoneDialCode: string;
  phoneNational: string;
  emergencyContact?: {
    name: string;
    dialCode: string;
    national: string;
    relationship?: string | null;
  } | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  /** YYYY-MM-DD → `profiles.details.availability.selected_dates`. */
  availabilitySelectedDates: string[];
  googlePlaceId?: string | null;
  petFriend?: PetFriendProfileFormInput | null;
};

export type ProfileSaveContext = {
  user: User;
  existingDisplayName?: string | null;
};

function isMissingProfilesColumnError(error: { message?: string } | null): boolean {
  const m = error?.message ?? "";
  if (!m || !/address|latitude|longitude/i.test(m)) return false;
  return /does not exist|schema cache|could not find/i.test(m);
}

async function profilesGeoColumnsWritable(supabase: SupabaseClient): Promise<boolean> {
  const { error } = await supabase.from("profiles").select("address,latitude,longitude").limit(1);
  return !isMissingProfilesColumnError(error);
}

export async function saveUserRole(
  supabase: SupabaseClient,
  userId: string,
  role: ProfileRole,
  context: ProfileSaveContext,
): Promise<ProfileRow> {
  const displayName = resolveProfileDisplayName(context.user, context.existingDisplayName);
  const now = new Date().toISOString();

  const payload = {
    id: userId,
    display_name: displayName,
    role,
    active_mode: initialActiveModeForRole(role),
    role_chosen_at: now,
    updated_at: now,
  };

  console.log("[profile] role save payload", payload);

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select(PROFILE_SELECT)
    .single();

  if (error) {
    console.error("[profile] role save error", error);
    throw new Error(formatSupabaseError(error));
  }

  if (!data) {
    throw new Error("Role could not be saved.");
  }

  const row = data as unknown as ProfileDbRow;
  const saved = await attachMemberships(supabase, mapProfileRow(row), row);
  console.log("[profile] role saved", saved);
  return saved;
}

export async function saveUserActiveMode(
  supabase: SupabaseClient,
  userId: string,
  targetMode: ProfileActiveMode,
  currentProfile: ProfileRow,
  context: ProfileSaveContext,
): Promise<ProfileRow> {
  const displayName = resolveProfileDisplayName(context.user, currentProfile.display_name);
  const now = new Date().toISOString();
  const newRole = roleAfterModeSwitch(currentProfile.role, targetMode);

  const payload = {
    id: userId,
    display_name: displayName,
    role: newRole,
    active_mode: targetMode,
    updated_at: now,
  };

  console.log("[profile] active_mode save payload", payload);

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select(PROFILE_SELECT)
    .single();

  if (error) {
    console.error("[profile] active_mode save error", error);
    throw new Error(formatSupabaseError(error));
  }

  if (!data) {
    throw new Error("Mode could not be saved.");
  }

  const saved = mapProfileRow(data as unknown as ProfileDbRow);
  const withMemberships = applyMembershipsToProfile(
    saved,
    currentProfile.memberships ?? emptyMembershipsByRole(),
  );
  console.log("[profile] active_mode saved", withMemberships);
  return withMemberships;
}

export async function saveUserProfile(
  supabase: SupabaseClient,
  userId: string,
  input: ProfileSetupInput,
  context: ProfileSaveContext & { preserveRole?: ProfileRole },
): Promise<ProfileRow> {
  const trimmedInputName = input.displayName.trim();
  const displayName =
    trimmedInputName || resolveProfileDisplayName(context.user, context.existingDisplayName);
  const now = new Date().toISOString();
  const role = context.preserveRole ?? input.role;

  const { data: existingRow, error: detailsLoadError } = await supabase
    .from("profiles")
    .select("details, phone_e164, phone_verified, avatar_url, bio")
    .eq("id", userId)
    .maybeSingle();

  type TrustLoadRow = {
    details?: unknown;
    phone_e164?: string | null;
    phone_verified?: boolean | null;
    avatar_url?: string | null;
    bio?: string | null;
  };

  let rowForTrust: TrustLoadRow | null = existingRow as TrustLoadRow | null;

  if (detailsLoadError && /column/i.test(detailsLoadError.message)) {
    const minimal = await supabase
      .from("profiles")
      .select("details, avatar_url, bio")
      .eq("id", userId)
      .maybeSingle();
    if (minimal.error) {
      console.error("[profile] details load error", minimal.error);
      throw new Error(formatSupabaseError(minimal.error));
    }
    rowForTrust = (minimal.data ?? null) as TrustLoadRow | null;
  } else if (detailsLoadError) {
    console.error("[profile] details load error", detailsLoadError);
    throw new Error(formatSupabaseError(detailsLoadError));
  }

  const existingDetailsRaw = rowForTrust?.details;
  let prevPhoneE164 = "";
  let prevPhoneVerifiedCol = false;
  if (rowForTrust && typeof rowForTrust === "object") {
    const r = rowForTrust as Record<string, unknown>;
    if (typeof r.phone_e164 === "string" && r.phone_e164.trim()) prevPhoneE164 = r.phone_e164.trim();
    prevPhoneVerifiedCol = r.phone_verified === true;
  }

  let detailsMerged: Record<string, unknown> =
    existingDetailsRaw && typeof existingDetailsRaw === "object"
      ? { ...(existingDetailsRaw as Record<string, unknown>) }
      : {};

  if (input.petFriend) {
    detailsMerged = mergePetFriendIntoDetails(detailsMerged, {
      ...input.petFriend,
      availabilitySelectedDates: normalizeAvailabilityDates(
        input.petFriend.availabilitySelectedDates.length
          ? input.petFriend.availabilitySelectedDates
          : input.availabilitySelectedDates,
      ),
    });
  } else {
    detailsMerged = mergePetFriendCalendarDates(
      detailsMerged,
      normalizeAvailabilityDates(input.availabilitySelectedDates),
    );
  }

  const phoneNationalNorm = normalizeNationalDigits(input.phoneNational ?? "");
  const phoneE164 =
    phoneNationalNorm.length > 0 ? buildPhoneE164(input.phoneDialCode, phoneNationalNorm) : "";

  if (phoneNationalNorm.length > 0 && !isValidE164(phoneE164)) {
    throw new Error("Please enter a valid phone number (country code + number).");
  }

  const ecName = input.emergencyContact?.name?.trim() ?? "";
  const ecNat = normalizeNationalDigits(input.emergencyContact?.national ?? "");
  const ecDial = normalizeDialCode(input.emergencyContact?.dialCode ?? "+372");
  const ecRelationship = input.emergencyContact?.relationship?.trim() || null;

  const emergencyPartial = Boolean(ecName || ecNat);
  let emergencyE164 = "";
  if (emergencyPartial) {
    if (!ecName) {
      throw new Error("Please enter your emergency contact's name.");
    }
    if (!ecNat) {
      throw new Error("Please enter your emergency contact's phone number.");
    }
    emergencyE164 = buildPhoneE164(ecDial, ecNat);
    if (!isValidE164(emergencyE164)) {
      throw new Error("Please enter a valid emergency contact phone number.");
    }
  }

  let nextPhoneVerified = false;
  if (phoneE164 && phoneE164 === prevPhoneE164) {
    nextPhoneVerified = prevPhoneVerifiedCol;
  }

  detailsMerged = mergeDetailsTrustFlags(
    mergeDetailsGooglePlace(detailsMerged, input.googlePlaceId),
    Boolean(context.user.email_confirmed_at),
    {
      phoneVerified: nextPhoneVerified,
      emergencyContact: emergencyE164
        ? { name: ecName, phone: emergencyE164, relationship: ecRelationship }
        : null,
    },
  );

  const [completedBookings, reviewsCount] = await Promise.all([
    countCompletedBookingsForUser(supabase, userId),
    countReviewsAsReviewee(supabase, userId),
  ]);

  const existingAvatar =
    rowForTrust && typeof rowForTrust === "object"
      ? (rowForTrust as Record<string, unknown>).avatar_url
      : null;

  const trustInput = trustInputFromProfileSnapshot({
    emailVerified: Boolean(context.user.email_confirmed_at),
    phoneVerified: nextPhoneVerified,
    avatarUrl: typeof existingAvatar === "string" ? existingAvatar : null,
    bio: input.bio,
    completedBookingsCount: completedBookings,
    reviewsAsRevieweeCount: reviewsCount,
    hasEmergencyContact: Boolean(emergencyE164),
  });
  const trustScore = computeTrustScorePercent(trustInput);

  const canWriteGeo = await profilesGeoColumnsWritable(supabase);

  const row: Record<string, unknown> = {
    id: userId,
    display_name: displayName,
    role,
    location: input.location.trim() || input.address?.trim() || null,
    languages: input.languages,
    bio: input.bio.trim() || null,
    phone: phoneE164 || null,
    phone_country_code: phoneE164 ? normalizeDialCode(input.phoneDialCode) : null,
    phone_number: phoneE164 ? phoneNationalNorm : null,
    phone_e164: phoneE164 || null,
    phone_verified: nextPhoneVerified,
    emergency_contact_name: emergencyE164 ? ecName : null,
    emergency_contact_phone_country_code: emergencyE164 ? ecDial : null,
    emergency_contact_phone_number: emergencyE164 ? ecNat : null,
    emergency_contact_phone_e164: emergencyE164 || null,
    trust_score: trustScore,
    details: detailsMerged,
    updated_at: now,
  };

  if (canWriteGeo) {
    row.address = input.address?.trim() ? input.address.trim() : input.location.trim() || null;
    row.latitude = input.latitude ?? null;
    row.longitude = input.longitude ?? null;
  }

  console.log("[profile] save payload", { ...row, details: "[merged]" });

  let { data, error } = await supabase
    .from("profiles")
    .upsert(row, { onConflict: "id" })
    .select(PROFILE_SELECT)
    .single();

  if (error && /column/i.test(error.message)) {
    const {
      phone_country_code: _a,
      phone_number: _b,
      phone_e164: _c,
      phone_verified: _d,
      emergency_contact_name: _e,
      emergency_contact_phone_country_code: _f,
      emergency_contact_phone_number: _g,
      emergency_contact_phone_e164: _h,
      trust_score: _i,
      details: det,
      ...minimal
    } = row;
    const retry = await supabase
      .from("profiles")
      .upsert({ ...minimal, details: det }, { onConflict: "id" })
      .select(PROFILE_SELECT)
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error("[profile] save error", error);
    throw new Error(formatSupabaseError(error));
  }

  if (!data) {
    const reloaded = await fetchUserProfile(supabase, userId);
    if (!reloaded) throw new Error("Profile saved but could not be loaded.");
    console.log("[profile] saved (reloaded)", reloaded);
    return reloaded;
  }

  const dbRow = data as unknown as ProfileDbRow;
  const saved = await attachMemberships(supabase, mapProfileRow(dbRow), dbRow);
  console.log("[profile] saved", saved);
  return saved;
}
