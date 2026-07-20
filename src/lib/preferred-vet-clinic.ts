import {
  buildPhoneE164,
  isValidE164,
  normalizeDialCode,
  normalizeNationalDigits,
  parseDialCodeFromE164,
} from "@/lib/phone-eu";

/** Scope for future pet-specific clinic overrides. */
export type PreferredVetClinicScope = "pet_parent_default";

export type PreferredVetClinicInfo = {
  scope: PreferredVetClinicScope;
  clinicName: string;
  veterinarianName: string | null;
  phone: string | null;
  emergencyPhone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  openingHours: string | null;
  notes: string | null;
};

export type PreferredVetClinicFormValues = {
  clinicName: string;
  veterinarianName: string;
  phoneDialCode: string;
  phoneNational: string;
  emergencyPhoneDialCode: string;
  emergencyPhoneNational: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  openingHours: string;
  notes: string;
  shareDuringBooking: boolean;
};

export const emptyPreferredVetClinicFormValues = (): PreferredVetClinicFormValues => ({
  clinicName: "",
  veterinarianName: "",
  phoneDialCode: "+372",
  phoneNational: "",
  emergencyPhoneDialCode: "+372",
  emergencyPhoneNational: "",
  email: "",
  address: "",
  city: "",
  postalCode: "",
  openingHours: "",
  notes: "",
  shareDuringBooking: true,
});

export const PREFERRED_VET_NOTES_MAX = 500;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t || null;
}

export function preferredVetSectionStarted(values: PreferredVetClinicFormValues): boolean {
  return Boolean(
    values.clinicName.trim() ||
      values.veterinarianName.trim() ||
      values.phoneNational.trim() ||
      values.emergencyPhoneNational.trim() ||
      values.email.trim() ||
      values.address.trim() ||
      values.city.trim() ||
      values.postalCode.trim() ||
      values.openingHours.trim() ||
      values.notes.trim(),
  );
}

function resolvePhoneE164(dialCode: string, national: string): string | null {
  const nationalNorm = normalizeNationalDigits(national);
  if (!nationalNorm) return null;
  const e164 = buildPhoneE164(normalizeDialCode(dialCode), nationalNorm);
  return isValidE164(e164) ? e164 : null;
}

export function validatePreferredVetClinicForm(values: PreferredVetClinicFormValues): void {
  if (!preferredVetSectionStarted(values)) return;

  if (!values.clinicName.trim()) {
    throw new Error("Please enter your preferred veterinary clinic name.");
  }

  const phoneE164 = resolvePhoneE164(values.phoneDialCode, values.phoneNational);
  if (!phoneE164) {
    throw new Error("Please enter a valid clinic phone number.");
  }

  if (values.emergencyPhoneNational.trim()) {
    const emergencyE164 = resolvePhoneE164(
      values.emergencyPhoneDialCode,
      values.emergencyPhoneNational,
    );
    if (!emergencyE164) {
      throw new Error("Please enter a valid emergency clinic phone number.");
    }
  }

  const email = values.email.trim();
  if (email && !EMAIL_PATTERN.test(email)) {
    throw new Error("Please enter a valid clinic email address.");
  }

  if (values.notes.trim().length > PREFERRED_VET_NOTES_MAX) {
    throw new Error(`Clinic notes must be ${PREFERRED_VET_NOTES_MAX} characters or fewer.`);
  }
}

export function preferredVetClinicDbFieldsFromForm(
  values: PreferredVetClinicFormValues,
): Record<string, unknown> {
  if (!preferredVetSectionStarted(values)) {
    return {
      preferred_vet_clinic_name: null,
      preferred_vet_veterinarian_name: null,
      preferred_vet_phone: null,
      preferred_vet_emergency_phone: null,
      preferred_vet_email: null,
      preferred_vet_address: null,
      preferred_vet_city: null,
      preferred_vet_postal_code: null,
      preferred_vet_opening_hours: null,
      preferred_vet_notes: null,
      share_preferred_vet_during_booking: values.shareDuringBooking,
    };
  }

  validatePreferredVetClinicForm(values);

  return {
    preferred_vet_clinic_name: values.clinicName.trim(),
    preferred_vet_veterinarian_name: str(values.veterinarianName),
    preferred_vet_phone: resolvePhoneE164(values.phoneDialCode, values.phoneNational),
    preferred_vet_emergency_phone: values.emergencyPhoneNational.trim()
      ? resolvePhoneE164(values.emergencyPhoneDialCode, values.emergencyPhoneNational)
      : null,
    preferred_vet_email: str(values.email),
    preferred_vet_address: str(values.address),
    preferred_vet_city: str(values.city),
    preferred_vet_postal_code: str(values.postalCode),
    preferred_vet_opening_hours: str(values.openingHours),
    preferred_vet_notes: str(values.notes)?.slice(0, PREFERRED_VET_NOTES_MAX) ?? null,
    share_preferred_vet_during_booking: values.shareDuringBooking,
  };
}

