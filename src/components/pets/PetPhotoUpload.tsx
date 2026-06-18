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

type UploadStatus = "uploading" | "saved" | "failed";

type PendingUploadItem = {
  localId: string;
  previewUrl: string;
  file: File;
  status: UploadStatus;
  error?: string;
};

type PetPhotoUploadProps = {
  petId?: string | null;
  disabled?: boolean;
  uploadDisabledMessage?: string;
  existingPhotos?: ExistingPetPhotoItem[];
  /** Local files for new pets before a profile exists. */
  pendingFiles?: File[];
  onPendingFilesChange?: (files: File[]) => void;
  onUploadPhoto?: (file: File) => Promise<void>;
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

function UploadStatusBadge({ status, errorLabel }: { status: UploadStatus; errorLabel?: string }) {
  const { t } = useLanguage();
  const copy = t.account.petsPage;

  if (status === "uploading") {
    return (
      <span className="absolute inset-x-2 bottom-2 rounded-lg bg-black/65 px-2 py-1 text-center text-[0.65rem] font-semibold text-white">
        {copy.photoUploading}
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span
        className="absolute inset-x-2 bottom-2 rounded-lg bg-brand-pink/90 px-2 py-1 text-center text-[0.65rem] font-semibold text-white"
        title={errorLabel}
      >
        {copy.photoUploadFailed}
      </span>
    );
  }

  return (
    <span className="absolute inset-x-2 bottom-2 rounded-lg bg-brand-teal/90 px-2 py-1 text-center text-[0.65rem] font-semibold text-white">
      {copy.photoSaved}
    </span>
  );
}

export function PetPhotoUpload({
  petId,
  disabled,
  uploadDisabledMessage,
  existingPhotos = [],
  pendingFiles = [],
  onPendingFilesChange,
  onUploadPhoto,
  onReplaceExistingPhoto,
  onRemoveExistingPhoto,
  onSetPrimaryExistingPhoto,
  existingPhotoBusy = false,
}: PetPhotoUploadProps) {
  const { t } = useLanguage();
  const copy = t.account.petsPage;
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingImagesRef = useRef<File[]>([]);
  const [localPreviews, setLocalPreviews] = useState<string[]>([]);
  const [pickError, setPickError] = useState<string | null>(null);
  const [cropSession, setCropSession] = useState<CropSession>(null);
  const [cropSaving, setCropSaving] = useState(false);
  const [removingExistingId, setRemovingExistingId] = useState<string | null>(null);
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null);
  const [pendingUploads, setPendingUploads] = useState<PendingUploadItem[]>([]);
  const [activeUploadCount, setActiveUploadCount] = useState(0);

  const immediateSaveEnabled = Boolean(petId && onUploadPhoto);
  const localModeEnabled = !immediateSaveEnabled && Boolean(onPendingFilesChange);
  const pendingUploadCount = pendingUploads.filter((item) => item.status !== "saved").length;
  const totalCount = existingPhotos.length + pendingFiles.length + pendingUploadCount;
  const slotsLeft = MAX_PET_PHOTOS - totalCount;
  const busy =
    disabled ||
    cropSaving ||
    existingPhotoBusy ||
    activeUploadCount > 0 ||
    Boolean(removingExistingId) ||
    Boolean(settingPrimaryId);
  const canDeleteExisting = totalCount > 1;
  const canDeleteLocal = totalCount > 1;

  useEffect(() => {
    if (!localModeEnabled) {
      setLocalPreviews([]);
      return;
    }
    const urls = pendingFiles.map((file) => URL.createObjectURL(file));
    setLocalPreviews(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [pendingFiles, localModeEnabled]);

  function openNextPendingImage() {
    const next = pendingImagesRef.current.shift();
    if (next) {
      setCropSession({ file: next });
    } else {
      setCropSession(null);
    }
  }

  function updatePendingUpload(localId: string, patch: Partial<PendingUploadItem>) {
    setPendingUploads((current) =>
      current.map((item) => (item.localId === localId ? { ...item, ...patch } : item)),
    );
  }

  function removePendingUpload(localId: string) {
    setPendingUploads((current) => {
      const target = current.find((item) => item.localId === localId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((item) => item.localId !== localId);
    });
  }

  async function uploadFileImmediately(file: File) {
    if (!onUploadPhoto || !immediateSaveEnabled) {
      throw new Error(uploadDisabledMessage ?? copy.mediaRequiresPet);
    }

    const localId = crypto.randomUUID();
    const previewUrl = URL.createObjectURL(file);
    setPendingUploads((current) => [
      ...current,
      { localId, previewUrl, file, status: "uploading" },
    ]);
    setActiveUploadCount((count) => count + 1);
    setPickError(null);

    try {
      await onUploadPhoto(file);
      updatePendingUpload(localId, { status: "saved" });
      window.setTimeout(() => removePendingUpload(localId), 800);
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.photoUploadFailed;
      updatePendingUpload(localId, { status: "failed", error: message });
      setPickError(message);
    } finally {
      setActiveUploadCount((count) => Math.max(0, count - 1));
    }
  }

  async function retryUpload(localId: string) {
    const item = pendingUploads.find((entry) => entry.localId === localId);
    if (!item || item.status !== "failed") return;
    removePendingUpload(localId);
    await uploadFileImmediately(item.file);
  }

  function addLocalFile(file: File) {
    if (!onPendingFilesChange) return;
    onPendingFilesChange([...pendingFiles, file].slice(0, MAX_PET_PHOTOS - existingPhotos.length));
  }

  function removeLocalAt(index: number) {
    if (!onPendingFilesChange || !canDeleteLocal) {
      if (!canDeleteLocal) setPickError(copy.cannotDeleteLastPhoto);
      return;
    }
    setPickError(null);
    onPendingFilesChange(pendingFiles.filter((_, i) => i !== index));
  }

  function setLocalPrimary(index: number) {
    if (!onPendingFilesChange || index <= 0 || index >= pendingFiles.length) return;
    const next = [...pendingFiles];
    const [picked] = next.splice(index, 1);
    if (!picked) return;
    next.unshift(picked);
    onPendingFilesChange(next);
  }

  function handleFilesSelected(selected: FileList | null) {
    if (!selected?.length || disabled) return;
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

    const slotsLeftNow = MAX_PET_PHOTOS - totalCount;
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

    if (immediateSaveEnabled) {
      for (const video of nextVideos) {
        void uploadFileImmediately(video);
      }
      if (validImages.length > 0) {
        pendingImagesRef.current = [...pendingImagesRef.current, ...validImages];
        if (!cropSession) openNextPendingImage();
      }
    } else if (localModeEnabled) {
      for (const video of nextVideos) {
        addLocalFile(video);
      }
      if (validImages.length > 0) {
        pendingImagesRef.current = [...pendingImagesRef.current, ...validImages];
        if (!cropSession) openNextPendingImage();
      }
    }

    if (inputRef.current) inputRef.current.value = "";
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
    const file = pendingFiles[index];
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

      if (typeof cropSession?.replaceIndex === "number" && onPendingFilesChange) {
        const next = [...pendingFiles];
        next[cropSession.replaceIndex] = cropped;
        onPendingFilesChange(next);
        setCropSession(null);
        if (pendingImagesRef.current.length > 0) openNextPendingImage();
        return;
      }

      if (immediateSaveEnabled) {
        await uploadFileImmediately(cropped);
      } else if (localModeEnabled) {
        addLocalFile(cropped);
      }

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

  const hint = immediateSaveEnabled
    ? copy.galleryHintAutosave
    : copy.galleryHintSaveFirst;

  return (
    <>
      <div className="sm:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="form-field-label">{copy.photosVideos}</span>
          <span className="text-xs text-muted">
            {totalCount}/{MAX_PET_PHOTOS}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted">{hint}</p>

        {!immediateSaveEnabled && uploadDisabledMessage ? (
          <p className="mt-2 rounded-xl border border-black/8 bg-cream/40 px-3 py-2 text-xs text-muted">
            {uploadDisabledMessage}
          </p>
        ) : null}

        {pickError ? (
          <p className="mt-2 text-xs text-brand-pink" role="alert">
            {pickError}
          </p>
        ) : null}

        {existingPhotos.length > 0 || pendingUploads.length > 0 || localPreviews.length > 0 ? (
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
            {pendingUploads.map((item) => (
              <li
                key={item.localId}
                className="relative aspect-square overflow-hidden rounded-2xl border border-black/5"
              >
                {item.file.type.startsWith("video/") ? (
                  <video src={item.previewUrl} className="h-full w-full object-cover" muted playsInline />
                ) : (
                  <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                )}
                <UploadStatusBadge status={item.status} errorLabel={item.error} />
                {item.status === "failed" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void retryUpload(item.localId)}
                    className="absolute right-2 top-2 rounded-full bg-surface/95 px-2 py-1 text-[0.65rem] font-semibold text-brand-teal shadow-sm ring-1 ring-black/5"
                  >
                    {copy.photoRetry}
                  </button>
                ) : null}
              </li>
            ))}
            {localPreviews.map((src, index) => {
              const isMain = existingPhotos.length === 0 && index === 0;
              return (
                <li
                  key={src}
                  className={`relative aspect-square overflow-hidden rounded-2xl border ${
                    isMain ? "border-brand-teal ring-2 ring-brand-teal/20" : "border-black/5"
                  }`}
                >
                  {pendingFiles[index]?.type.startsWith("video/") ? (
                    <video src={src} className="h-full w-full object-cover" muted playsInline />
                  ) : (
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  )}
                  {isMain ? (
                    <span className="absolute left-2 top-2 rounded-full bg-brand-teal px-2 py-0.5 text-[0.65rem] font-semibold text-white">
                      {copy.mainPhoto}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    disabled={busy || isMain}
                    onClick={() => setLocalPrimary(index)}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-surface/95 shadow-sm ring-1 ring-black/5"
                    aria-label={copy.setMainPhoto}
                    title={copy.setMainPhoto}
                  >
                    <StarIcon filled={isMain} />
                  </button>
                  {canDeleteLocal ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => removeLocalAt(index)}
                      className="absolute right-2 top-11 flex h-7 min-w-[4.5rem] items-center justify-center rounded-full bg-surface/95 px-2 text-[0.65rem] font-semibold text-brand-pink shadow-sm ring-1 ring-black/5"
                      aria-label={copy.deletePhoto}
                      title={copy.deletePhoto}
                    >
                      {copy.deletePhoto}
                    </button>
                  ) : null}
                  {pendingFiles[index] && isCropSupportedImageFile(pendingFiles[index]!) ? (
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
          <label
            className={`mt-3 flex min-h-[120px] flex-col items-center justify-center rounded-2xl border border-dashed border-black/10 bg-mint/20 px-4 py-6 text-center transition-colors ${
              busy ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-mint/35"
            }`}
          >
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
