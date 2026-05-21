import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import {
  formatSupabaseError,
  mapProfileRow,
  PROFILE_SELECT,
  type ProfileDbRow,
} from "@/lib/profile-load";
import type { ProfileRow } from "@/lib/profile-utils";

export const AVATARS_BUCKET = "avatars";
const MAX_AVATAR_BYTES = 3 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validateProfileAvatarFile(file: File): void {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Profile photo must be a JPG, PNG, or WebP image.");
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error("Profile photo must be 3 MB or smaller.");
  }
}

export function avatarFileExtension(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName === "jpeg" || fromName === "jpg") return "jpg";
  if (fromName === "png") return "png";
  if (fromName === "webp") return "webp";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export function formatAvatarStorageError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("bucket") &&
    (lower.includes("not found") ||
      lower.includes("does not exist") ||
      lower.includes("no such bucket") ||
      lower.includes("invalid bucket"))
  ) {
    return (
      'The "avatars" storage bucket is missing. Create it in Supabase Storage or run the latest database migrations, then try again.'
    );
  }
  if (lower.includes("row-level security") || lower.includes("policy")) {
    return "Could not upload profile photo. Check that you are signed in and storage policies are configured.";
  }
  return message;
}

export async function uploadProfileAvatar(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<ProfileRow> {
  const { assertRateLimit, requireAuthUserId, assertOwner } = await import("@/lib/security");
  const sessionUserId = await requireAuthUserId(supabase);
  assertOwner(userId, sessionUserId);
  assertRateLimit("file_upload", sessionUserId);

  validateProfileAvatarFile(file);

  const ext = avatarFileExtension(file);
  const storagePath = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(AVATARS_BUCKET).upload(storagePath, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });

  if (uploadError) {
    throw new Error(formatAvatarStorageError(uploadError.message || "Could not upload profile photo."));
  }

  const { data: urlData } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(storagePath);
  const publicUrl = urlData.publicUrl;

  const { data, error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", userId)
    .select(PROFILE_SELECT)
    .single();

  if (updateError) {
    await supabase.storage.from(AVATARS_BUCKET).remove([storagePath]);
    throw new Error(formatSupabaseError(updateError as PostgrestError));
  }

  if (!data) {
    throw new Error("Profile photo uploaded but profile could not be updated.");
  }

  return mapProfileRow(data as unknown as ProfileDbRow);
}