export type PreferredVetProfileRow = {
  preferred_vet_clinic_name?: string | null;
  preferred_vet_veterinarian_name?: string | null;
  preferred_vet_phone?: string | null;
  preferred_vet_emergency_phone?: string | null;
  preferred_vet_email?: string | null;
  preferred_vet_address?: string | null;
  preferred_vet_city?: string | null;
  preferred_vet_postal_code?: string | null;
  preferred_vet_opening_hours?: string | null;
  preferred_vet_notes?: string | null;
  share_preferred_vet_during_booking?: boolean | null;
};

export function preferredVetFormFromProfileRow(row: PreferredVetProfileRow): PreferredVetClinicFormValues {
  const phoneParts = parseDialCodeFromE164(str(row.preferred_vet_phone));
  const emergencyParts = parseDialCodeFromE164(str(row.preferred_vet_emergency_phone));

  return {
    clinicName: str(row.preferred_vet_clinic_name) ?? "",
    veterinarianName: str(row.preferred_vet_veterinarian_name) ?? "",
    phoneDialCode: phoneParts.dialCode,
    phoneNational: phoneParts.nationalDigits,
    emergencyPhoneDialCode: emergencyParts.dialCode,
    emergencyPhoneNational: emergencyParts.nationalDigits,
    email: str(row.preferred_vet_email) ?? "",
    address: str(row.preferred_vet_address) ?? "",
    city: str(row.preferred_vet_city) ?? "",
    postalCode: str(row.preferred_vet_postal_code) ?? "",
    openingHours: str(row.preferred_vet_opening_hours) ?? "",
    notes: str(row.preferred_vet_notes) ?? "",
    shareDuringBooking: row.share_preferred_vet_during_booking !== false,
  };
}

export function preferredVetClinicFromProfileRow(
  row: PreferredVetProfileRow,
): PreferredVetClinicInfo | null {
  const clinicName = str(row.preferred_vet_clinic_name);
  if (!clinicName) return null;
  if (row.share_preferred_vet_during_booking === false) return null;

  return {
    scope: "pet_parent_default",
    clinicName,
    veterinarianName: str(row.preferred_vet_veterinarian_name),
    phone: str(row.preferred_vet_phone),
    emergencyPhone: str(row.preferred_vet_emergency_phone),
    email: str(row.preferred_vet_email),
    address: str(row.preferred_vet_address),
    city: str(row.preferred_vet_city),
    postalCode: str(row.preferred_vet_postal_code),
    openingHours: str(row.preferred_vet_opening_hours),
    notes: str(row.preferred_vet_notes),
  };
}

export function buildPreferredVetFullAddress(clinic: PreferredVetClinicInfo): string {
  return [clinic.address, clinic.city, clinic.postalCode].filter(Boolean).join(", ");
}

export function preferredVetMapsUrl(clinic: PreferredVetClinicInfo): string | null {
  const query = buildPreferredVetFullAddress(clinic);
  if (!query.trim()) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export type RpcPreferredVetClinic = {
  clinic_name: string | null;
  veterinarian_name: string | null;
  phone: string | null;
  emergency_phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  opening_hours: string | null;
  notes: string | null;
};

export function preferredVetClinicFromRpc(raw: RpcPreferredVetClinic | null | undefined): PreferredVetClinicInfo | null {
  if (!raw?.clinic_name?.trim()) return null;
  return {
    scope: "pet_parent_default",
    clinicName: raw.clinic_name.trim(),
    veterinarianName: str(raw.veterinarian_name),
    phone: str(raw.phone),
    emergencyPhone: str(raw.emergency_phone),
    email: str(raw.email),
    address: str(raw.address),
    city: str(raw.city),
    postalCode: str(raw.postal_code),
    openingHours: str(raw.opening_hours),
    notes: str(raw.notes),
  };
}

export const PROFILE_SELECT_PREFERRED_VET =
  "preferred_vet_clinic_name, preferred_vet_veterinarian_name, preferred_vet_phone, preferred_vet_emergency_phone, preferred_vet_email, preferred_vet_address, preferred_vet_city, preferred_vet_postal_code, preferred_vet_opening_hours, preferred_vet_notes, share_preferred_vet_during_booking";
