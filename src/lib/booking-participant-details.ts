import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { googleMapsSearchUrl } from "@/lib/maps-url";
import { formatPhoneForDisplay } from "@/lib/phone-format";
import { publicPetHref } from "@/lib/public-pet";
import { publicProfileHref } from "@/lib/profile-completeness";
import { resolveRecipientEmail } from "@/lib/email-send";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPostgrestError } from "@/lib/supabase-errors";
import {
  preferredVetClinicFromProfileRow,
  preferredVetClinicFromRpc,
  type PreferredVetClinicInfo,
  type RpcPreferredVetClinic,
} from "@/lib/preferred-vet-clinic";
import { parseEmergencyContactFromProfile } from "@/lib/trust-safety";
import type { BookingStatus } from "@/types/database";

export type ParticipantRole = "pet_parent" | "pet_friend";

export type EmergencyContactInfo = {
  name: string;
  phone: string;
  relationship: string | null;
};

export type PublicParticipantInfo = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  profileHref: string;
  role: ParticipantRole;
};

export type PrivateContactInfo = {
  phoneE164: string | null;
  phoneDisplay: string | null;
  email: string | null;
  address: string | null;
  mapsUrl: string | null;
  emergencyContact: EmergencyContactInfo | null;
};

export type PetCareDetails = {
  id: string;
  name: string;
  profileHref: string;
  careInstructions: string | null;
  requiresMedication: boolean;
  feedingSchedule: string | null;
};

export type BookingParticipantDetails = {
  viewerRole: ParticipantRole;
  otherParty: PublicParticipantInfo;
  showPrivateContact: boolean;
  contact: PrivateContactInfo | null;
  petParentEmergency: EmergencyContactInfo | null;
  preferredVet: PreferredVetClinicInfo | null;
  sharePreferredVet: boolean;
  pet: PetCareDetails;
};

export type ParticipantDetailsLoadError =
  | "not_found"
  | "not_participant"
  | "load_failed";

export type ParticipantDetailsLoadResult = {
  details: BookingParticipantDetails | null;
  error: ParticipantDetailsLoadError | null;
  /** Exact backend failure reason — surfaced in development UI/logging. */
  devMessage?: string | null;
};

export type RequestParticipantDetails = {
  viewerRole: ParticipantRole;
  otherParty: PublicParticipantInfo;
  showPrivateContact: false;
  contact: null;
  pet: PetCareDetails | null;
};

type ProfileContactRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  phone_e164: string | null;
  phone_number: string | null;
  phone_country_code: string | null;
  formatted_address: string | null;
  address: string | null;
  location: string | null;
  latitude: unknown;
  longitude: unknown;
  emergency_contact_name: string | null;
  emergency_contact_phone_e164: string | null;
  emergency_contact_phone_number: string | null;
  emergency_contact_phone_country_code: string | null;
  details: unknown;
};

type PetCareRow = {
  id: string;
  name: string | null;
  requires_medication: boolean | null;
  feeding_schedule: string | null;
  additional_notes: string | null;
};

type BookingAccessRow = {
  id: string;
  request_id: string;
  pet_id: string;
  pet_parent_id: string;
  pet_friend_id: string;
  status: BookingStatus;
};

type RequestAccessRow = {
  id: string;
  pet_id: string | null;
  pet_parent_id: string;
  pet_friend_id: string;
  status: string;
};

type RpcOtherParty = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: ParticipantRole;
};

type RpcContact = {
  phone_e164: string | null;
  phone_display: string | null;
  email: string | null;
  address: string | null;
  emergency_name: string | null;
  emergency_phone_e164: string | null;
  emergency_phone_display: string | null;
  emergency_relationship: string | null;
};

type RpcEmergency = {
  name: string | null;
  phone_e164: string | null;
  phone_display: string | null;
  relationship: string | null;
};

type RpcParticipantPayload = {
  viewer_role: ParticipantRole;
  other_party: RpcOtherParty;
  contact_allowed: boolean;
  contact: RpcContact | null;
  pet_parent_emergency?: RpcEmergency | null;
  preferred_vet?: RpcPreferredVetClinic | null;
  share_preferred_vet?: boolean;
};

