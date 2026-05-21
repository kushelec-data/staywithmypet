import type { SupabaseClient } from "@supabase/supabase-js";

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
};

async function insertPetPhotoRows(
  supabase: SupabaseClient,
  rows: PetPhotoInsertRow[],
): Promise<void> {
  const withMediaType = await supabase.from("pet_photos").insert(rows);
  if (withMediaType.error && /column/i.test(withMediaType.error.message)) {
    const fallbackRows = rows.map(({ media_type: _m, ...rest }) => rest);
    const { error: insertError } = await supabase.from("pet_photos").insert(fallbackRows);
    if (insertError) {
      throw new Error(insertError.message || "Could not save pet photo records.");
    }
    return;
  }

  if (withMediaType.error) {
    throw new Error(withMediaType.error.message || "Could not save pet photo records.");
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
};

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
    await clearPetPhotoPrimaries(supabase, petId);
  } else {
    validatePetPhotoFiles(files);
  }

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
        is_primary: i === 0,
        media_type: mediaTypeForFile(file),
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
