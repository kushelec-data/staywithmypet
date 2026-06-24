import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizePhotoPosition,
  photoPositionFromPetRow,
  type PhotoObjectPosition,
} from "@/lib/photo-position";

export const PET_PHOTOS_BUCKET = "pet-photos";
export const MIN_PET_PHOTOS = 1;
export const MAX_PET_PHOTOS = 6;
const MAX_FILE_BYTES = 3 * 1024 * 1024;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

export function isPetMediaFile(file: File): boolean {
  return IMAGE_TYPES.has(file.type) || VIDEO_TYPES.has(file.type);
}

export function mediaTypeForFile(file: File): "image" | "video" {
  return VIDEO_TYPES.has(file.type) ? "video" : "image";
}

function validateFileSizesAndTypes(files: File[]): void {
  for (const file of files) {
    if (!isPetMediaFile(file)) {
      throw new Error("Files must be images (JPEG, PNG, WebP) or videos (MP4, WebM).");
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new Error("Each file must be 3 MB or smaller.");
    }
  }
}

export function validatePetPhotoFiles(files: File[]): void {
  if (files.length < MIN_PET_PHOTOS) {
    throw new Error(`Please add at least ${MIN_PET_PHOTOS} photo or video.`);
  }
  if (files.length > MAX_PET_PHOTOS) {
    throw new Error(`You can upload up to ${MAX_PET_PHOTOS} files.`);
  }
  validateFileSizesAndTypes(files);
}

/** Validates new uploads when appending on pet edit (pet may already have photos). */
export function validatePetPhotoFilesForAppend(
  files: File[],
  existingCount: number,
): void {
  if (files.length === 0) return;
  if (existingCount + files.length > MAX_PET_PHOTOS) {
    throw new Error(`This pet can have at most ${MAX_PET_PHOTOS} photos and videos.`);
  }
  validateFileSizesAndTypes(files);
}

function fileExtension(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ["jpg", "jpeg", "png", "webp", "gif", "mp4", "webm", "mov"].includes(fromName)) {
    if (fromName === "jpeg") return "jpg";
    if (fromName === "mov") return "mov";
    return fromName;
  }
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  if (file.type === "video/webm") return "webm";
  if (file.type === "video/quicktime") return "mov";
  if (file.type === "video/mp4") return "mp4";
  return "jpg";
}

type PetPhotoInsertRow = {
  pet_id: string;
  storage_path: string;
  public_url: string;
  alt_text: string;
  sort_order: number;
  is_primary: boolean;
  media_type?: string;
  object_position_x?: number;
  object_position_y?: number;
  photo_scale?: number;
};

async function insertPetPhotoRows(
  supabase: SupabaseClient,
  rows: PetPhotoInsertRow[],
): Promise<void> {
  const withPosition = await supabase.from("pet_photos").insert(rows);
  if (!withPosition.error) return;

  if (!/column/i.test(withPosition.error.message)) {
    throw new Error(withPosition.error.message || "Could not save pet photo records.");
  }

  const withoutPosition = rows.map(
    ({ object_position_x: _x, object_position_y: _y, photo_scale: _s, ...rest }) => rest,
  );
  const withMediaType = await supabase.from("pet_photos").insert(withoutPosition);
  if (!withMediaType.error) return;

  if (!/column/i.test(withMediaType.error.message)) {
    throw new Error(withMediaType.error.message || "Could not save pet photo records.");
  }

  const fallbackRows = withoutPosition.map(({ media_type: _m, ...rest }) => rest);
  const { error: insertError } = await supabase.from("pet_photos").insert(fallbackRows);
  if (insertError) {
    throw new Error(insertError.message || "Could not save pet photo records.");
  }
}

/** Clears primary flag on all photos for a pet (required before setting a new primary on edit). */
export async function clearPetPhotoPrimaries(
  supabase: SupabaseClient,
  petId: string,
): Promise<void> {
  const { error } = await supabase
    .from("pet_photos")
    .update({ is_primary: false })
    .eq("pet_id", petId);

  if (error) {
    throw new Error(error.message || "Could not update existing pet photos.");
  }
}