const PRIVATE_CONTACT_BOOKING_STATUSES: BookingStatus[] = ["upcoming", "active", "completed"];

export function bookingAllowsPrivateContact(status: BookingStatus): boolean {
  return PRIVATE_CONTACT_BOOKING_STATUSES.includes(status);
}

export function requestAllowsPrivateContact(status: string): boolean {
  return status === "accepted" || status === "completed";
}

function str(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t || null;
}

function isMissingRpcError(error: unknown): boolean {
  if (!isPostgrestError(error)) return false;
  return (
    error.code === "PGRST202" ||
    error.code === "42883" ||
    /get_booking_participant_contact/i.test(error.message ?? "")
  );
}

function formatPhoneDisplay(row: ProfileContactRow): string | null {
  const e164 = str(row.phone_e164);
  if (e164) return formatPhoneForDisplay(e164) ?? e164;
  const national = str(row.phone_number);
  const dial = str(row.phone_country_code);
  if (national && dial) return `${dial} ${national}`;
  return str(row.phone) ? formatPhoneForDisplay(row.phone) ?? row.phone : null;
}

function formatEmergencyPhone(row: ProfileContactRow): string | null {
  const e164 = str(row.emergency_contact_phone_e164);
  if (e164) return formatPhoneForDisplay(e164) ?? e164;
  const national = str(row.emergency_contact_phone_number);
  const dial = str(row.emergency_contact_phone_country_code);
  if (national && dial) return `${dial} ${national}`;
  return national;
}

function mapEmergencyContact(row: ProfileContactRow): EmergencyContactInfo | null {
  const parsed = parseEmergencyContactFromProfile({
    emergency_contact_name: row.emergency_contact_name,
    emergency_contact_phone_e164: row.emergency_contact_phone_e164,
    details: row.details,
  });
  if (parsed) {
    return {
      name: parsed.name,
      phone: parsed.phone,
      relationship: parsed.relationship,
    };
  }

  const name = str(row.emergency_contact_name);
  const phone = formatEmergencyPhone(row);
  if (!name && !phone) return null;
  return {
    name: name ?? "—",
    phone: phone ?? "—",
    relationship: null,
  };
}

function mapPrivateContact(row: ProfileContactRow, email: string | null): PrivateContactInfo {
  const address = str(row.formatted_address) ?? str(row.address) ?? str(row.location);
  const phoneE164 = str(row.phone_e164) ?? str(row.phone);
  return {
    phoneE164,
    phoneDisplay: formatPhoneDisplay(row),
    email,
    address,
    mapsUrl: googleMapsSearchUrl(row),
    emergencyContact: mapEmergencyContact(row),
  };
}

function mapPrivateContactFromRpc(contact: RpcContact): PrivateContactInfo {
  const phoneE164 = str(contact.phone_e164);
  const phoneDisplay =
    formatPhoneForDisplay(phoneE164 ?? contact.phone_display) ?? str(contact.phone_display);

  const emergencyPhoneE164 = str(contact.emergency_phone_e164);
  const emergencyPhone =
    formatPhoneForDisplay(emergencyPhoneE164 ?? contact.emergency_phone_display) ??
    str(contact.emergency_phone_display);

  const emergencyName = str(contact.emergency_name);
  const emergencyRelationship = str(contact.emergency_relationship);

  let emergencyContact: EmergencyContactInfo | null = null;
  if (emergencyName || emergencyPhone) {
    emergencyContact = {
      name: emergencyName ?? "—",
      phone: emergencyPhone ?? "—",
      relationship: emergencyRelationship,
    };
  }

  return {
    phoneE164,
    phoneDisplay,
    email: str(contact.email),
    address: str(contact.address),
    mapsUrl: null,
    emergencyContact,
  };
}

function mapPublicParticipant(
  row: Pick<ProfileContactRow, "id" | "display_name" | "avatar_url">,
  role: ParticipantRole,
): PublicParticipantInfo {
  return {
    id: row.id,
    displayName: str(row.display_name) ?? "Member",
    avatarUrl: str(row.avatar_url),
    profileHref: publicProfileHref(row.id),
    role,
  };
}

