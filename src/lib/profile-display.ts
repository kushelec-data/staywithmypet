/** Single row from a Supabase embedded relation (object or one-element array). */
export function pickSupabaseJoin<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

const MISSING_PROFILE_FALLBACK = "Member";

type ProfileNameSource = {
  display_name?: string | null;
  full_name?: string | null;
  name?: string | null;
};

/** Prefer display_name; only use fallback when no profile row was loaded. */
export function profileDisplayName(
  profile: ProfileNameSource | null | undefined,
  options?: { missing?: string },
): string | null {
  if (!profile) return null;

  for (const field of [profile.display_name, profile.full_name, profile.name]) {
    if (typeof field === "string" && field.trim()) return field.trim();
  }

  return null;
}

export function profileDisplayNameOrFallback(
  profile: ProfileNameSource | null | undefined,
  fallback: string = MISSING_PROFILE_FALLBACK,
): string {
  return profileDisplayName(profile) ?? fallback;
}