async function getPetPhotoCount(supabase: SupabaseClient, petId: string): Promise<number> {
  const { count, error } = await supabase
    .from("pet_photos")
    .select("id", { count: "exact", head: true })
    .eq("pet_id", petId);

  if (error) {
    throw new Error(error.message || "Could not load existing pet photos.");
  }
  return count ?? 0;
}

async function petHasPrimaryPhoto(supabase: SupabaseClient, petId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("pet_photos")
    .select("id")
    .eq("pet_id", petId)
    .eq("is_primary", true)
    .limit(1);

  if (error) {
    throw new Error(error.message || "Could not load existing pet photos.");
  }

  return (data?.length ?? 0) > 0;
}

async function getNextSortOrder(supabase: SupabaseClient, petId: string): Promise<number> {
  const { data, error } = await supabase
    .from("pet_photos")
    .select("sort_order")
    .eq("pet_id", petId)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message || "Could not load existing pet photos.");
  }

  const maxOrder = data?.[0]?.sort_order ?? -1;
  return maxOrder + 1;
}

export type UploadPetPhotosOptions = {
  /** Append new files on edit; does not re-insert existing photos. */
  append?: boolean;
  /** Optional focal points aligned with `files`. */
  positions?: PhotoObjectPosition[];
};

function positionRowPayload(position?: PhotoObjectPosition): {
  object_position_x: number;
  object_position_y: number;
  photo_scale: number;
} {
  const normalized = normalizePhotoPosition(position);
  return {
    object_position_x: normalized.objectPositionX,
    object_position_y: normalized.objectPositionY,
    photo_scale: normalized.photoScale ?? 1,
  };
}