function mapPetCare(row: PetCareRow): PetCareDetails {
  return {
    id: row.id,
    name: str(row.name) ?? "Pet",
    profileHref: publicPetHref(row.id),
    careInstructions: str(row.additional_notes),
    requiresMedication: Boolean(row.requires_medication),
    feedingSchedule: str(row.feeding_schedule),
  };
}

function fallbackPetCare(petId: string): PetCareDetails {
  return {
    id: petId,
    name: "Pet",
    profileHref: publicPetHref(petId),
    careInstructions: null,
    requiresMedication: false,
    feedingSchedule: null,
  };
}

const EMPTY_RPC_CONTACT: RpcContact = {
  phone_e164: null,
  phone_display: null,
  email: null,
  address: null,
  emergency_name: null,
  emergency_phone_e164: null,
  emergency_phone_display: null,
  emergency_relationship: null,
};

export function emptyPrivateContactInfo(): PrivateContactInfo {
  return {
    phoneE164: null,
    phoneDisplay: null,
    email: null,
    address: null,
    mapsUrl: null,
    emergencyContact: null,
  };
}

function devLogContactLoad(message: string, meta: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") return;
  console.info("[booking-participant-contact]", message, meta);
}

function formatLoadFailure(error: unknown): string {
  if (isPostgrestError(error)) {
    const parts = [error.code, error.message].filter(Boolean);
    if (error.details) parts.push(String(error.details));
    if (error.hint) parts.push(`hint: ${error.hint}`);
    return parts.join(" — ");
  }
  if (error instanceof Error) {
    return error.stack ? `${error.message}\n${error.stack}` : error.message;
  }
  return String(error);
}

const PROFILE_CONTACT_SELECT =
  "id, display_name, avatar_url, phone, phone_e164, phone_number, phone_country_code, address, location, latitude, longitude, emergency_contact_name, emergency_contact_phone_e164, emergency_contact_phone_number, emergency_contact_phone_country_code, details";

type ProfileContactLoadResult = {
  row: ProfileContactRow | null;
  error: string | null;
};

async function loadProfileContactRow(profileId: string): Promise<ProfileContactLoadResult> {
  const admin = createAdminClient();
  if (!admin) {
    return { row: null, error: "Admin client unavailable (SUPABASE_SERVICE_ROLE_KEY missing)" };
  }

  const { data, error } = await admin
    .from("profiles")
    .select(PROFILE_CONTACT_SELECT)
    .eq("id", profileId)
    .maybeSingle();

  if (error) {
    return { row: null, error: formatLoadFailure(error) };
  }
  if (!data) {
    return { row: null, error: `Profile not found: ${profileId}` };
  }

  return {
    row: { ...(data as ProfileContactRow), formatted_address: null },
    error: null,
  };
}

async function loadPetCareRow(petId: string): Promise<PetCareRow | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("pets")
    .select("id, name, requires_medication, feeding_schedule, additional_notes")
    .eq("id", petId)
    .maybeSingle();

  if (error || !data) return null;
  return data as PetCareRow;
}

async function loadPetCareRowViaSupabase(
  supabase: SupabaseClient,
  petId: string,
): Promise<PetCareRow | null> {
  const { data, error } = await supabase
    .from("pets")
    .select("id, name, requires_medication, feeding_schedule, additional_notes")
    .eq("id", petId)
    .maybeSingle();

  if (error || !data) return null;
  return data as PetCareRow;
}

async function resolvePetCareDetails(
  supabase: SupabaseClient,
  petId: string,
): Promise<PetCareDetails> {
  const petRow =
    (await loadPetCareRowViaSupabase(supabase, petId)) ?? (await loadPetCareRow(petId));
  return petRow ? mapPetCare(petRow) : fallbackPetCare(petId);
}

function resolveViewerRole(
  viewerId: string,
  petParentId: string,
  petFriendId: string,
): ParticipantRole | null {
  if (viewerId === petParentId) return "pet_parent";
  if (viewerId === petFriendId) return "pet_friend";
  return null;
}

function otherPartyRole(viewerRole: ParticipantRole): ParticipantRole {
  return viewerRole === "pet_parent" ? "pet_friend" : "pet_parent";
}

