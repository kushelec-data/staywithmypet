import { normalizeFullName } from "@/lib/name-format";
import { resolveProfileDisplayName } from "@/lib/profile-display-name";
import {
  assertProfileMatchesUser,
  isProfileOwnedByUser,
} from "@/lib/profile-session-guard";
import {
  ActiveModeSwitchError,
  canSwitchActiveMode,
  initialActiveModeForRole,
  resolveActiveMode,
  type ProfileActiveMode,
} from "@/lib/profile-mode";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  fetchUserProfile,
  formatSupabaseError,
  upsertProfileRowAndReload,
} from "@/lib/profile-load";
import { applyMarketplaceVisibility } from "@/lib/profile-marketplace-visibility";
import {
  mergeDetailsGooglePlace,
  mergeDetailsTrustFlags,
} from "@/lib/profile-details";
import { mergeLanguagesOtherIntoDetails } from "@/lib/profile-languages";
import {
  buildProfileLocationDbFields,
  type ProfileLocationSaveInput,
} from "@/lib/profile-location";
import {
  mergePetFriendCalendarDates,
  mergePetFriendIntoDetails,
  type PetFriendProfileFormInput,
} from "@/lib/profile-friend-form";
import {
  mergePetParentIntoDetails,
  type PetParentProfileFormInput,
} from "@/lib/profile-parent-form";
import type { ProfileRow } from "@/lib/profile-utils";
import { normalizeAvailabilityDates } from "@/lib/pet-availability";
import { countCompletedBookingsForUser, countReviewsAsReviewee } from "@/lib/bookings-stats";
import {
  buildPhoneE164,
  isValidE164,
  normalizeDialCode,
  normalizeNationalDigits,
} from "@/lib/phone-eu";
import {
  preferredVetClinicDbFieldsFromForm,
  type PreferredVetClinicFormValues,
} from "@/lib/preferred-vet-clinic";
import { calculateTrustScore } from "@/lib/trust-score";

export type ProfileRole = "pet_parent" | "pet_friend" | "both";

export type ProfileSetupInput = {
  displayName: string;
  role: ProfileRole;
  location: ProfileLocationSaveInput;
  languages: string[];
  languagesOther: string;
  bio: string;
  phoneDialCode: string;
  phoneNational: string;
  emergencyContact?: {
    name: string;
    dialCode: string;
    national: string;
    relationship?: string | null;
  } | null;
  preferredVet?: PreferredVetClinicFormValues | null;
  availabilitySelectedDates: string[];
  petFriend?: PetFriendProfileFormInput | null;
};

export type ProfileSaveContext = {
  user: User;
  existingDisplayName?: string | null;
};

function isMissingProfilesColumnError(error: { message?: string } | null): boolean {
  const m = error?.message ?? "";
  if (!m || !/address|latitude|longitude|formatted_address|google_place_id|public_location|postal_code|city|country/i.test(m)) {
    return false;
  }
  return /does not exist|schema cache|could not find/i.test(m);
}

async function profilesGeoColumnsWritable(supabase: SupabaseClient): Promise<boolean> {
  const { error } = await supabase.from("profiles").select("address,latitude,longitude").limit(1);
  return !isMissingProfilesColumnError(error);
}

async function profilesLocationColumnsWritable(supabase: SupabaseClient): Promise<boolean> {
  const { error } = await supabase
    .from("profiles")
    .select("formatted_address,google_place_id,public_location,city,country,postal_code")
    .limit(1);
  return !isMissingProfilesColumnError(error);
}

function applyLocationFieldsToRow(
  row: Record<string, unknown>,
  location: ProfileLocationSaveInput,
  options: { geo: boolean; structured: boolean },
): void {
  if (options.structured) {
    Object.assign(row, buildProfileLocationDbFields(location));
    return;
  }
  row.location = location.location.trim() || location.publicLocation?.trim() || null;
  if (options.geo) {
    row.address = location.formattedAddress?.trim() || null;
    row.latitude = location.latitude ?? null;
    row.longitude = location.longitude ?? null;
  }
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
    display_name: displayName,
    role,
    active_mode: initialActiveModeForRole(role),
    role_chosen_at: now,
    updated_at: now,
  };

  console.log("[profile] role save payload", { id: userId, ...payload });

  const { error } = await supabase.from("profiles").update(payload).eq("id", userId);

  if (error) {
    console.error("[profile] role save error", error);
    throw new Error(formatSupabaseError(error));
  }

  const reloaded = await fetchUserProfile(supabase, userId);
  if (!reloaded) {
    throw new Error("Role could not be saved.");
  }

  assertProfileMatchesUser(reloaded.id, userId);
  console.log("[profile] role saved", reloaded);
  return reloaded;
}