export async function uploadAndAttachPetPhotos(
  supabase: SupabaseClient,
  ownerId: string,
  petId: string,
  files: File[],
  petName: string,
  options?: UploadPetPhotosOptions,
): Promise<void> {
  if (files.length === 0) return;

  const { assertRateLimit, requireAuthUserId, assertOwner } = await import("@/lib/security");
  const sessionUserId = await requireAuthUserId(supabase);
  assertOwner(ownerId, sessionUserId);
  assertRateLimit("file_upload", sessionUserId);

  const append = options?.append ?? false;

  if (append) {
    const existingCount = await getPetPhotoCount(supabase, petId);
    validatePetPhotoFilesForAppend(files, existingCount);
  } else {
    validatePetPhotoFiles(files);
  }

  const hasExistingPrimary = append ? await petHasPrimaryPhoto(supabase, petId) : false;
  const startSortOrder = append ? await getNextSortOrder(supabase, petId) : 0;
  const uploadedPaths: string[] = [];

  const rows: PetPhotoInsertRow[] = [];

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = fileExtension(file);
      const storagePath = `${ownerId}/${petId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(PET_PHOTOS_BUCKET)
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        });

      if (uploadError) {
        throw new Error(uploadError.message || "Could not upload a pet photo.");
      }

      uploadedPaths.push(storagePath);

      const { data: urlData } = supabase.storage.from(PET_PHOTOS_BUCKET).getPublicUrl(storagePath);

      rows.push({
        pet_id: petId,
        storage_path: storagePath,
        public_url: urlData.publicUrl,
        alt_text: `${petName} media ${startSortOrder + i + 1}`,
        sort_order: startSortOrder + i,
        is_primary: append ? !hasExistingPrimary && i === 0 : i === 0,
        media_type: mediaTypeForFile(file),
        ...positionRowPayload(options?.positions?.[i]),
      });
    }

    await insertPetPhotoRows(supabase, rows);
  } catch (err) {
    if (uploadedPaths.length > 0) {
      await supabase.storage.from(PET_PHOTOS_BUCKET).remove(uploadedPaths);
    }
    throw err;
  }
}

type PhotoRow = {
  public_url: string | null;
  is_primary: boolean;
  sort_order: number;
  object_position_x?: number | null;
  object_position_y?: number | null;
  photo_scale?: number | null;
};

function sortPetPhotos(photos: PhotoRow[]): PhotoRow[] {
  return [...photos].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    return a.sort_order - b.sort_order;
  });
}

export function sortPetPhotoUrls(photos: PhotoRow[] | null | undefined): string[] {
  if (!photos?.length) return [];
  return sortPetPhotos(photos)
    .map((p) => p.public_url?.trim())
    .filter((url): url is string => Boolean(url));
}

export function pickPrimaryPhotoUrl(photos: PhotoRow[] | null | undefined): string | null {
  const urls = sortPetPhotoUrls(photos);
  return urls[0] ?? null;
}

export function pickPrimaryPhotoPosition(photos: PhotoRow[] | null | undefined): PhotoObjectPosition {
  if (!photos?.length) return normalizePhotoPosition(null);
  const primary = sortPetPhotos(photos)[0];
  return photoPositionFromPetRow(primary ?? {});
}

export function photoPositionsByUrl(photos: PhotoRow[] | null | undefined): Record<string, PhotoObjectPosition> {
  if (!photos?.length) return {};
  const out: Record<string, PhotoObjectPosition> = {};
  for (const photo of photos) {
    const url = photo.public_url?.trim();
    if (!url) continue;
    out[url] = photoPositionFromPetRow(photo);
  }
  return out;
}

export type PetPhotoRecord = {
  id: string;
  public_url: string | null;
  storage_path: string;
  sort_order: number;
  is_primary: boolean;
  media_type: string | null;
  object_position_x?: number | null;
  object_position_y?: number | null;
  photo_scale?: number | null;
};

export async function fetchPetPhotosForOwner(
  supabase: SupabaseClient,
  ownerId: string,
  petId: string,
): Promise<PetPhotoRecord[]> {
  const { data: pet, error: petError } = await supabase
    .from("pets")
    .select("id")
    .eq("id", petId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (petError) {
    throw new Error(petError.message || "Could not load pet photos.");
  }
  if (!pet) {
    throw new Error("Pet not found.");
  }

  const withMedia = await supabase
    .from("pet_photos")
    .select(
      "id, public_url, storage_path, sort_order, is_primary, media_type, object_position_x, object_position_y, photo_scale",
    )
    .eq("pet_id", petId)
    .order("sort_order", { ascending: true });

  if (withMedia.error && /column/i.test(withMedia.error.message)) {
    const fallback = await supabase
      .from("pet_photos")
      .select("id, public_url, storage_path, sort_order, is_primary, media_type")
      .eq("pet_id", petId)
      .order("sort_order", { ascending: true });

    if (fallback.error && /column/i.test(fallback.error.message)) {
      const legacy = await supabase
        .from("pet_photos")
        .select("id, public_url, storage_path, sort_order, is_primary")
        .eq("pet_id", petId)
        .order("sort_order", { ascending: true });

      if (legacy.error) {
        throw new Error(legacy.error.message || "Could not load pet photos.");
      }

      return (legacy.data ?? []).map((row) => ({
        ...row,
        media_type: null,
      }));
    }

    if (fallback.error) {
      throw new Error(fallback.error.message || "Could not load pet photos.");
    }

    return (fallback.data ?? []).map((row) => ({
      ...row,
    }));
  }

  if (withMedia.error) {
    throw new Error(withMedia.error.message || "Could not load pet photos.");
  }

  return withMedia.data ?? [];
}

export async function replacePetPhotoImage(
  supabase: SupabaseClient,
  ownerId: string,
  petId: string,
  photoId: string,
  file: File,
  position?: PhotoObjectPosition,
): Promise<void> {
  if (!IMAGE_TYPES.has(file.type)) {
    throw new Error("Only image photos can be repositioned.");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("Each file must be 3 MB or smaller.");
  }

  const { assertRateLimit, requireAuthUserId, assertOwner } = await import("@/lib/security");
  const sessionUserId = await requireAuthUserId(supabase);
  assertOwner(ownerId, sessionUserId);
  assertRateLimit("file_upload", sessionUserId);

  const { data: pet, error: petError } = await supabase
    .from("pets")
    .select("id")
    .eq("id", petId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (petError) {
    throw new Error(petError.message || "Could not load pet photo.");
  }
  if (!pet) {
    throw new Error("Pet not found.");
  }

  const { data: photo, error: photoError } = await supabase
    .from("pet_photos")
    .select("id, storage_path")
    .eq("id", photoId)
    .eq("pet_id", petId)
    .maybeSingle();

  if (photoError) {
    throw new Error(photoError.message || "Could not load pet photo.");
  }
  if (!photo) {
    throw new Error("Pet photo not found.");
  }

  const ext = fileExtension(file);
  const storagePath = photo.storage_path.endsWith(`.${ext}`)
    ? photo.storage_path
    : `${ownerId}/${petId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(PET_PHOTOS_BUCKET).upload(storagePath, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type || undefined,
  });

  if (uploadError) {
    throw new Error(uploadError.message || "Could not update pet photo.");
  }

  const { data: urlData } = supabase.storage.from(PET_PHOTOS_BUCKET).getPublicUrl(storagePath);
  const publicUrl = urlData.publicUrl;

  const updatePayload = {
    storage_path: storagePath,
    public_url: publicUrl,
    media_type: "image",
    ...positionRowPayload(position),
  };

  const { error: updateError } = await supabase
    .from("pet_photos")
    .update(updatePayload)
    .eq("id", photoId)
    .eq("pet_id", petId);

  if (updateError && /column/i.test(updateError.message)) {
    const { error: fallbackError } = await supabase
      .from("pet_photos")
      .update({
        storage_path: storagePath,
        public_url: publicUrl,
        media_type: "image",
      })
      .eq("id", photoId)
      .eq("pet_id", petId);
    if (fallbackError) {
      throw new Error(fallbackError.message || "Could not update pet photo.");
    }
  } else if (updateError) {
    throw new Error(updateError.message || "Could not update pet photo.");
  }

  if (photo.storage_path !== storagePath) {
    await removePetPhotoStorageObjects(supabase, [photo.storage_path]);
  }
}

