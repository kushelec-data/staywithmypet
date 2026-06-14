import { AVATARS_BUCKET } from "@/lib/profile-avatar";
import { profileInitials } from "@/lib/profile-utils";

/**
 * Returns true when a Supabase avatars URL belongs to the given user id.
 * External/OAuth URLs (no storage path) are allowed.
 */
export function isAvatarUrlOwnedByUser(
  userId: string,
  avatarUrl: string | null | undefined,
): boolean {
  if (!userId || !avatarUrl?.trim()) return false;
  const url = avatarUrl.trim();
  const marker = `/storage/v1/object/public/${AVATARS_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) {
    // OAuth or other external host — not another member's storage object path.
    return !url.includes(`/${AVATARS_BUCKET}/`);
  }
  const path = decodeURIComponent(url.slice(idx + marker.length));
  const ownerId = path.split("/")[0]?.trim();
  return ownerId === userId;
}

/** Avatar URL safe to render for a specific user. Rejects cross-user storage paths. */
export function resolveSanitizedAvatarUrl(
  userId: string,
  avatarUrl: string | null | undefined,
): string | null {
  const trimmed = avatarUrl?.trim();
  if (!trimmed) return null;
  if (!isAvatarUrlOwnedByUser(userId, trimmed)) return null;
  return trimmed;
}

export function resolveProfileAvatarInitials(
  displayName: string,
  email?: string | null,
): string {
  return profileInitials(displayName, email);
}

export function hasRenderableProfileInitials(initials: string): boolean {
  return initials.trim().length > 0 && initials !== "?";
}
