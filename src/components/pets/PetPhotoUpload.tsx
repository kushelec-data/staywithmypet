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
  onSetPrimaryExistingPhoto?: (photoId: string) => Promise<void>;
  existingPhotoBusy?: boolean;
};

type CropSession = {
  file?: File;
  url?: string;
  replaceIndex?: number;
  replaceExistingId?: string;
} | null;

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 ${filled ? "fill-brand-teal text-brand-teal" : "fill-none text-foreground/80"}`}
      aria-hidden
    >
      <path
        d="M12 2.5l2.86 5.8 6.4.93-4.63 4.52 1.09 6.37L12 17.77l-5.72 3.01 1.09-6.37-4.63-4.52 6.4-.93L12 2.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PetPhotoUpload({
  files,
  onChange,
  disabled,
  optional,
  existingPhotos = [],
  onReplaceExistingPhoto,
  onRemoveExistingPhoto,
  onSetPrimaryExistingPhoto,
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
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  const totalCount = files.length + existingPhotos.length;
  const slotsLeft = MAX_PET_PHOTOS - totalCount;
  const busy =
    disabled ||
    cropSaving ||
    existingPhotoBusy ||
    Boolean(removingExistingId) ||
    Boolean(settingPrimaryId);
  const canDeleteExisting = totalCount > 1;
  const pendingCanSetMain = existingPhotos.length === 0;

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

    const slotsLeftNow = MAX_PET_PHOTOS - files.length - existingPhotos.length;
    if (slotsLeftNow <= 0) {
      setPickError(copy.maxFilesError.replace("{max}", String(MAX_PET_PHOTOS)));
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const nextVideos = videos.slice(0, slotsLeftNow);
    const validImages: File[] = [];

    for (const file of images) {
      if (nextVideos.length + validImages.length >= slotsLeftNow) break;
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
    if (totalCount <= 1) {
      setPickError(copy.cannotDeleteLastPhoto);
      return;
    }
    setPickError(null);
    onChange(files.filter((_, i) => i !== index));
  }

  function setPendingPrimary(index: number) {
    if (!pendingCanSetMain || index <= 0 || index >= files.length) return;
    setPickError(null);
    const next = [...files];
    const [picked] = next.splice(index, 1);
    if (!picked) return;
    next.unshift(picked);
    onChange(next);
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

  async function setExistingPrimary(photoId: string) {
    if (!onSetPrimaryExistingPhoto || disabled || existingPhotoBusy || settingPrimaryId) return;
    const photo = existingPhotos.find((item) => item.id === photoId);
    if (!photo || photo.isPrimary) return;
    setPickError(null);
    setSettingPrimaryId(photoId);
    try {
      await onSetPrimaryExistingPhoto(photoId);
    } catch (err) {
      setPickError(err instanceof Error ? err.message : copy.setMainPhotoError);
    } finally {
      setSettingPrimaryId(null);
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
                className={`relative aspect-square overflow-hidden rounded-2xl border ${
                  photo.isPrimary ? "border-brand-teal ring-2 ring-brand-teal/20" : "border-black/5"
                }`}
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
                {onSetPrimaryExistingPhoto ? (
                  <button
                    type="button"
                    disabled={busy || photo.isPrimary}
                    onClick={() => void setExistingPrimary(photo.id)}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-surface/95 shadow-sm ring-1 ring-black/5"
                    aria-label={copy.setMainPhoto}
                    title={copy.setMainPhoto}
                  >
                    <StarIcon filled={photo.isPrimary} />
                  </button>
                ) : null}
                {!photo.isPrimary && onRemoveExistingPhoto && canDeleteExisting ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void removeExisting(photo.id)}
                    className="absolute right-2 top-11 flex h-7 min-w-[4.5rem] items-center justify-center rounded-full bg-surface/95 px-2 text-[0.65rem] font-semibold text-brand-pink shadow-sm ring-1 ring-black/5"
                    aria-label={copy.deletePhoto}
                    title={copy.deletePhoto}
                  >
                    {copy.deletePhoto}
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
            {previews.map((src, index) => {
              const isPendingMain = pendingCanSetMain && index === 0;
              return (
                <li
                  key={src}
                  className={`relative aspect-square overflow-hidden rounded-2xl border ${
                    isPendingMain ? "border-brand-teal ring-2 ring-brand-teal/20" : "border-black/5"
                  }`}
                >
                  {files[index]?.type.startsWith("video/") ? (
                    <video src={src} className="h-full w-full object-cover" muted playsInline />
                  ) : (
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  )}
                  {isPendingMain ? (
                    <span className="absolute left-2 top-2 rounded-full bg-brand-teal px-2 py-0.5 text-[0.65rem] font-semibold text-white">
                      {copy.mainPhoto}
                    </span>
                  ) : null}
                  {pendingCanSetMain ? (
                    <button
                      type="button"
                      disabled={busy || isPendingMain}
                      onClick={() => setPendingPrimary(index)}
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-surface/95 shadow-sm ring-1 ring-black/5"
                      aria-label={copy.setMainPhoto}
                      title={copy.setMainPhoto}
                    >
                      <StarIcon filled={isPendingMain} />
                    </button>
                  ) : null}
                  {totalCount > 1 ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => removeAt(index)}
                      className={`absolute flex h-7 min-w-[4.5rem] items-center justify-center rounded-full bg-surface/95 px-2 text-[0.65rem] font-semibold text-brand-pink shadow-sm ring-1 ring-black/5 ${
                        pendingCanSetMain ? "right-2 top-11" : "right-2 top-2"
                      }`}
                      aria-label={copy.deletePhoto}
                      title={copy.deletePhoto}
                    >
                      {copy.deletePhoto}
                    </button>
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
                </li>
              );
            })}
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