function otherPartyId(
  viewerRole: ParticipantRole,
  petParentId: string,
  petFriendId: string,
): string {
  return viewerRole === "pet_parent" ? petFriendId : petParentId;
}

function mapEmergencyFromRpc(raw: RpcEmergency | null | undefined): EmergencyContactInfo | null {
  if (!raw) return null;
  const name = str(raw.name);
  const phone =
    formatPhoneForDisplay(str(raw.phone_e164) ?? str(raw.phone_display)) ??
    str(raw.phone_display) ??
    str(raw.phone_e164);
  const relationship = str(raw.relationship);
  if (!name && !phone && !relationship) return null;
  return {
    name: name ?? "—",
    phone: phone ?? "—",
    relationship,
  };
}

const PET_PARENT_EMERGENCY_SELECT =
  "emergency_contact_name, emergency_contact_phone_e164, emergency_contact_phone_number, emergency_contact_phone_country_code, details";

const PET_PARENT_VET_SELECT =
  `${PET_PARENT_EMERGENCY_SELECT}, preferred_vet_clinic_name, preferred_vet_veterinarian_name, preferred_vet_phone, preferred_vet_emergency_phone, preferred_vet_email, preferred_vet_address, preferred_vet_city, preferred_vet_postal_code, preferred_vet_opening_hours, preferred_vet_notes, share_preferred_vet_during_booking`;

async function loadPetParentVetRow(petParentId: string): Promise<Record<string, unknown> | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const full = await admin
    .from("profiles")
    .select(PET_PARENT_VET_SELECT)
    .eq("id", petParentId)
    .maybeSingle();

  if (!full.error && full.data) {
    return full.data as Record<string, unknown>;
  }

  if (full.error && full.error.code !== "42703") {
    devLogContactLoad("pet parent vet row load failed", {
      petParentId,
      error: formatLoadFailure(full.error),
    });
    return null;
  }

  const emergencyOnly = await admin
    .from("profiles")
    .select(PET_PARENT_EMERGENCY_SELECT)
    .eq("id", petParentId)
    .maybeSingle();

  if (emergencyOnly.error || !emergencyOnly.data) {
    devLogContactLoad("pet parent emergency row load failed", {
      petParentId,
      error: emergencyOnly.error ? formatLoadFailure(emergencyOnly.error) : "no row",
    });
    return null;
  }

  return emergencyOnly.data as Record<string, unknown>;
}

function mapPetParentEmergencyFromRow(row: Record<string, unknown>): EmergencyContactInfo | null {
  return mapEmergencyContact({
    id: "",
    display_name: null,
    avatar_url: null,
    phone: null,
    phone_e164: null,
    phone_number: null,
    phone_country_code: null,
    formatted_address: null,
    address: null,
    location: null,
    latitude: null,
    longitude: null,
    emergency_contact_name: (row.emergency_contact_name as string | null) ?? null,
    emergency_contact_phone_e164: (row.emergency_contact_phone_e164 as string | null) ?? null,
    emergency_contact_phone_number: (row.emergency_contact_phone_number as string | null) ?? null,
    emergency_contact_phone_country_code:
      (row.emergency_contact_phone_country_code as string | null) ?? null,
    details: row.details,
  });
}

function parseRpcPayload(raw: unknown): RpcParticipantPayload | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const payload = raw as RpcParticipantPayload;
  if (!payload.other_party?.id || !payload.viewer_role) return null;
  return payload;
}

