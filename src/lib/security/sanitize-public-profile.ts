/** Fields that must never appear on public pages or anonymous API responses. */
const PRIVATE_PROFILE_KEYS = [
  "phone",
  "phone_country_code",
  "phone_number",
  "phone_e164",
  "email",
  "address",
  "formatted_address",
  "city",
  "country",
  "postal_code",
  "google_place_id",
  "location",
  "emergency_contact_name",
  "emergency_contact_phone_country_code",
  "emergency_contact_phone_number",
  "emergency_contact_phone_e164",
  "stripe_customer_id",
  "stripe_subscription_id",
  "stripe_price_id",
  "membership_status",
] as const;

const PRIVATE_DETAILS_KEYS = [
  "emergency_contact",
  "phone",
  "email",
  "address",
  "payment",
  "stripe",
] as const;

export type SanitizedPublicProfile<T extends Record<string, unknown>> = Omit<
  T,
  (typeof PRIVATE_PROFILE_KEYS)[number]
> & {
  details?: Record<string, unknown>;
};

function scrubDetails(details: unknown): Record<string, unknown> | undefined {
  if (!details || typeof details !== "object" || Array.isArray(details)) return undefined;
  const copy = { ...(details as Record<string, unknown>) };
  for (const key of PRIVATE_DETAILS_KEYS) {
    if (key in copy) delete copy[key];
  }
  if ("emergency_contact" in copy) delete copy.emergency_contact;
  return copy;
}

/** Strip private contact, address, and payment fields from a profile-shaped object. */
export function sanitizePublicProfile<T extends Record<string, unknown>>(
  row: T,
): SanitizedPublicProfile<T> {
  const out = { ...row } as Record<string, unknown>;

  for (const key of PRIVATE_PROFILE_KEYS) {
    if (key in out) delete out[key];
  }

  if ("details" in out) {
    const scrubbed = scrubDetails(out.details);
    if (scrubbed) out.details = scrubbed;
    else delete out.details;
  }

  return out as SanitizedPublicProfile<T>;
}

/** Narrow select list for public profile queries (keeps RLS + column exposure minimal). */
export const PUBLIC_PROFILE_COLUMNS =
  "id, display_name, avatar_url, bio, public_location, role, active_mode, role_chosen_at, languages, is_public, rating_avg, rating_count, created_at, details, latitude, longitude" as const;
