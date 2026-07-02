import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import {
  fetchUserProfile,
  formatSupabaseError,
} from "@/lib/profile-load";
import { parseProfileDetails } from "@/lib/profile-details";
import type { ProfileRow } from "@/lib/profile-utils";
import {
  AVATARS_BUCKET,
  formatAvatarStorageError,
  validateProfileAvatarFile,
  avatarFileExtension,
} from "@/lib/profile-avatar";
import {
  normalizePhotoPosition,
  syncAvatarPositionInDetails,
  type PhotoObjectPosition,
} from "@/lib/photo-position";

export const MAX_PROFILE_GALLERY_PHOTOS = 6;

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

  const { error } = await supabase.from("profiles").update(row).eq("id", userId);

  if (error) {
    throw new Error(formatSupabaseError(error as PostgrestError));
  }

  const reloaded = await fetchUserProfile(supabase, userId);
  if (!reloaded) {
    throw new Error("Could not update profile photos.");
  }
  return reloaded;
}

function galleryStoragePath(userId: string, file: File): string {
  const ext = avatarFileExtension(file);
  return `${userId}/gallery/${crypto.randomUUID()}.${ext}`;
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
  validateProfileAvatarFile(file);

  if (options.currentPhotos.length >= MAX_PROFILE_GALLERY_PHOTOS) {
    throw new Error(`You can upload up to ${MAX_PROFILE_GALLERY_PHOTOS} profile photos.`);
  }

  const storagePath = galleryStoragePath(userId, file);
  const { error: uploadError } = await supabase.storage.from(AVATARS_BUCKET).upload(storagePath, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });

  if (uploadError) {
    throw new Error(formatAvatarStorageError(uploadError.message || "Could not upload photo."));
  }

  const { data: urlData } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(storagePath);
  const publicUrl = urlData.publicUrl;
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
  const nextPhotos = options.currentPhotos.filter((p) => p !== url);
  const wasAvatar = options.currentAvatarUrl === url;
  const nextAvatar = wasAvatar ? nextPhotos[0] ?? null : options.currentAvatarUrl;

  return persistGallery(supabase, userId, nextPhotos, nextAvatar);
}

export async function setMainProfilePhoto(
  supabase: SupabaseClient,
  userId: string,
  url: string,
  options: { currentPhotos: string[] },
): Promise<ProfileRow> {
  if (!options.currentPhotos.includes(url)) {
    throw new Error("Choose a photo from your gallery.");
  }
  return persistGallery(supabase, userId, options.currentPhotos, url);
}

function storagePathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${AVATARS_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length));
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

  if (!options.currentPhotos.includes(oldUrl)) {
    throw new Error("Choose a photo from your gallery.");
  }

  const oldStoragePath = storagePathFromPublicUrl(oldUrl);
  const ext = avatarFileExtension(file);
  const storagePath = oldStoragePath ?? `${userId}/gallery/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(AVATARS_BUCKET).upload(storagePath, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type || undefined,
  });

  if (uploadError) {
    throw new Error(formatAvatarStorageError(uploadError.message || "Could not update photo."));
  }

  const { data: urlData } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(storagePath);
  const publicUrl = urlData.publicUrl;
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
    await supabase.storage.from(AVATARS_BUCKET).remove([oldStoragePath]);
  }

  return updated;
}