async function loadBookingParticipantDetailsViaRpc(
  supabase: SupabaseClient,
  bookingId: string,
  petId: string,
): Promise<BookingParticipantDetails | null> {
  const { data, error } = await supabase.rpc("get_booking_participant_contact", {
    p_booking_id: bookingId,
  });

  if (error) {
    devLogContactLoad("RPC error", {
      bookingId,
      code: isPostgrestError(error) ? error.code : undefined,
      message: error.message,
      missingRpc: isMissingRpcError(error),
    });
    if (isMissingRpcError(error)) {
      throw new Error(
        `RPC missing: get_booking_participant_contact — ${formatLoadFailure(error)}`,
      );
    }
    throw error;
  }

  devLogContactLoad("RPC success", {
    bookingId,
    contactAllowed:
      data && typeof data === "object" && !Array.isArray(data)
        ? (data as RpcParticipantPayload).contact_allowed
        : undefined,
  });

  const payload = parseRpcPayload(data);
  if (!payload) return null;

  const pet = await resolvePetCareDetails(supabase, petId);

  const otherParty = mapPublicParticipant(
    {
      id: payload.other_party.id,
      display_name: payload.other_party.display_name,
      avatar_url: payload.other_party.avatar_url,
    },
    payload.other_party.role,
  );

  return {
    viewerRole: payload.viewer_role,
    otherParty,
    showPrivateContact: payload.contact_allowed,
    contact: payload.contact_allowed
      ? mapPrivateContactFromRpc(payload.contact ?? EMPTY_RPC_CONTACT)
      : null,
    petParentEmergency: payload.contact_allowed
      ? mapEmergencyFromRpc(payload.pet_parent_emergency)
      : null,
    preferredVet:
      payload.contact_allowed && payload.share_preferred_vet !== false
        ? preferredVetClinicFromRpc(payload.preferred_vet ?? null)
        : null,
    sharePreferredVet: payload.share_preferred_vet !== false,
    pet,
  };
}

type LegacyLoadResult = {
  details: BookingParticipantDetails | null;
  error: string | null;
};

async function loadBookingParticipantDetailsLegacy(
  viewerId: string,
  bookingId: string,
): Promise<LegacyLoadResult> {
  const admin = createAdminClient();
  if (!admin) {
    return { details: null, error: "Admin client unavailable (SUPABASE_SERVICE_ROLE_KEY missing)" };
  }

  const { data: booking, error } = await admin
    .from("bookings")
    .select("id, request_id, pet_id, pet_parent_id, pet_friend_id, status")
    .eq("id", bookingId)
    .maybeSingle();

  if (error) {
    return { details: null, error: formatLoadFailure(error) };
  }
  if (!booking) {
    return { details: null, error: `Booking not found: ${bookingId}` };
  }

  const row = booking as BookingAccessRow;
  const viewerRole = resolveViewerRole(viewerId, row.pet_parent_id, row.pet_friend_id);
  if (!viewerRole) {
    return { details: null, error: "Viewer is not a booking participant (legacy path)" };
  }

  const otherId = otherPartyId(viewerRole, row.pet_parent_id, row.pet_friend_id);
  const otherRole = otherPartyRole(viewerRole);
  const showPrivateContact = bookingAllowsPrivateContact(row.status);

  const [otherProfileResult, pet, petParentRow] = await Promise.all([
    loadProfileContactRow(otherId),
    resolvePetCareDetails(admin, row.pet_id),
    showPrivateContact ? loadPetParentVetRow(row.pet_parent_id) : Promise.resolve(null),
  ]);

  if (!otherProfileResult.row) {
    return {
      details: null,
      error: otherProfileResult.error ?? `Other participant profile not found: ${otherId}`,
    };
  }

  const otherProfile = otherProfileResult.row;

  let contact: PrivateContactInfo | null = null;
  if (showPrivateContact) {
    const email = await resolveRecipientEmail(otherId);
    contact = mapPrivateContact(otherProfile, email);
  }

  return {
    details: {
      viewerRole,
      otherParty: mapPublicParticipant(otherProfile, otherRole),
      showPrivateContact,
      contact,
      petParentEmergency:
        showPrivateContact && petParentRow ? mapPetParentEmergencyFromRow(petParentRow) : null,
      preferredVet:
        showPrivateContact && petParentRow
          ? preferredVetClinicFromProfileRow(petParentRow as never)
          : null,
      sharePreferredVet: petParentRow?.share_preferred_vet_during_booking !== false,
      pet,
    },
    error: null,
  };
}

