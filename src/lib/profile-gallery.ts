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

export const MAX_PROFILE_GALLERY_PHOTOS = 6;

export function profilePhotosFromDetails(detailsRaw: unknown): string[] {
  const parsed = parseProfileDetails(detailsRaw);
  const urls = parsed.profile_photos ?? [];
  return urls.filter((u) => typeof u === "string" && u.trim().length > 0).slice(0, MAX_PROFILE_GALLERY_PHOTOS);
}

export function mergeDetailsProfilePhotos(
  existingDetails: unknown,
  photos: string[],
): Record<string, unknown> {
  const base =
    existingDetails && typeof existingDetails === "object" && !Array.isArray(existingDetails)
      ? { ...(existingDetails as Record<string, unknown>) }
      : {};
  base.profile_photos = photos
    .filter((u) => u.trim().length > 0)
    .slice(0, MAX_PROFILE_GALLERY_PHOTOS);
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
): Promise<ProfileRow> {
  const details = mergeDetailsProfilePhotos(await loadDetails(supabase, userId), photos);
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
  options: { currentPhotos: string[]; currentAvatarUrl: string | null },
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

  return persistGallery(supabase, userId, nextPhotos, nextAvatar);
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
  options: { currentPhotos: string[]; currentAvatarUrl: string | null },
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

  const updated = await persistGallery(supabase, userId, nextPhotos, nextAvatar);

  if (oldStoragePath && oldStoragePath !== storagePath) {
    await supabase.storage.from(AVATARS_BUCKET).remove([oldStoragePath]);
  }

  return updated;
}
