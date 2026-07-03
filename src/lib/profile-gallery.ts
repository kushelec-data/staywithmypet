import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import {
  fetchUserProfile,
  formatSupabaseError,
} from "@/lib/profile-load";
import { parseProfileDetails } from "@/lib/profile-details";
import type { ProfileRow } from "@/lib/profile-utils";
import {
  assertProfilePhotoAccess,
  avatarStorageErrorDetail,
  avatarStoragePath,
  avatarStoragePathFromPublicUrl,
  AVATARS_BUCKET,
  removeAvatarStorageObjects,
  uploadAvatarStorageObject,
  validateProfileAvatarFile,
  avatarFileExtension,
} from "@/lib/profile-avatar";
import {
  normalizePhotoPosition,
  syncAvatarPositionInDetails,
  type PhotoObjectPosition,
} from "@/lib/photo-position";
import { supabaseErrorDetail } from "@/lib/supabase-errors";

export const MAX_PROFILE_GALLERY_PHOTOS = 6;

function galleryLog(message: string, detail?: Record<string, unknown>): void {
  if (detail) {
    console.info(`[profile-gallery] ${message}`, detail);
  } else {
    console.info(`[profile-gallery] ${message}`);
  }
}

function galleryErrorLog(message: string, detail?: unknown): void {
  console.error(`[profile-gallery] ${message}`, detail);
}

export function profilePhotosFromDetails(detailsRaw: unknown): string[] {
  const parsed = parseProfileDetails(detailsRaw);
  const urls = parsed.profile_photos ?? [];
  return urls.filter((u) => typeof u === "string" && u.trim().length > 0).slice(0, MAX_PROFILE_GALLERY_PHOTOS);
}

export function mergeDetailsProfilePhotos(
  existingDetails: unknown,
  photos: string[],
  photoPositions?: Record<string, PhotoObjectPosition>,
): Record<string, unknown> {
  const base =
    existingDetails && typeof existingDetails === "object" && !Array.isArray(existingDetails)
      ? { ...(existingDetails as Record<string, unknown>) }
      : {};
  base.profile_photos = photos
    .filter((u) => u.trim().length > 0)
    .slice(0, MAX_PROFILE_GALLERY_PHOTOS);

  if (photoPositions && Object.keys(photoPositions).length > 0) {
    const current =
      base.profile_photo_positions &&
      typeof base.profile_photo_positions === "object" &&
      !Array.isArray(base.profile_photo_positions)
        ? { ...(base.profile_photo_positions as Record<string, PhotoObjectPosition>) }
        : {};
    for (const url of photos) {
      if (photoPositions[url]) {
        current[url] = normalizePhotoPosition(photoPositions[url]);
      }
    }
    for (const key of Object.keys(current)) {
      if (!photos.includes(key)) delete current[key];
    }
    base.profile_photo_positions = current;
  }

  return base;
}

async function loadDetails(
  supabase: SupabaseClient,
  userId: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.from("profiles").select("details").eq("id", userId).maybeSingle();
  if (error) throw new Error(formatSupabaseError(error));
  const raw = data?.details;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return { ...(raw as Record<string, unknown>) };
  }
  return {};
}

async function persistGallery(
  supabase: SupabaseClient,
  userId: string,
  photos: string[],
  avatarUrl?: string | null,
  photoPositions?: Record<string, PhotoObjectPosition>,
): Promise<ProfileRow> {
  const details = mergeDetailsProfilePhotos(
    await loadDetails(supabase, userId),
    photos,
    photoPositions,
  );
  if (avatarUrl !== undefined) {
    syncAvatarPositionInDetails(details, avatarUrl);
  }
  const row: Record<string, unknown> = {
    details,
    updated_at: new Date().toISOString(),
  };
  if (avatarUrl !== undefined) {
    row.avatar_url = avatarUrl;
  }

  galleryLog("persist profile update", {
    userId,
    photoCount: photos.length,
    avatarUrl: avatarUrl ?? undefined,
  });

  const { error } = await supabase.from("profiles").update(row).eq("id", userId);

  if (error) {
    galleryErrorLog("persist profile update failed", {
      userId,
      ...supabaseErrorDetail(error as PostgrestError),
    });
    throw new Error(formatSupabaseError(error as PostgrestError));
  }

  const reloaded = await fetchUserProfile(supabase, userId);
  if (!reloaded) {
    throw new Error("Could not update profile photos.");
  }
  return reloaded;
}

export async function uploadProfileGalleryPhoto(
  supabase: SupabaseClient,
  userId: string,
  file: File,
  options: {
    currentPhotos: string[];
    currentAvatarUrl: string | null;
    position?: PhotoObjectPosition;
  },
): Promise<ProfileRow> {
  const sessionUserId = await assertProfilePhotoAccess(supabase, userId);

  if (options.currentPhotos.length >= MAX_PROFILE_GALLERY_PHOTOS) {
    throw new Error(`You can upload up to ${MAX_PROFILE_GALLERY_PHOTOS} profile photos.`);
  }

  const { publicUrl } = await uploadAvatarStorageObject(supabase, sessionUserId, file, { gallery: true });
  const nextPhotos = [...options.currentPhotos, publicUrl];
  const nextAvatar =
    options.currentAvatarUrl?.trim() ? options.currentAvatarUrl : publicUrl;
  const photoPositions = options.position
    ? { [publicUrl]: normalizePhotoPosition(options.position) }
    : undefined;

  return persistGallery(supabase, userId, nextPhotos, nextAvatar, photoPositions);
}