export async function loadBookingParticipantDetails(
  supabase: SupabaseClient,
  bookingId: string,
): Promise<ParticipantDetailsLoadResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { details: null, error: "not_participant" };
  }

  const { data: booking, error } = await supabase
    .from("bookings")
    .select("id, pet_id, pet_parent_id, pet_friend_id, status")
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !booking) {
    devLogContactLoad("booking not found", { bookingId, message: error?.message });
    return { details: null, error: "not_found" };
  }

  const row = booking as Pick<
    BookingAccessRow,
    "id" | "pet_id" | "pet_parent_id" | "pet_friend_id" | "status"
  >;
  const viewerRole = resolveViewerRole(user.id, row.pet_parent_id, row.pet_friend_id);
  if (!viewerRole) {
    devLogContactLoad("viewer not participant", {
      bookingId,
      userId: user.id,
      petParentId: row.pet_parent_id,
      petFriendId: row.pet_friend_id,
    });
    return { details: null, error: "not_participant" };
  }

  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  devLogContactLoad("loading participant contact", {
    bookingId,
    userId: user.id,
    viewerRole: viewerRole,
    authenticatedRole: viewerProfile?.role ?? null,
    petParentId: row.pet_parent_id,
    petFriendId: row.pet_friend_id,
    bookingStatus: row.status,
    rpcCalled: "get_booking_participant_contact",
  });

  let rpcError: string | null = null;

  try {
    const viaRpc = await loadBookingParticipantDetailsViaRpc(supabase, bookingId, row.pet_id);
    if (viaRpc) {
      devLogContactLoad("RPC result", { bookingId, outcome: "success" });
      return { details: viaRpc, error: null };
    }
    rpcError = "RPC returned null (missing function, denied, or empty payload)";
  } catch (err) {
    rpcError = formatLoadFailure(err);
    devLogContactLoad("RPC threw", {
      bookingId,
      rpcError,
    });
    if (!createAdminClient()) {
      return {
        details: null,
        error: "load_failed",
        devMessage: `RPC failed and legacy fallback unavailable: ${rpcError}`,
      };
    }
  }

  devLogContactLoad("RPC result", { bookingId, outcome: "failed", rpcError });

  const legacy = await loadBookingParticipantDetailsLegacy(user.id, bookingId);
  if (legacy.details) {
    devLogContactLoad("legacy fallback succeeded", { bookingId });
    return { details: legacy.details, error: null };
  }

  const devMessage = [
    rpcError ? `RPC: ${rpcError}` : null,
    legacy.error ? `Legacy: ${legacy.error}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  devLogContactLoad("all loaders failed", {
    bookingId,
    hasAdminClient: Boolean(createAdminClient()),
    devMessage,
  });

  return { details: null, error: "load_failed", devMessage: devMessage || "Unknown load failure" };
}

export async function loadRequestParticipantDetails(
  viewerId: string,
  requestId: string,
): Promise<RequestParticipantDetails | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data: request, error } = await admin
    .from("requests")
    .select("id, pet_id, pet_parent_id, pet_friend_id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (error || !request) return null;

  const row = request as RequestAccessRow;
  const viewerRole = resolveViewerRole(viewerId, row.pet_parent_id, row.pet_friend_id);
  if (!viewerRole) return null;

  if (row.status === "declined" || row.status === "cancelled") {
    return null;
  }

  const otherId = otherPartyId(viewerRole, row.pet_parent_id, row.pet_friend_id);
  const otherRole = otherPartyRole(viewerRole);

  const [otherProfileResult, petRow] = await Promise.all([
    loadProfileContactRow(otherId),
    row.pet_id ? loadPetCareRow(row.pet_id) : Promise.resolve(null),
  ]);

  if (!otherProfileResult.row) return null;

  return {
    viewerRole,
    otherParty: mapPublicParticipant(otherProfileResult.row, otherRole),
    showPrivateContact: false,
    contact: null,
    pet: petRow ? mapPetCare(petRow) : null,
  };
}

/** For tests — maps a profile row without DB. */
export function buildPrivateContactFromProfileRow(
  row: ProfileContactRow,
  email: string | null,
): PrivateContactInfo {
  return mapPrivateContact(row, email);
}

export function buildPublicParticipantFromProfileRow(
  row: ProfileContactRow,
  role: ParticipantRole,
): PublicParticipantInfo {
  return mapPublicParticipant(row, role);
}

export function buildPrivateContactFromRpcContact(contact: RpcContact): PrivateContactInfo {
  return mapPrivateContactFromRpc(contact);
}
