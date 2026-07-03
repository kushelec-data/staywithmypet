import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { fetchUserProfile } from "@/lib/profile-load";
import {
  normalizePhotoPosition,
  syncAvatarPositionInDetails,
  type PhotoObjectPosition,
} from "@/lib/photo-position";
import type { ProfileRow } from "@/lib/profile-utils";
import { AuthRequiredError, ForbiddenError } from "@/lib/security/assert-owner";
import { isMissingColumnError, supabaseErrorDetail } from "@/lib/supabase-errors";

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

export type AvatarStorageContext = {
  bucket: string;
  path: string;
  userId: string;
};

export class AvatarUploadError extends Error {
  readonly reason: AvatarUploadErrorReason;
  readonly storageContext?: AvatarStorageContext;
  readonly storageError?: Record<string, unknown>;

  constructor(
    reason: AvatarUploadErrorReason,
    message: string,
    options?: {
      cause?: unknown;
      storageContext?: AvatarStorageContext;
      storageError?: Record<string, unknown>;
    },
  ) {
    super(message, options);
    this.name = "AvatarUploadError";
    this.reason = reason;
    this.storageContext = options?.storageContext;
    this.storageError = options?.storageError;
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

type StorageErrorLike = {
  message?: string;
  statusCode?: string | number;
  error?: string;
  name?: string;
};

export function avatarStorageErrorDetail(error: StorageErrorLike | null | undefined): Record<string, unknown> {
  if (!error) return {};
  const out: Record<string, unknown> = {
    message: error.message ?? null,
    statusCode: error.statusCode ?? null,
    error: error.error ?? null,
    name: error.name ?? null,
  };
  if (typeof error === "object") {
    for (const [key, value] of Object.entries(error as Record<string, unknown>)) {
      if (!(key in out)) out[key] = value;
    }
  }
  return out;
}

export function logAvatarUploadFailure(label: string, err: unknown, context?: Record<string, unknown>): void {
  if (err instanceof AvatarUploadError) {
    avatarUploadErrorLog(label, {
      ...context,
      reason: err.reason,
      message: err.message,
      bucket: err.storageContext?.bucket ?? null,
      path: err.storageContext?.path ?? null,
      userId: err.storageContext?.userId ?? null,
      storageError: err.storageError ?? null,
      cause: err.cause ?? null,
    });
    return;
  }
  avatarUploadErrorLog(label, { ...context, err });
}

function logAvatarStorageError(
  operation: "upload" | "remove" | "update",
  context: {
    bucket: string;
    path: string;
    userId: string;
    sessionUserId?: string;
  },
  error: StorageErrorLike,
): void {
  avatarUploadErrorLog(`${operation} failed`, {
    bucket: context.bucket,
    path: context.path,
    userId: context.userId,
    sessionUserId: context.sessionUserId ?? null,
    ...avatarStorageErrorDetail(error),
  });
}

export function avatarContentTypeForFile(file: File): string {
  const ext = avatarFileExtension(file);
  if (file.type && ALLOWED_TYPES.has(file.type)) return file.type;
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

export async function assertProfilePhotoAccess(
  supabase: SupabaseClient,
  userId: string,
  options?: { rateLimit?: boolean },
): Promise<string> {
  const { assertRateLimit, requireAuthUserId, assertOwner } = await import("@/lib/security");
  const sessionUserId = await requireAuthUserId(supabase);
  assertOwner(userId, sessionUserId);
  if (options?.rateLimit !== false) {
    assertRateLimit("file_upload", sessionUserId);
  }
  return sessionUserId;
}

export function avatarStoragePath(userId: string, file: File, gallery = false): string {
  const ext = avatarFileExtension(file);
  return gallery ? `${userId}/gallery/${crypto.randomUUID()}.${ext}` : `${userId}/${crypto.randomUUID()}.${ext}`;
}

/** Storage object path inside the avatars bucket (strips ?v= cache busters and #fragments). */
export function avatarPublicUrlStoragePath(url: string): string | null {
  const marker = `/storage/v1/object/public/${AVATARS_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  const raw = url.slice(index + marker.length);
  const withoutQuery = raw.split("?")[0]?.split("#")[0] ?? raw;
  try {
    return decodeURIComponent(withoutQuery);
  } catch {
    return withoutQuery;
  }
}

export function avatarStoragePathFromPublicUrl(url: string): string | null {
  return avatarPublicUrlStoragePath(url);
}

function isAllowedAvatarFileType(file: File): boolean {
  if (file.type && ALLOWED_TYPES.has(file.type)) return true;
  const ext = avatarFileExtension(file);
  return ext === "jpg" || ext === "png" || ext === "webp";
}

export async function uploadAvatarStorageObject(
  supabase: SupabaseClient,
  sessionUserId: string,
  file: File,
  options?: { gallery?: boolean; upsert?: boolean; storagePath?: string },
): Promise<{ storagePath: string; publicUrl: string }> {
  validateProfileAvatarFile(file);
  const storagePath = options?.storagePath ?? avatarStoragePath(sessionUserId, file, options?.gallery);
  const contentType = avatarContentTypeForFile(file);

  avatarUploadLog("upload start", {
    bucket: AVATARS_BUCKET,
    path: storagePath,
    userId: sessionUserId,
    contentType,
    fileType: file.type || null,
    fileSize: file.size,
    upsert: options?.upsert ?? false,
  });

  const { data: sessionData } = await supabase.auth.getSession();
  avatarUploadLog("session", {
    userId: sessionUserId,
    hasAccessToken: Boolean(sessionData.session?.access_token),
  });

  const { error: uploadError } = await supabase.storage.from(AVATARS_BUCKET).upload(storagePath, file, {
    cacheControl: "3600",
    upsert: options?.upsert ?? false,
    contentType,
  });

  if (uploadError) {
    const storageContext = { bucket: AVATARS_BUCKET, path: storagePath, userId: sessionUserId };
    logAvatarStorageError("upload", storageContext, uploadError);
    throw mapStorageUploadError(uploadError, storageContext);
  }

  const { data: urlData } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(storagePath);
  avatarUploadLog("upload ok", { bucket: AVATARS_BUCKET, path: storagePath, publicUrl: urlData.publicUrl });
  return { storagePath, publicUrl: urlData.publicUrl };
}

export async function removeAvatarStorageObjects(
  supabase: SupabaseClient,
  sessionUserId: string,
  storagePaths: string[],
): Promise<void> {
  if (storagePaths.length === 0) return;

  for (const path of storagePaths) {
    const ownerId = path.split("/")[0]?.trim();
    if (ownerId && ownerId !== sessionUserId) {
      avatarUploadErrorLog("remove blocked — path owner mismatch", {
        bucket: AVATARS_BUCKET,
        path,
        userId: sessionUserId,
        pathOwnerId: ownerId,
      });
      continue;
    }
  }

  avatarUploadLog("remove start", {
    bucket: AVATARS_BUCKET,
    paths: storagePaths,
    userId: sessionUserId,
  });

  const { error } = await supabase.storage.from(AVATARS_BUCKET).remove(storagePaths);
  if (error) {
    const storageContext = {
      bucket: AVATARS_BUCKET,
      path: storagePaths.join(", "),
      userId: sessionUserId,
    };
    logAvatarStorageError("remove", storageContext, error);
    throw mapStorageUploadError(error, storageContext);
  }

  avatarUploadLog("remove ok", { bucket: AVATARS_BUCKET, paths: storagePaths, userId: sessionUserId });
}

export function validateProfileAvatarFile(file: File): void {
  if (!isAllowedAvatarFileType(file)) {
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

function mapStorageUploadError(
  error: StorageErrorLike,
  storageContext?: AvatarStorageContext,
): AvatarUploadError {
  const storageError = avatarStorageErrorDetail(error);
  const message = error.message?.trim() || "Could not upload profile photo.";
  const lower = message.toLowerCase();
  const statusCode = String(storageError.statusCode ?? "");
  const errorCode = String(storageError.error ?? "");
  const baseOptions = { cause: error, storageContext, storageError };

  if (
    lower.includes("bucket") &&
    (lower.includes("not found") ||
      lower.includes("does not exist") ||
      lower.includes("no such bucket") ||
      lower.includes("invalid bucket"))
  ) {
    return new AvatarUploadError(
      "bucket_missing",
      'The "avatars" storage bucket is missing. Create it in Supabase Storage or run supabase/RUN_THIS_avatars_storage.sql, then try again.',
      baseOptions,
    );
  }

  if (
    lower.includes("row-level security") ||
    lower.includes("policy") ||
    lower.includes("permission denied") ||
    lower.includes("not authorized") ||
    lower.includes("42501") ||
    statusCode === "403" ||
    errorCode.toLowerCase() === "unauthorized"
  ) {
    return new AvatarUploadError(
      "storage_denied",
      "Could not upload profile photo. Storage access was denied — run supabase/RUN_THIS_avatars_storage.sql in the Supabase SQL editor, then confirm you are signed in. Upload path must start with your user id.",
      baseOptions,
    );
  }

  if (lower.includes("payload too large") || lower.includes("file size")) {
    return new AvatarUploadError("file_too_large", "Profile photo must be 3 MB or smaller.", baseOptions);
  }

  if (lower.includes("mime") || lower.includes("content type") || lower.includes("not allowed")) {
    return new AvatarUploadError(
      "invalid_file_type",
      "Profile photo must be a JPG, PNG, or WebP image.",
      baseOptions,
    );
  }

  return new AvatarUploadError("upload_failed", message, baseOptions);
}

function mapProfileUpdateError(error: PostgrestError): AvatarUploadError {
  const lower = error.message.toLowerCase();
  if (isMissingColumnError(error, "avatar_url")) {
    return new AvatarUploadError(
      "profile_update_failed",
      "Photo uploaded, but your profile could not be updated. The database is missing the avatar_url column — run the latest Supabase migrations, then try again.",
    );
  }
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

async function loadProfileDetailsForUpdate(
  supabase: SupabaseClient,
  userId: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.from("profiles").select("details").eq("id", userId).maybeSingle();
  if (error) {
    throw mapProfileUpdateError(error as PostgrestError);
  }
  const raw = data?.details;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return { ...(raw as Record<string, unknown>) };
  }
  return {};
}

/** profiles.avatar_url is the canonical column (see initial_schema.sql). */
async function buildAvatarProfileUpdatePayload(
  supabase: SupabaseClient,
  userId: string,
  publicUrl: string,
  position?: PhotoObjectPosition,
): Promise<Record<string, unknown>> {
  const details = await loadProfileDetailsForUpdate(supabase, userId);
  syncAvatarPositionInDetails(details, publicUrl, position ? normalizePhotoPosition(position) : undefined);

  return {
    avatar_url: publicUrl,
    details,
    updated_at: new Date().toISOString(),
  };
}

/** @deprecated Use AvatarUploadError messages from uploadProfileAvatar instead. */
export function formatAvatarStorageError(message: string): string {
  return mapStorageUploadError({ message }).message;
}

export async function uploadProfileAvatar(
  supabase: SupabaseClient,
  userId: string,
  file: File,
  position?: PhotoObjectPosition,
  options?: { replaceUrl?: string | null },
): Promise<ProfileRow> {
  avatarUploadLog("selected file", {
    name: file.name,
    type: file.type,
    size: file.size,
  });

  let sessionUserId: string;
  try {
    sessionUserId = await assertProfilePhotoAccess(supabase, userId);
  } catch (err) {
    avatarUploadErrorLog("access check failed", {
      userId,
      ...(err instanceof Error ? { message: err.message, name: err.name } : { err }),
    });
    if (err instanceof AuthRequiredError) {
      throw new AvatarUploadError("not_signed_in", "You must be signed in to upload a profile photo.");
    }
    if (err instanceof ForbiddenError) {
      throw new AvatarUploadError(
        "forbidden",
        "You do not have permission to change this profile photo.",
      );
    }
    throw new AvatarUploadError(
      "rate_limited",
      err instanceof Error ? err.message : "Too many upload attempts. Please try again later.",
    );
  }

  const replaceStoragePath = options?.replaceUrl
    ? avatarStoragePathFromPublicUrl(options.replaceUrl)
    : null;
  const replaceOwnerId = replaceStoragePath?.split("/")[0]?.trim();
  const canReplaceInPlace =
    Boolean(replaceStoragePath) &&
    Boolean(replaceOwnerId) &&
    replaceOwnerId === sessionUserId;

  if (options?.replaceUrl && !canReplaceInPlace) {
    avatarUploadLog("replace url ignored — not in avatars bucket or wrong owner", {
      replaceUrl: options.replaceUrl,
      replaceStoragePath,
      userId: sessionUserId,
    });
  }

  const { storagePath, publicUrl } = await uploadAvatarStorageObject(
    supabase,
    sessionUserId,
    file,
    canReplaceInPlace && replaceStoragePath
      ? { storagePath: replaceStoragePath, upsert: true }
      : undefined,
  );

  const updatePayload = await buildAvatarProfileUpdatePayload(supabase, userId, publicUrl, position);
  avatarUploadLog("profile update payload", {
    table: "profiles",
    id: userId,
    columns: Object.keys(updatePayload),
    avatar_url: publicUrl,
  });

  const { error: updateError } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", userId);

  if (updateError) {
    const detail = supabaseErrorDetail(updateError as PostgrestError);
    avatarUploadErrorLog("profile update result", {
      ok: false,
      payload: updatePayload,
      code: detail?.code ?? null,
      message: detail?.message ?? updateError.message,
      details: detail?.details ?? null,
      hint: detail?.hint ?? null,
    });
    await removeAvatarStorageObjects(supabase, sessionUserId, [storagePath]).catch((removeErr) => {
      avatarUploadErrorLog("cleanup remove after profile update failure", removeErr);
    });
    throw mapProfileUpdateError(updateError as PostgrestError);
  }

  avatarUploadLog("profile update result", { ok: true, avatar_url: publicUrl });

  try {
    const profile = await fetchUserProfile(supabase, userId);
    if (profile) {
      return profile;
    }
  } catch (err) {
    avatarUploadErrorLog("profile reload after update failed", err);
  }

  throw new AvatarUploadError(
    "profile_update_failed",
    "Photo uploaded, but your profile could not be reloaded. Refresh the page to see your new photo.",
  );
}