export async function saveUserActiveMode(
  supabase: SupabaseClient,
  userId: string,
  targetMode: ProfileActiveMode,
  currentProfile: ProfileRow,
  context: ProfileSaveContext,
): Promise<ProfileRow> {
  const displayName = resolveProfileDisplayName(context.user, currentProfile.display_name);
  const currentMode = resolveActiveMode(currentProfile.role, currentProfile.active_mode);

  if (currentMode === targetMode) {
    throw new ActiveModeSwitchError("already_active", "This dashboard mode is already active.");
  }

  if (!canSwitchActiveMode(currentProfile.role, targetMode)) {
    throw new ActiveModeSwitchError(
      "unsupported_mode",
      "Complete setup for the other role before switching dashboard mode.",
    );
  }

  const now = new Date().toISOString();

  const payload = {
    display_name: displayName,
    active_mode: targetMode,
    updated_at: now,
  };

  console.log("[profile] active_mode save payload", { id: userId, ...payload });

  const { error } = await supabase.from("profiles").update(payload).eq("id", userId);

  if (error) {
    console.error("[profile] active_mode save error", error);
    throw new Error(formatSupabaseError(error));
  }

  if (!isProfileOwnedByUser(currentProfile.id, userId)) {
    throw new Error("Profile session mismatch");
  }

  const reloaded = await fetchUserProfile(supabase, userId);
  if (!reloaded) {
    throw new Error("Mode could not be saved.");
  }

  assertProfileMatchesUser(reloaded.id, userId);
  console.log("[profile] active_mode saved", reloaded);
  return reloaded;
}

