import { normalizeFullName } from "@/lib/name-format";
import { mergeDetailsTrustFlags } from "@/lib/profile-details";
import { resolveProfileDisplayName } from "@/lib/profile-display-name";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export type EnsureProfileOptions = {
  displayName?: string;
};

export function resolveDisplayName(user: User, override?: string): string {
  const trimmedOverride = override?.trim();
  if (trimmedOverride) return normalizeFullName(trimmedOverride);
  return resolveProfileDisplayName(user, null);
}

/**
 * Ensures a row exists in public.profiles for the authenticated user.
 * Safe to call after signup, login, or OAuth (idempotent).
 */
export async function ensureUserProfile(
  supabase: SupabaseClient,
  user: User,
  options?: EnsureProfileOptions,
): Promise<void> {
  const displayName = resolveDisplayName(user, options?.displayName);
  const avatarUrl =
    typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null;

  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) throw selectError;

  if (existing) {
    const updates: { display_name?: string; avatar_url?: string } = {};
    if (options?.displayName) {
      updates.display_name = resolveDisplayName(user, options.displayName);
    }
    if (avatarUrl) {
      updates.avatar_url = avatarUrl;
    }
    if (Object.keys(updates).length === 0) return;

    const { error: updateError } = await supabase.from("profiles").update(updates).eq("id", user.id);
    if (updateError) throw updateError;
    return;
  }

  const { error: insertError } = await supabase.from("profiles").insert({
    id: user.id,
    display_name: displayName,
    avatar_url: avatarUrl,
  });

  if (insertError) throw insertError;
}

/** Sync email verification flag in profiles.details after auth confirms email. */
export async function syncProfileEmailVerified(
  supabase: SupabaseClient,
  user: User,
): Promise<void> {
  const emailVerified = Boolean(user.email_confirmed_at);

  const { data: row, error: loadError } = await supabase
    .from("profiles")
    .select("details")
    .eq("id", user.id)
    .maybeSingle();

  if (loadError || !row) return;

  const merged = mergeDetailsTrustFlags(row.details, emailVerified);
  const current =
    row.details && typeof row.details === "object" && !Array.isArray(row.details)
      ? (row.details as Record<string, unknown>)
      : {};

  if (current.email_verified === emailVerified) return;

  await supabase.from("profiles").update({ details: merged }).eq("id", user.id);
}
