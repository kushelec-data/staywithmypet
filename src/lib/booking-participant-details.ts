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
  const address = str(row.formatted_address) ?? str(row.address);
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

async function loadProfileContactRow(profileId: string): Promise<ProfileContactRow | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("profiles")
    .select(
      "id, display_name, avatar_url, phone, phone_e164, phone_number, phone_country_code, formatted_address, address, latitude, longitude, emergency_contact_name, emergency_contact_phone_e164, emergency_contact_phone_number, emergency_contact_phone_country_code, details",
    )
    .eq("id", profileId)
    .maybeSingle();

  if (error || !data) return null;
  return data as ProfileContactRow;
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

async function loadPetParentVetRow(petParentId: string): Promise<Record<string, unknown> | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("profiles")
    .select(
      "emergency_contact_name, emergency_contact_phone_e164, emergency_contact_phone_number, emergency_contact_phone_country_code, details, preferred_vet_clinic_name, preferred_vet_veterinarian_name, preferred_vet_phone, preferred_vet_emergency_phone, preferred_vet_email, preferred_vet_address, preferred_vet_city, preferred_vet_postal_code, preferred_vet_opening_hours, preferred_vet_notes, share_preferred_vet_during_booking",
    )
    .eq("id", petParentId)
    .maybeSingle();

  if (error || !data) return null;
  return data as Record<string, unknown>;
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
    if (isMissingRpcError(error)) return null;
    throw error;
  }

  const payload = parseRpcPayload(data);
  if (!payload) return null;

  const petRow = await loadPetCareRow(petId);
  if (!petRow) return null;

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
    contact: payload.contact_allowed && payload.contact
      ? mapPrivateContactFromRpc(payload.contact)
      : null,
    petParentEmergency: payload.contact_allowed
      ? mapEmergencyFromRpc(payload.pet_parent_emergency)
      : null,
    preferredVet:
      payload.contact_allowed && payload.share_preferred_vet !== false
        ? preferredVetClinicFromRpc(payload.preferred_vet ?? null)
        : null,
    sharePreferredVet: payload.share_preferred_vet !== false,
    pet: mapPetCare(petRow),
  };
}

async function loadBookingParticipantDetailsLegacy(
  viewerId: string,
  bookingId: string,
): Promise<BookingParticipantDetails | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data: booking, error } = await admin
    .from("bookings")
    .select("id, request_id, pet_id, pet_parent_id, pet_friend_id, status")
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !booking) return null;

  const row = booking as BookingAccessRow;
  const viewerRole = resolveViewerRole(viewerId, row.pet_parent_id, row.pet_friend_id);
  if (!viewerRole) return null;

  const otherId = otherPartyId(viewerRole, row.pet_parent_id, row.pet_friend_id);
  const otherRole = otherPartyRole(viewerRole);
  const showPrivateContact = bookingAllowsPrivateContact(row.status);

  const [otherProfile, petRow, petParentRow] = await Promise.all([
    loadProfileContactRow(otherId),
    loadPetCareRow(row.pet_id),
    showPrivateContact ? loadPetParentVetRow(row.pet_parent_id) : Promise.resolve(null),
  ]);

  if (!otherProfile || !petRow) return null;

  let contact: PrivateContactInfo | null = null;
  if (showPrivateContact) {
    const email = await resolveRecipientEmail(otherId);
    contact = mapPrivateContact(otherProfile, email);
  }

  return {
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
    pet: mapPetCare(petRow),
  };
}

export async function loadBookingParticipantDetails(
  supabase: SupabaseClient,
  bookingId: string,
): Promise<BookingParticipantDetails | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: booking, error } = await supabase
    .from("bookings")
    .select("id, pet_id, pet_parent_id, pet_friend_id, status")
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !booking) return null;

  const row = booking as Pick<
    BookingAccessRow,
    "id" | "pet_id" | "pet_parent_id" | "pet_friend_id" | "status"
  >;
  const viewerRole = resolveViewerRole(user.id, row.pet_parent_id, row.pet_friend_id);
  if (!viewerRole) return null;

  try {
    const viaRpc = await loadBookingParticipantDetailsViaRpc(supabase, bookingId, row.pet_id);
    if (viaRpc) return viaRpc;
  } catch {
    /* fall through to legacy admin path when RPC fails unexpectedly */
  }

  return loadBookingParticipantDetailsLegacy(user.id, bookingId);
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

  const [otherProfile, petRow] = await Promise.all([
    loadProfileContactRow(otherId),
    row.pet_id ? loadPetCareRow(row.pet_id) : Promise.resolve(null),
  ]);

  if (!otherProfile) return null;

  return {
    viewerRole,
    otherParty: mapPublicParticipant(otherProfile, otherRole),
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