function warnStorageDeleteFailure(storagePath: string, message: string): void {
  console.warn(`[pet-photos] storage delete failed for ${storagePath}: ${message}`);
}

async function removePetPhotoStorageObjects(
  supabase: SupabaseClient,
  storagePaths: string[],
): Promise<void> {
  if (!storagePaths.length) return;
  const { error } = await supabase.storage.from(PET_PHOTOS_BUCKET).remove(storagePaths);
  if (error) {
    for (const path of storagePaths) {
      warnStorageDeleteFailure(path, error.message);
    }
  }
}

async function promoteNextPrimaryPhoto(supabase: SupabaseClient, petId: string): Promise<void> {
  const { data, error } = await supabase
    .from("pet_photos")
    .select("id")
    .eq("pet_id", petId)
    .order("sort_order", { ascending: true })
    .limit(1);

  if (error) {
    throw new Error(error.message || "Could not update main pet photo.");
  }

  const nextId = data?.[0]?.id;
  if (!nextId) return;

  const { error: updateError } = await supabase
    .from("pet_photos")
    .update({ is_primary: true })
    .eq("id", nextId)
    .eq("pet_id", petId);

  if (updateError) {
    throw new Error(updateError.message || "Could not update main pet photo.");
  }
}

/** Deletes a saved pet photo (DB row + storage). Promotes the next photo if main was removed. */
export async function deletePetPhotoForOwner(
  supabase: SupabaseClient,
  ownerId: string,
  petId: string,
  photoId: string,
): Promise<void> {
  const { assertRateLimit, requireAuthUserId, assertOwner } = await import("@/lib/security");
  const sessionUserId = await requireAuthUserId(supabase);
  assertOwner(ownerId, sessionUserId);
  assertRateLimit("file_upload", sessionUserId);

  const { data: pet, error: petError } = await supabase
    .from("pets")
    .select("id")
    .eq("id", petId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (petError) {
    throw new Error(petError.message || "Could not load pet photo.");
  }
  if (!pet) {
    throw new Error("Pet not found.");
  }

  const { data: photo, error: photoError } = await supabase
    .from("pet_photos")
    .select("id, storage_path, is_primary")
    .eq("id", photoId)
    .eq("pet_id", petId)
    .maybeSingle();

  if (photoError) {
    throw new Error(photoError.message || "Could not load pet photo.");
  }
  if (!photo) {
    throw new Error("Pet photo not found.");
  }

  if (photo.is_primary) {
    throw new Error("Set another photo as the main photo before deleting this one.");
  }

  const photoCount = await getPetPhotoCount(supabase, petId);
  if (photoCount <= 1) {
    throw new Error("Keep at least one photo on your pet profile.");
  }

  const { error: deleteError } = await supabase
    .from("pet_photos")
    .delete()
    .eq("id", photoId)
    .eq("pet_id", petId);

  if (deleteError) {
    throw new Error(deleteError.message || "Could not remove pet photo.");
  }

  if (photo.storage_path?.trim()) {
    await removePetPhotoStorageObjects(supabase, [photo.storage_path.trim()]);
  }
}

/** Sets one saved pet photo as the main listing image (`is_primary`). */
export async function setPrimaryPetPhotoForOwner(
  supabase: SupabaseClient,
  ownerId: string,
  petId: string,
  photoId: string,
): Promise<void> {
  const { assertRateLimit, requireAuthUserId, assertOwner } = await import("@/lib/security");
  const sessionUserId = await requireAuthUserId(supabase);
  assertOwner(ownerId, sessionUserId);
  assertRateLimit("file_upload", sessionUserId);

  const { data: pet, error: petError } = await supabase
    .from("pets")
    .select("id")
    .eq("id", petId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (petError) {
    throw new Error(petError.message || "Could not load pet photo.");
  }
  if (!pet) {
    throw new Error("Pet not found.");
  }

  const { data: photo, error: photoError } = await supabase
    .from("pet_photos")
    .select("id")
    .eq("id", photoId)
    .eq("pet_id", petId)
    .maybeSingle();

  if (photoError) {
    throw new Error(photoError.message || "Could not load pet photo.");
  }
  if (!photo) {
    throw new Error("Pet photo not found.");
  }

  await clearPetPhotoPrimaries(supabase, petId);

  const { error: updateError } = await supabase
    .from("pet_photos")
    .update({ is_primary: true })
    .eq("id", photoId)
    .eq("pet_id", petId);

  if (updateError) {
    throw new Error(updateError.message || "Could not update main pet photo.");
  }
}

/** Removes all pet photos from storage before hard-deleting a pet profile. */
export async function deleteAllPetPhotosForOwner(
  supabase: SupabaseClient,
  ownerId: string,
  petId: string,
): Promise<void> {
  const { assertOwner, requireAuthUserId } = await import("@/lib/security");
  const sessionUserId = await requireAuthUserId(supabase);
  assertOwner(ownerId, sessionUserId);

  const { data: pet, error: petError } = await supabase
    .from("pets")
    .select("id")
    .eq("id", petId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (petError) {
    throw new Error(petError.message || "Could not load pet photos.");
  }
  if (!pet) {
    throw new Error("Pet not found.");
  }

  const { data: photos, error: photosError } = await supabase
    .from("pet_photos")
    .select("storage_path")
    .eq("pet_id", petId);

  if (photosError) {
    throw new Error(photosError.message || "Could not load pet photos.");
  }

  const storagePaths = (photos ?? [])
    .map((row) => row.storage_path)
    .filter((path): path is string => typeof path === "string" && path.trim().length > 0);

  if (storagePaths.length) {
    await removePetPhotoStorageObjects(supabase, storagePaths);
  }

  const { error: deleteError } = await supabase.from("pet_photos").delete().eq("pet_id", petId);
  if (deleteError) {
    throw new Error(deleteError.message || "Could not remove pet photos.");
  }
}
