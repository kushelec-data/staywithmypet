"use client";

import { PhotoCropModal } from "@/components/media/PhotoCropModal";
import { isCropSupportedImageFile, validateCropSourceFile } from "@/lib/image-crop";
import { MAX_PET_PHOTOS } from "@/lib/pet-photos";
import { useLanguage } from "@/context/LanguageContext";
import { useEffect, useRef, useState } from "react";

export type ExistingPetPhotoItem = {
  id: string;
  url: string;
  isPrimary: boolean;
  mediaType: "image" | "video";
};

type PetPhotoUploadProps = {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  /** When true, media is optional (edit mode). */
  optional?: boolean;
  existingPhotos?: ExistingPetPhotoItem[];
  onReplaceExistingPhoto?: (photoId: string, file: File) => Promise<void>;
  onRemoveExistingPhoto?: (photoId: string) => Promise<void>;
  existingPhotoBusy?: boolean;
};

type CropSession = {
  file?: File;
  url?: string;
  replaceIndex?: number;
  replaceExistingId?: string;
} | null;

export function PetPhotoUpload({
  files,
  onChange,
  disabled,
  optional,
  existingPhotos = [],
  onReplaceExistingPhoto,
  onRemoveExistingPhoto,
  existingPhotoBusy = false,
}: PetPhotoUploadProps) {
  const { t } = useLanguage();
  const copy = t.account.petsPage;
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingImagesRef = useRef<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [pickError, setPickError] = useState<string | null>(null);
  const [cropSession, setCropSession] = useState<CropSession>(null);
  const [cropSaving, setCropSaving] = useState(false);
  const [removingExistingId, setRemovingExistingId] = useState<string | null>(null);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  function openNextPendingImage() {
    const next = pendingImagesRef.current.shift();
    if (next) {
      setCropSession({ file: next });
    } else {
      setCropSession(null);
    }
  }

  function handleFilesSelected(selected: FileList | null) {
    if (!selected?.length) return;
    setPickError(null);

    const incoming = Array.from(selected);
    const videos = incoming.filter((file) => file.type.startsWith("video/"));
    const images = incoming.filter((file) => isCropSupportedImageFile(file));
    const unsupported = incoming.filter(
      (file) => !videos.includes(file) && !images.includes(file),
    );

    if (unsupported.length > 0) {
      setPickError(copy.invalidMediaTypeError);
    }

    const slotsLeft = MAX_PET_PHOTOS - files.length - existingPhotos.length;
    if (slotsLeft <= 0) {
      setPickError(copy.maxFilesError.replace("{max}", String(MAX_PET_PHOTOS)));
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const nextVideos = videos.slice(0, slotsLeft);
    const validImages: File[] = [];

    for (const file of images) {
      if (nextVideos.length + validImages.length >= slotsLeft) break;
      try {
        validateCropSourceFile(file);
        validImages.push(file);
      } catch (err) {
        setPickError(err instanceof Error ? err.message : t.media.openEditorError);
      }
    }

    if (nextVideos.length > 0) {
      const combined = [...files, ...nextVideos].slice(0, MAX_PET_PHOTOS - existingPhotos.length);
      if (files.length + selected.length > MAX_PET_PHOTOS - existingPhotos.length) {
        setPickError(copy.maxFilesError.replace("{max}", String(MAX_PET_PHOTOS)));
      }
      onChange(combined);
    }

    if (validImages.length > 0) {
      pendingImagesRef.current = [...pendingImagesRef.current, ...validImages];
      if (!cropSession) {
        openNextPendingImage();
      }
    }

    if (inputRef.current) inputRef.current.value = "";
  }

  function removeAt(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  async function removeExisting(photoId: string) {
    if (!onRemoveExistingPhoto || disabled || existingPhotoBusy || removingExistingId) return;
    setPickError(null);
    setRemovingExistingId(photoId);
    try {
      await onRemoveExistingPhoto(photoId);
    } catch (err) {
      setPickError(err instanceof Error ? err.message : copy.deletePhotoError);
    } finally {
      setRemovingExistingId(null);
    }
  }

  function openEditNewFile(index: number) {
    const file = files[index];
    if (!file || !isCropSupportedImageFile(file) || disabled || cropSaving) return;
    setPickError(null);
    setCropSession({ file, replaceIndex: index });
  }

  function openEditExistingPhoto(photo: ExistingPetPhotoItem) {
    if (photo.mediaType !== "image" || disabled || cropSaving || !onReplaceExistingPhoto) return;
    setPickError(null);
    setCropSession({ url: photo.url, replaceExistingId: photo.id });
  }

  async function saveCroppedPhoto(cropped: File) {
    setCropSaving(true);
    setPickError(null);
    try {
      if (cropSession?.replaceExistingId && onReplaceExistingPhoto) {
        await onReplaceExistingPhoto(cropSession.replaceExistingId, cropped);
        setCropSession(null);
        return;
      }

      if (typeof cropSession?.replaceIndex === "number") {
        const next = [...files];
        next[cropSession.replaceIndex] = cropped;
        onChange(next);
        setCropSession(null);
        return;
      }

      const next = [...files, cropped].slice(0, MAX_PET_PHOTOS - existingPhotos.length);
      onChange(next);

      if (pendingImagesRef.current.length > 0) {
        openNextPendingImage();
      } else {
        setCropSession(null);
      }
    } catch (err) {
      setPickError(err instanceof Error ? err.message : t.media.savePhotoError);
    } finally {
      setCropSaving(false);
    }
  }

  const totalCount = files.length + existingPhotos.length;
  const slotsLeft = MAX_PET_PHOTOS - totalCount;
  const busy = disabled || cropSaving || existingPhotoBusy || Boolean(removingExistingId);

  return (
    <>
      <div className="sm:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="form-field-label">{copy.photosVideos}</span>
          <span className="text-xs text-muted">
            {totalCount}/{MAX_PET_PHOTOS}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted">
          {optional ? copy.galleryHintOptional : copy.galleryHintCreate}
        </p>

        {pickError ? (
          <p className="mt-2 text-xs text-brand-pink" role="alert">
            {pickError}
          </p>
        ) : null}

        {existingPhotos.length > 0 || previews.length > 0 ? (
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {existingPhotos.map((photo) => (
              <li
                key={photo.id}
                className="relative aspect-square overflow-hidden rounded-2xl border border-black/5"
              >
                {photo.mediaType === "video" ? (
                  <video src={photo.url} className="h-full w-full object-cover" muted playsInline />
                ) : (
                  <img src={photo.url} alt="" className="h-full w-full object-cover" />
                )}
                {photo.isPrimary ? (
                  <span className="absolute left-2 top-2 rounded-full bg-brand-teal px-2 py-0.5 text-[0.65rem] font-semibold text-white">
                    {copy.mainPhoto}
                  </span>
                ) : null}
                {onRemoveExistingPhoto ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void removeExisting(photo.id)}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-surface/95 text-sm text-foreground shadow-sm ring-1 ring-black/5"
                    aria-label={copy.removePhoto}
                    title={copy.removePhoto}
                  >
                    ×
                  </button>
                ) : null}
                {photo.mediaType === "image" && onReplaceExistingPhoto ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => openEditExistingPhoto(photo)}
                    className="absolute bottom-2 left-2 rounded-lg bg-surface/95 px-2 py-1 text-[0.65rem] font-semibold text-foreground shadow-sm ring-1 ring-black/5"
                  >
                    {t.media.editPhoto}
                  </button>
                ) : null}
              </li>
            ))}
            {previews.map((src, index) => (
              <li key={src} className="relative aspect-square overflow-hidden rounded-2xl border border-black/5">
                {files[index]?.type.startsWith("video/") ? (
                  <video src={src} className="h-full w-full object-cover" muted playsInline />
                ) : (
                  <img src={src} alt="" className="h-full w-full object-cover" />
                )}
                {existingPhotos.length === 0 && index === 0 ? (
                  <span className="absolute left-2 top-2 rounded-full bg-brand-teal px-2 py-0.5 text-[0.65rem] font-semibold text-white">
                    {copy.mainPhoto}
                  </span>
                ) : null}
                {files[index] && isCropSupportedImageFile(files[index]!) ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => openEditNewFile(index)}
                    className="absolute bottom-2 left-2 rounded-lg bg-surface/95 px-2 py-1 text-[0.65rem] font-semibold text-foreground shadow-sm ring-1 ring-black/5"
                  >
                    {t.media.editPhoto}
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => removeAt(index)}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-surface/95 text-sm text-foreground shadow-sm ring-1 ring-black/5"
                  aria-label={copy.removeFile}
                  title={copy.removeFile}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {slotsLeft > 0 ? (
          <label className="mt-3 flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-black/10 bg-mint/20 px-4 py-6 text-center transition-colors hover:bg-mint/35">
            <span className="text-sm font-medium text-brand-teal">{copy.uploadPhotosVideos}</span>
            <span className="mt-1 text-xs text-muted">{copy.uploadHint}</span>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              multiple
              disabled={busy}
              className="sr-only"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />
          </label>
        ) : null}
      </div>

      <PhotoCropModal
        open={Boolean(cropSession)}
        sourceFile={cropSession?.file}
        sourceUrl={cropSession?.url}
        shape="rounded-square"
        saving={cropSaving || existingPhotoBusy}
        onClose={() => {
          if (cropSaving || existingPhotoBusy) return;
          if (cropSession?.replaceExistingId || typeof cropSession?.replaceIndex === "number") {
            setCropSession(null);
            return;
          }
          pendingImagesRef.current = [];
          setCropSession(null);
        }}
        onSave={saveCroppedPhoto}
      />
    </>
  );
}