export async function removeProfileGalleryPhoto(
  supabase: SupabaseClient,
  userId: string,
  url: string,
  options: { currentPhotos: string[]; currentAvatarUrl: string | null },
): Promise<ProfileRow> {
  const sessionUserId = await assertProfilePhotoAccess(supabase, userId, { rateLimit: false });

  const nextPhotos = options.currentPhotos.filter((p) => p !== url);
  const wasAvatar = options.currentAvatarUrl === url;
  const nextAvatar = wasAvatar ? nextPhotos[0] ?? null : options.currentAvatarUrl;

  const updated = await persistGallery(supabase, userId, nextPhotos, nextAvatar);

  const storagePath = avatarStoragePathFromPublicUrl(url);
  if (storagePath) {
    try {
      await removeAvatarStorageObjects(supabase, sessionUserId, [storagePath]);
    } catch (err) {
      galleryErrorLog("storage remove after gallery delete failed", {
        bucket: AVATARS_BUCKET,
        path: storagePath,
        userId: sessionUserId,
        ...(err instanceof Error && "reason" in err
          ? { message: err.message, reason: (err as { reason?: string }).reason, cause: err.cause }
          : avatarStorageErrorDetail(err as { message?: string })),
      });
    }
  } else {
    galleryLog("skip storage remove — URL not in avatars bucket", { url, userId: sessionUserId });
  }

  return updated;
}

export async function setMainProfilePhoto(
  supabase: SupabaseClient,
  userId: string,
  url: string,
  options: { currentPhotos: string[] },
): Promise<ProfileRow> {
  await assertProfilePhotoAccess(supabase, userId, { rateLimit: false });

  if (!options.currentPhotos.includes(url)) {
    throw new Error("Choose a photo from your gallery.");
  }
  return persistGallery(supabase, userId, options.currentPhotos, url);
}

export async function replaceProfileGalleryPhoto(
  supabase: SupabaseClient,
  userId: string,
  oldUrl: string,
  file: File,
  options: {
    currentPhotos: string[];
    currentAvatarUrl: string | null;
    position?: PhotoObjectPosition;
  },
): Promise<ProfileRow> {
  validateProfileAvatarFile(file);
  const sessionUserId = await assertProfilePhotoAccess(supabase, userId);

  if (!options.currentPhotos.includes(oldUrl)) {
    throw new Error("Choose a photo from your gallery.");
  }

  const oldStoragePath = avatarStoragePathFromPublicUrl(oldUrl);
  const ext = avatarFileExtension(file);
  const storagePath = oldStoragePath ?? avatarStoragePath(sessionUserId, file, true);

  const { publicUrl } = await uploadAvatarStorageObject(supabase, sessionUserId, file, {
    gallery: true,
    upsert: true,
    storagePath,
  });

  const nextPhotos = options.currentPhotos.map((photo) => (photo === oldUrl ? publicUrl : photo));
  const nextAvatar =
    options.currentAvatarUrl === oldUrl ? publicUrl : options.currentAvatarUrl;
  const existingDetails = await loadDetails(supabase, userId);
  const existingPositions =
    existingDetails.profile_photo_positions &&
    typeof existingDetails.profile_photo_positions === "object" &&
    !Array.isArray(existingDetails.profile_photo_positions)
      ? { ...(existingDetails.profile_photo_positions as Record<string, PhotoObjectPosition>) }
      : {};
  if (existingPositions[oldUrl]) {
    existingPositions[publicUrl] = options.position
      ? normalizePhotoPosition(options.position)
      : existingPositions[oldUrl];
    delete existingPositions[oldUrl];
  } else if (options.position) {
    existingPositions[publicUrl] = normalizePhotoPosition(options.position);
  }

  const updated = await persistGallery(
    supabase,
    userId,
    nextPhotos,
    nextAvatar,
    existingPositions,
  );

  if (oldStoragePath && oldStoragePath !== storagePath) {
    try {
      await removeAvatarStorageObjects(supabase, sessionUserId, [oldStoragePath]);
    } catch (err) {
      galleryErrorLog("storage remove after gallery replace failed", {
        bucket: AVATARS_BUCKET,
        path: oldStoragePath,
        userId: sessionUserId,
        ...(err instanceof Error && "reason" in err
          ? { message: err.message, reason: (err as { reason?: string }).reason, cause: err.cause }
          : avatarStorageErrorDetail(err as { message?: string })),
      });
    }
  }

  return updated;
}

/** @deprecated use avatarStoragePathFromPublicUrl */
export function storagePathFromPublicUrl(url: string): string | null {
  return avatarStoragePathFromPublicUrl(url);
}
