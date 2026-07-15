import "server-only";

import { googleMapsSearchUrl } from "@/lib/maps-url";
import { publicPetHref } from "@/lib/public-pet";
import { publicProfileHref } from "@/lib/profile-completeness";
import { resolveRecipientEmail } from "@/lib/email-send";
import { createAdminClient } from "@/lib/supabase/admin";
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

function formatPhoneDisplay(row: ProfileContactRow): string | null {
  const e164 = str(row.phone_e164);
  if (e164) return e164;
  const national = str(row.phone_number);
  const dial = str(row.phone_country_code);
  if (national && dial) return `${dial} ${national}`;
  return str(row.phone);
}

function formatEmergencyPhone(row: ProfileContactRow): string | null {
  const e164 = str(row.emergency_contact_phone_e164);
  if (e164) return e164;
  const national = str(row.emergency_contact_phone_number);
  const dial = str(row.emergency_contact_phone_country_code);
  if (national && dial) return `${dial} ${national}`;
  return national;
}

function mapEmergencyContact(row: ProfileContactRow): EmergencyContactInfo | null {
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
  return {
    phoneE164: str(row.phone_e164) ?? str(row.phone),
    phoneDisplay: formatPhoneDisplay(row),
    email,
    address,
    mapsUrl: googleMapsSearchUrl(row),
    emergencyContact: mapEmergencyContact(row),
  };
}

function mapPublicParticipant(
  row: ProfileContactRow,
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
      "id, display_name, avatar_url, phone, phone_e164, phone_number, phone_country_code, formatted_address, address, latitude, longitude, emergency_contact_name, emergency_contact_phone_e164, emergency_contact_phone_number, emergency_contact_phone_country_code",
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

export async function loadBookingParticipantDetails(
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

  const [otherProfile, petRow] = await Promise.all([
    loadProfileContactRow(otherId),
    loadPetCareRow(row.pet_id),
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
    pet: mapPetCare(petRow),
  };
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
