import type { User } from "@supabase/supabase-js";

/**
 * Resolves a non-empty display name for profiles.display_name (NOT NULL).
 * Order: existing profile → full_name → name → email local-part → "User".
 */
export function resolveProfileDisplayName(
  user: User,
  existingDisplayName?: string | null,
): string {
  const fromProfile = existingDisplayName?.trim();
  if (fromProfile) return fromProfile;

  const meta = user.user_metadata ?? {};

  const fullName = typeof meta.full_name === "string" ? meta.full_name.trim() : "";
  if (fullName) return fullName;

  const name = typeof meta.name === "string" ? meta.name.trim() : "";
  if (name) return name;

  const fromEmail = user.email?.split("@")[0]?.trim() ?? "";
  if (fromEmail) return fromEmail;

  return "User";
}
