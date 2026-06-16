import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { fetchUserProfile } from "@/lib/profile-load";
import type { ProfileRow } from "@/lib/profile-utils";
import { AuthRequiredError, ForbiddenError } from "@/lib/security/assert-owner";

export const AVATARS_BUCKET = "avatars";
const MAX_AVATAR_BYTES = 3 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type AvatarUploadErrorReason =
  | "invalid_file_type"
  | "file_too_large"
  | "not_signed_in"
  | "forbidden"
  | "rate_limited"
  | "bucket_missing"
  | "storage_denied"
  | "upload_failed"
  | "profile_update_failed";

export class AvatarUploadError extends Error {
  readonly reason: AvatarUploadErrorReason;

  constructor(reason: AvatarUploadErrorReason, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AvatarUploadError";
    this.reason = reason;
  }
}

function avatarUploadLog(message: string, detail?: Record<string, unknown>): void {
  if (detail) {
    console.info(`[avatar-upload] ${message}`, detail);
  } else {
    console.info(`[avatar-upload] ${message}`);
  }
}

function avatarUploadErrorLog(message: string, detail?: unknown): void {
  console.error(`[avatar-upload] ${message}`, detail);
}

export function validateProfileAvatarFile(file: File): void {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new AvatarUploadError(
      "invalid_file_type",
      "Profile photo must be a JPG, PNG, or WebP image.",
    );
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new AvatarUploadError(
      "file_too_large",
      "Profile photo must be 3 MB or smaller.",
    );
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

function mapStorageUploadError(message: string): AvatarUploadError {
  const lower = message.toLowerCase();

  if (
    lower.includes("bucket") &&
    (lower.includes("not found") ||
      lower.includes("does not exist") ||
      lower.includes("no such bucket") ||
      lower.includes("invalid bucket"))
  ) {
    return new AvatarUploadError(
      "bucket_missing",
      'The "avatars" storage bucket is missing. Create it in Supabase Storage or run the latest database migrations, then try again.',
    );
  }

  if (
    lower.includes("row-level security") ||
    lower.includes("policy") ||
    lower.includes("permission denied") ||
    lower.includes("not authorized") ||
    lower.includes("42501")
  ) {
    return new AvatarUploadError(
      "storage_denied",
      "Could not upload profile photo. Check that you are signed in and storage policies allow uploads to your folder.",
    );
  }

  if (lower.includes("payload too large") || lower.includes("file size")) {
    return new AvatarUploadError("file_too_large", "Profile photo must be 3 MB or smaller.");
  }

  if (lower.includes("mime") || lower.includes("content type") || lower.includes("not allowed")) {
    return new AvatarUploadError(
      "invalid_file_type",
      "Profile photo must be a JPG, PNG, or WebP image.",
    );
  }

  return new AvatarUploadError("upload_failed", message || "Could not upload profile photo.");
}

function mapProfileUpdateError(error: PostgrestError): AvatarUploadError {
  const lower = error.message.toLowerCase();
  if (
    error.code === "42501" ||
    error.code === "PGRST301" ||
    lower.includes("row-level security") ||
    lower.includes("permission")
  ) {
    return new AvatarUploadError(
      "profile_update_failed",
      "Photo uploaded, but your profile could not be updated. Check that you are signed in and try again.",
    );
  }
  return new AvatarUploadError(
    "profile_update_failed",
    "Photo uploaded, but your profile could not be updated. Please try again.",
  );
}

/** @deprecated Use AvatarUploadError messages from uploadProfileAvatar instead. */
export function formatAvatarStorageError(message: string): string {
  return mapStorageUploadError(message).message;
}

export async function uploadProfileAvatar(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<ProfileRow> {
  avatarUploadLog("selected file", {
    name: file.name,
    type: file.type,
    size: file.size,
  });

  const { assertRateLimit, requireAuthUserId, assertOwner } = await import("@/lib/security");

  let sessionUserId: string;
  try {
    sessionUserId = await requireAuthUserId(supabase);
  } catch (err) {
    avatarUploadErrorLog("auth error", err);
    if (err instanceof AuthRequiredError) {
      throw new AvatarUploadError("not_signed_in", "You must be signed in to upload a profile photo.");
    }
    throw err;
  }

  try {
    assertOwner(userId, sessionUserId);
  } catch (err) {
    avatarUploadErrorLog("ownership error", err);
    if (err instanceof ForbiddenError) {
      throw new AvatarUploadError(
        "forbidden",
        "You do not have permission to change this profile photo.",
      );
    }
    throw err;
  }

  try {
    assertRateLimit("file_upload", sessionUserId);
  } catch (err) {
    avatarUploadErrorLog("rate limit", err);
    throw new AvatarUploadError(
      "rate_limited",
      err instanceof Error ? err.message : "Too many upload attempts. Please try again later.",
    );
  }

  validateProfileAvatarFile(file);

  const ext = avatarFileExtension(file);
  const storagePath = `${userId}/${crypto.randomUUID()}.${ext}`;

  avatarUploadLog("bucket", { bucket: AVATARS_BUCKET });
  avatarUploadLog("path", { path: storagePath, userId });

  const contentType =
    file.type && ALLOWED_TYPES.has(file.type)
      ? file.type
      : ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : "image/jpeg";

  const { error: uploadError } = await supabase.storage.from(AVATARS_BUCKET).upload(storagePath, file, {
    cacheControl: "3600",
    upsert: false,
    contentType,
  });

  if (uploadError) {
    avatarUploadErrorLog("upload error", uploadError);
    throw mapStorageUploadError(uploadError.message || "Could not upload profile photo.");
  }

  const { data: urlData } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(storagePath);
  const publicUrl = urlData.publicUrl;
  avatarUploadLog("public url", { publicUrl });

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", userId);

  if (updateError) {
    avatarUploadErrorLog("profile update result", { ok: false, error: updateError });
    await supabase.storage.from(AVATARS_BUCKET).remove([storagePath]);
    throw mapProfileUpdateError(updateError as PostgrestError);
  }

  avatarUploadLog("profile update result", { ok: true, avatar_url: publicUrl });

  try {
    const profile = await fetchUserProfile(supabase, userId);
    if (profile) {
      return { ...profile, avatar_url: publicUrl };
    }
  } catch (err) {
    avatarUploadErrorLog("profile reload after update failed", err);
  }

  throw new AvatarUploadError(
    "profile_update_failed",
    "Photo uploaded, but your profile could not be reloaded. Refresh the page to see your new photo.",
  );
}