export async function saveUserProfile(
  supabase: SupabaseClient,
  userId: string,
  input: ProfileSetupInput,
  context: ProfileSaveContext & { preserveRole?: ProfileRole },
): Promise<ProfileRow> {
  const trimmedInputName = normalizeFullName(input.displayName);
  const displayName =
    trimmedInputName || resolveProfileDisplayName(context.user, context.existingDisplayName);
  const now = new Date().toISOString();
  const role = context.preserveRole ?? input.role;

  const { data: existingRow, error: detailsLoadError } = await supabase
    .from("profiles")
    .select(
      "details, phone_e164, phone_verified, avatar_url, bio, emergency_contact_name, emergency_contact_phone_country_code, emergency_contact_phone_number, emergency_contact_phone_e164",
    )
    .eq("id", userId)
    .maybeSingle();

  type TrustLoadRow = {
    details?: unknown;
    phone_e164?: string | null;
    phone_verified?: boolean | null;
    avatar_url?: string | null;
    bio?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone_country_code?: string | null;
    emergency_contact_phone_number?: string | null;
    emergency_contact_phone_e164?: string | null;
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

  let ecName = input.emergencyContact?.name?.trim() ?? "";
  let ecNat = normalizeNationalDigits(input.emergencyContact?.national ?? "");
  let ecDial = normalizeDialCode(input.emergencyContact?.dialCode ?? "+372");
  const ecRelationship = input.emergencyContact?.relationship?.trim() || null;

  if (rowForTrust && typeof rowForTrust === "object") {
    const prev = rowForTrust as TrustLoadRow;
    if (!ecName && prev.emergency_contact_name?.trim()) {
      ecName = prev.emergency_contact_name.trim();
    }
    if (!ecNat && prev.emergency_contact_phone_number?.trim()) {
      ecNat = normalizeNationalDigits(prev.emergency_contact_phone_number);
    }
    if (ecDial === "+372" && prev.emergency_contact_phone_country_code?.trim()) {
      ecDial = normalizeDialCode(prev.emergency_contact_phone_country_code);
    }
  }

  const emergencyPartial = Boolean(ecName || ecNat || ecRelationship);
  let emergencyE164 = "";
  if (emergencyPartial) {
    if (!ecName) {
      throw new Error("Please enter your emergency contact's name.");
    }
    if (!ecNat) {
      if (ecRelationship && rowForTrust) {
        const prevE164 = (rowForTrust as TrustLoadRow).emergency_contact_phone_e164?.trim();
        if (prevE164 && isValidE164(prevE164)) {
          emergencyE164 = prevE164;
          ecNat = normalizeNationalDigits(
            (rowForTrust as TrustLoadRow).emergency_contact_phone_number ?? "",
          );
          if ((rowForTrust as TrustLoadRow).emergency_contact_phone_country_code?.trim()) {
            ecDial = normalizeDialCode(
              (rowForTrust as TrustLoadRow).emergency_contact_phone_country_code!,
            );
          }
        } else {
          throw new Error("Please enter your emergency contact's phone number.");
        }
      } else {
        throw new Error("Please enter your emergency contact's phone number.");
      }
    } else {
      emergencyE164 = buildPhoneE164(ecDial, ecNat);
      if (!isValidE164(emergencyE164)) {
        throw new Error("Please enter a valid emergency contact phone number.");
      }
    }
  }

  let nextPhoneVerified = false;
  if (phoneE164 && phoneE164 === prevPhoneE164) {
    nextPhoneVerified = prevPhoneVerifiedCol;
  }

  detailsMerged = mergeDetailsTrustFlags(
    mergeDetailsGooglePlace(detailsMerged, input.location.googlePlaceId),
    Boolean(context.user.email_confirmed_at),
    {
      phoneVerified: nextPhoneVerified,
      emergencyContact: emergencyE164
        ? { name: ecName, phone: emergencyE164, relationship: ecRelationship }
        : null,
    },
  );

  detailsMerged = mergeLanguagesOtherIntoDetails(
    detailsMerged,
    input.languages,
    input.languagesOther,
  );

  const [completedBookings, reviewsCount] = await Promise.all([
    countCompletedBookingsForUser(supabase, userId),
    countReviewsAsReviewee(supabase, userId),
  ]);

  const existingAvatar =
    rowForTrust && typeof rowForTrust === "object"
      ? (rowForTrust as Record<string, unknown>).avatar_url
      : null;

  const trustScore = calculateTrustScore(
    {
      avatar_url: typeof existingAvatar === "string" ? existingAvatar : null,
      bio: input.bio,
      phone_verified: nextPhoneVerified,
      phone: phoneE164 || null,
      phone_e164: phoneE164 || null,
      emergency_contact_name: ecName || null,
      emergency_contact_phone_e164: emergencyE164 || null,
      details: detailsMerged,
    },
    {
      emailVerified: Boolean(context.user.email_confirmed_at),
      completedBookingsCount: completedBookings,
      reviewsAsRevieweeCount: reviewsCount,
      phoneVerified: nextPhoneVerified,
    },
  ).percent;

  const canWriteGeo = await profilesGeoColumnsWritable(supabase);
  const canWriteLocation = await profilesLocationColumnsWritable(supabase);

  const row: Record<string, unknown> = {
    id: userId,
    display_name: displayName,
    role,
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
    ...(input.preferredVet ? preferredVetClinicDbFieldsFromForm(input.preferredVet) : {}),
  };

  applyLocationFieldsToRow(row, input.location, {
    geo: canWriteGeo,
    structured: canWriteLocation,
  });

  console.log("[profile] save payload", { ...row, details: "[merged]" });

  const saved = await upsertProfileRowAndReload(supabase, userId, row, "save");
  await applyMarketplaceVisibility(supabase, userId);
  return saved;
}

export type BasicProfileSectionInput = {
  displayName: string;
  location: ProfileLocationSaveInput;
  languages: string[];
  languagesOther: string;
  bio: string;
};

export type TrustSafetySectionInput = {
  phoneDialCode: string;
  phoneNational: string;
  emergencyContact?: {
    name: string;
    dialCode: string;
    national: string;
    relationship?: string | null;
  } | null;
  preferredVet?: PreferredVetClinicFormValues | null;
};

type ProfileTrustLoadRow = {
  details?: unknown;
  phone_e164?: string | null;
  phone_verified?: boolean | null;
  avatar_url?: string | null;
  bio?: string | null;
  role?: ProfileRole | null;
  display_name?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone_country_code?: string | null;
  emergency_contact_phone_number?: string | null;
  emergency_contact_phone_e164?: string | null;
};

async function loadProfileTrustRow(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileTrustLoadRow | null> {
  const { data: existingRow, error: detailsLoadError } = await supabase
    .from("profiles")
    .select(
      "details, phone_e164, phone_verified, avatar_url, bio, role, display_name, emergency_contact_name, emergency_contact_phone_country_code, emergency_contact_phone_number, emergency_contact_phone_e164",
    )
    .eq("id", userId)
    .maybeSingle();

  let rowForTrust: ProfileTrustLoadRow | null = existingRow as ProfileTrustLoadRow | null;

  if (detailsLoadError && /column/i.test(detailsLoadError.message)) {
    const minimal = await supabase
      .from("profiles")
      .select("details, avatar_url, bio, role, display_name")
      .eq("id", userId)
      .maybeSingle();
    if (minimal.error) {
      console.error("[profile] details load error", minimal.error);
      throw new Error(formatSupabaseError(minimal.error));
    }
    rowForTrust = (minimal.data ?? null) as ProfileTrustLoadRow | null;
  } else if (detailsLoadError) {
    console.error("[profile] details load error", detailsLoadError);
    throw new Error(formatSupabaseError(detailsLoadError));
  }

  return rowForTrust;
}

function resolvePhoneAndEmergency(
  input: TrustSafetySectionInput,
  rowForTrust: ProfileTrustLoadRow | null,
): {
  phoneE164: string;
  phoneNationalNorm: string;
  phoneDialCode: string;
  nextPhoneVerified: boolean;
  emergencyE164: string;
  ecName: string;
  ecNat: string;
  ecDial: string;
  ecRelationship: string | null;
} {
  let prevPhoneE164 = "";
  let prevPhoneVerifiedCol = false;
  if (rowForTrust && typeof rowForTrust === "object") {
    const r = rowForTrust as Record<string, unknown>;
    if (typeof r.phone_e164 === "string" && r.phone_e164.trim()) prevPhoneE164 = r.phone_e164.trim();
    prevPhoneVerifiedCol = r.phone_verified === true;
  }

  const phoneNationalNorm = normalizeNationalDigits(input.phoneNational ?? "");
  const phoneE164 =
    phoneNationalNorm.length > 0 ? buildPhoneE164(input.phoneDialCode, phoneNationalNorm) : "";

  if (phoneNationalNorm.length > 0 && !isValidE164(phoneE164)) {
    throw new Error("Please enter a valid phone number (country code + number).");
  }

  let ecName = input.emergencyContact?.name?.trim() ?? "";
  let ecNat = normalizeNationalDigits(input.emergencyContact?.national ?? "");
  let ecDial = normalizeDialCode(input.emergencyContact?.dialCode ?? "+372");
  const ecRelationship = input.emergencyContact?.relationship?.trim() || null;

  if (rowForTrust && typeof rowForTrust === "object") {
    const prev = rowForTrust;
    if (!ecName && prev.emergency_contact_name?.trim()) {
      ecName = prev.emergency_contact_name.trim();
    }
    if (!ecNat && prev.emergency_contact_phone_number?.trim()) {
      ecNat = normalizeNationalDigits(prev.emergency_contact_phone_number);
    }
    if (ecDial === "+372" && prev.emergency_contact_phone_country_code?.trim()) {
      ecDial = normalizeDialCode(prev.emergency_contact_phone_country_code);
    }
  }

  const emergencyPartial = Boolean(ecName || ecNat || ecRelationship);
  let emergencyE164 = "";
  if (emergencyPartial) {
    if (!ecName) {
      throw new Error("Please enter your emergency contact's name.");
    }
    if (!ecNat) {
      if (ecRelationship && rowForTrust) {
        const prevE164 = rowForTrust.emergency_contact_phone_e164?.trim();
        if (prevE164 && isValidE164(prevE164)) {
          emergencyE164 = prevE164;
          ecNat = normalizeNationalDigits(rowForTrust.emergency_contact_phone_number ?? "");
          if (rowForTrust.emergency_contact_phone_country_code?.trim()) {
            ecDial = normalizeDialCode(rowForTrust.emergency_contact_phone_country_code);
          }
        } else {
          throw new Error("Please enter your emergency contact's phone number.");
        }
      } else {
        throw new Error("Please enter your emergency contact's phone number.");
      }
    } else {
      emergencyE164 = buildPhoneE164(ecDial, ecNat);
      if (!isValidE164(emergencyE164)) {
        throw new Error("Please enter a valid emergency contact phone number.");
      }
    }
  }

  let nextPhoneVerified = false;
  if (phoneE164 && phoneE164 === prevPhoneE164) {
    nextPhoneVerified = prevPhoneVerifiedCol;
  }

  return {
    phoneE164,
    phoneNationalNorm,
    phoneDialCode: input.phoneDialCode,
    nextPhoneVerified,
    emergencyE164,
    ecName,
    ecNat,
    ecDial,
    ecRelationship,
  };
}

async function computeTrustScoreForUser(
  supabase: SupabaseClient,
  userId: string,
  context: ProfileSaveContext,
  rowForTrust: ProfileTrustLoadRow | null,
  options: {
    phoneVerified: boolean;
    hasEmergencyContact: boolean;
    bioOverride?: string | null;
  },
): Promise<number> {
  const [completedBookings, reviewsCount] = await Promise.all([
    countCompletedBookingsForUser(supabase, userId),
    countReviewsAsReviewee(supabase, userId),
  ]);

  const existingAvatar =
    rowForTrust && typeof rowForTrust === "object"
      ? (rowForTrust as Record<string, unknown>).avatar_url
      : null;

  const row = rowForTrust as Record<string, unknown> | null;
  return calculateTrustScore(
    {
      avatar_url: typeof existingAvatar === "string" ? existingAvatar : null,
      bio: options.bioOverride ?? rowForTrust?.bio ?? null,
      phone_verified: options.phoneVerified,
      phone: typeof row?.phone === "string" ? row.phone : null,
      phone_e164: typeof row?.phone_e164 === "string" ? row.phone_e164 : null,
      emergency_contact_name:
        typeof row?.emergency_contact_name === "string" ? row.emergency_contact_name : null,
      emergency_contact_phone_e164:
        typeof row?.emergency_contact_phone_e164 === "string"
          ? row.emergency_contact_phone_e164
          : null,
      details: row?.details ?? null,
    },
    {
      emailVerified: Boolean(context.user.email_confirmed_at),
      completedBookingsCount: completedBookings,
      reviewsAsRevieweeCount: reviewsCount,
      phoneVerified: options.phoneVerified,
    },
  ).percent;
}

async function persistProfilePartial(
  supabase: SupabaseClient,
  userId: string,
  row: Record<string, unknown>,
  logLabel: string,
): Promise<ProfileRow> {
  console.log(`[profile] ${logLabel} payload`, { ...row, details: row.details ? "[merged]" : undefined });
  const saved = await upsertProfileRowAndReload(supabase, userId, row, logLabel);
  await applyMarketplaceVisibility(supabase, userId);
  return saved;
}

export async function saveBasicProfileSection(
  supabase: SupabaseClient,
  userId: string,
  input: BasicProfileSectionInput,
  context: ProfileSaveContext & { preserveRole?: ProfileRole },
): Promise<ProfileRow> {
  const rowForTrust = await loadProfileTrustRow(supabase, userId);
  const trimmedInputName = normalizeFullName(input.displayName);
  const displayName =
    trimmedInputName || resolveProfileDisplayName(context.user, context.existingDisplayName);
  const now = new Date().toISOString();
  const role = context.preserveRole ?? rowForTrust?.role ?? "pet_friend";

  const existingDetailsRaw = rowForTrust?.details;
  let detailsMerged: Record<string, unknown> =
    existingDetailsRaw && typeof existingDetailsRaw === "object"
      ? { ...(existingDetailsRaw as Record<string, unknown>) }
      : {};

  detailsMerged = mergeDetailsGooglePlace(detailsMerged, input.location.googlePlaceId);

  detailsMerged = mergeLanguagesOtherIntoDetails(
    detailsMerged,
    input.languages,
    input.languagesOther,
  );

  const canWriteGeo = await profilesGeoColumnsWritable(supabase);
  const canWriteLocation = await profilesLocationColumnsWritable(supabase);

  const row: Record<string, unknown> = {
    id: userId,
    display_name: displayName,
    role,
    languages: input.languages,
    bio: input.bio.trim() || null,
    details: detailsMerged,
    updated_at: now,
  };

  applyLocationFieldsToRow(row, input.location, {
    geo: canWriteGeo,
    structured: canWriteLocation,
  });

  return persistProfilePartial(supabase, userId, row, "basic section save");
}

export async function saveTrustSafetyProfileSection(
  supabase: SupabaseClient,
  userId: string,
  input: TrustSafetySectionInput,
  context: ProfileSaveContext,
): Promise<{ profile: ProfileRow; phoneNewlyVerified: boolean }> {
  const rowForTrust = await loadProfileTrustRow(supabase, userId);
  const now = new Date().toISOString();
  const displayName = resolveProfileDisplayName(
    context.user,
    rowForTrust?.display_name ?? context.existingDisplayName,
  );

  const phone = resolvePhoneAndEmergency(input, rowForTrust);
  const prevPhoneVerified = rowForTrust?.phone_verified === true;

  const existingDetailsRaw = rowForTrust?.details;
  let detailsMerged: Record<string, unknown> =
    existingDetailsRaw && typeof existingDetailsRaw === "object"
      ? { ...(existingDetailsRaw as Record<string, unknown>) }
      : {};

  detailsMerged = mergeDetailsTrustFlags(detailsMerged, Boolean(context.user.email_confirmed_at), {
    phoneVerified: phone.nextPhoneVerified,
    emergencyContact: phone.emergencyE164
      ? {
          name: phone.ecName,
          phone: phone.emergencyE164,
          relationship: phone.ecRelationship,
        }
      : null,
  });

  const trustScore = await computeTrustScoreForUser(supabase, userId, context, rowForTrust, {
    phoneVerified: phone.nextPhoneVerified,
    hasEmergencyContact: Boolean(phone.emergencyE164),
  });

  const row: Record<string, unknown> = {
    id: userId,
    display_name: displayName,
    role: rowForTrust?.role ?? "pet_friend",
    phone: phone.phoneE164 || null,
    phone_country_code: phone.phoneE164 ? normalizeDialCode(phone.phoneDialCode) : null,
    phone_number: phone.phoneE164 ? phone.phoneNationalNorm : null,
    phone_e164: phone.phoneE164 || null,
    phone_verified: phone.nextPhoneVerified,
    emergency_contact_name: phone.emergencyE164 ? phone.ecName : null,
    emergency_contact_phone_country_code: phone.emergencyE164 ? phone.ecDial : null,
    emergency_contact_phone_number: phone.emergencyE164 ? phone.ecNat : null,
    emergency_contact_phone_e164: phone.emergencyE164 || null,
    trust_score: trustScore,
    details: detailsMerged,
    updated_at: now,
    ...(input.preferredVet ? preferredVetClinicDbFieldsFromForm(input.preferredVet) : {}),
  };

  const saved = await persistProfilePartial(supabase, userId, row, "trust section save");
  return { profile: saved, phoneNewlyVerified: phone.nextPhoneVerified && !prevPhoneVerified };
}

export async function savePetFriendProfileSection(
  supabase: SupabaseClient,
  userId: string,
  input: PetFriendProfileFormInput,
  context: ProfileSaveContext,
): Promise<ProfileRow> {
  const rowForTrust = await loadProfileTrustRow(supabase, userId);
  const now = new Date().toISOString();
  const displayName = resolveProfileDisplayName(
    context.user,
    rowForTrust?.display_name ?? context.existingDisplayName,
  );

  const detailsMerged = mergePetFriendIntoDetails(rowForTrust?.details, input);

  const row: Record<string, unknown> = {
    id: userId,
    display_name: displayName,
    role: rowForTrust?.role ?? "pet_friend",
    details: detailsMerged,
    updated_at: now,
  };

  return persistProfilePartial(supabase, userId, row, "pet friend section save");
}

export async function savePetParentProfileSection(
  supabase: SupabaseClient,
  userId: string,
  input: PetParentProfileFormInput,
  context: ProfileSaveContext,
): Promise<ProfileRow> {
  const rowForTrust = await loadProfileTrustRow(supabase, userId);
  const now = new Date().toISOString();
  const displayName = resolveProfileDisplayName(
    context.user,
    rowForTrust?.display_name ?? context.existingDisplayName,
  );

  const detailsMerged = mergePetParentIntoDetails(rowForTrust?.details, input);

  const row: Record<string, unknown> = {
    id: userId,
    display_name: displayName,
    role: rowForTrust?.role ?? "pet_parent",
    details: detailsMerged,
    updated_at: now,
  };

  return persistProfilePartial(supabase, userId, row, "pet parent section save");
}
