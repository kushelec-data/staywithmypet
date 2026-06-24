"use client";

import { PhotoCropModal } from "@/components/media/PhotoCropModal";
import { Button } from "@/components/ui/Button";
import { validateCropSourceFile } from "@/lib/image-crop";
import { galleryPositionFromDetails, type PhotoCropSaveResult } from "@/lib/photo-position";
import { parseProfileDetails } from "@/lib/profile-details";
import { PositionedPhoto } from "@/components/media/PositionedPhoto";
import {
  MAX_PROFILE_GALLERY_PHOTOS,
  profilePhotosFromDetails,
  removeProfileGalleryPhoto,
  replaceProfileGalleryPhoto,
  setMainProfilePhoto,
  uploadProfileGalleryPhoto,
} from "@/lib/profile-gallery";
import { useLanguage } from "@/context/LanguageContext";
import { createClient } from "@/lib/supabase";
import type { ProfileRow } from "@/lib/profile-utils";
import { useMemo, useRef, useState } from "react";

type ProfileGalleryUploadProps = {
  userId: string;
  profile: ProfileRow | null;
  avatarUrl: string | null;
  onProfileUpdated: (profile: ProfileRow) => void;
  /** When false, only photos are shown (view mode). */
  editable?: boolean;
  disabled?: boolean;
};

type CropSession = {
  file?: File;
  url?: string;
  replaceUrl?: string;
} | null;

export function ProfileGalleryUpload({
  userId,
  profile,
  avatarUrl,
  onProfileUpdated,
  editable = true,
  disabled = false,
}: ProfileGalleryUploadProps) {
  const { t } = useLanguage();
  const supabase = useMemo(() => createClient(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingUploadsRef = useRef<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropSession, setCropSession] = useState<CropSession>(null);

  const photos = profilePhotosFromDetails(profile?.details ?? {});
  const profileDetails = parseProfileDetails(profile?.details);
  const slotsLeft = MAX_PROFILE_GALLERY_PHOTOS - photos.length;
  const mainUrl = avatarUrl?.trim() || null;
  const uploadContextRef = useRef({ photos, mainUrl });

  uploadContextRef.current = { photos, mainUrl };

  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    if (!editable || disabled || busy) return;
    setError(null);
    setBusy(true);
    try {
      return await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.profileEdit.gallery.genericError);
      return undefined;
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function openNextPendingUpload() {
    const next = pendingUploadsRef.current.shift();
    if (next) {
      setCropSession({ file: next });
    } else {
      setCropSession(null);
    }
  }

  function queueUploads(fileList: FileList | null) {
    if (!editable || !fileList?.length || slotsLeft <= 0) return;
    setError(null);

    const files = Array.from(fileList).slice(0, slotsLeft);
    const validFiles: File[] = [];

    for (const file of files) {
      try {
        validateCropSourceFile(file);
        validFiles.push(file);
      } catch (err) {
        setError(err instanceof Error ? err.message : t.media.openEditorError);
      }
    }

    if (validFiles.length === 0) {
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    pendingUploadsRef.current = [...pendingUploadsRef.current, ...validFiles];
    if (!cropSession) {
      openNextPendingUpload();
    }
  }

  function openReplaceCrop(url: string) {
    if (!editable || disabled || busy) return;
    setError(null);
    setCropSession({ url, replaceUrl: url });
  }

  async function saveCroppedPhoto({ file, position }: PhotoCropSaveResult) {
    if (cropSession?.replaceUrl) {
      const updated = await run(() =>
        replaceProfileGalleryPhoto(supabase, userId, cropSession.replaceUrl!, file, {
          currentPhotos: photos,
          currentAvatarUrl: mainUrl,
          position,
        }),
      );
      if (updated) {
        onProfileUpdated(updated);
        setCropSession(null);
      }
      return;
    }

    const ctx = uploadContextRef.current;
    const updated = await run(() =>
      uploadProfileGalleryPhoto(supabase, userId, file, {
        currentPhotos: ctx.photos,
        currentAvatarUrl: ctx.mainUrl,
        position,
      }),
    );

    if (!updated) return;

    uploadContextRef.current = {
      photos: profilePhotosFromDetails(updated.details),
      mainUrl: updated.avatar_url,
    };
    onProfileUpdated(updated);

    if (pendingUploadsRef.current.length > 0) {
      openNextPendingUpload();
    } else {
      setCropSession(null);
    }
  }

  return (
    <>
      <div className={`sm:col-span-2 ${editable ? "mt-6 border-t border-black/5 pt-6" : "mt-4"}`}>
        <p className="form-field-label">{t.account.petsPage.profilePhotos}</p>
        {editable ? (
          <p className="mt-1 text-xs text-muted">
            {t.profileEdit.gallery.photosHint.replace("{max}", String(MAX_PROFILE_GALLERY_PHOTOS))}
          </p>
        ) : null}

        {photos.length > 0 ? (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((url) => {
              const isMain = mainUrl === url;
              return (
                <li
                  key={url}
                  className={`relative overflow-hidden rounded-2xl border-2 ${
                    isMain ? "border-brand-teal ring-2 ring-brand-teal/20" : "border-black/5"
                  }`}
                >
                  <PositionedPhoto
                    src={url}
                    alt=""
                    position={
                      profileDetails.profile_photo_positions?.[url] ??
                      galleryPositionFromDetails(profile?.details, url)
                    }
                    useAppImage={false}
                    className="aspect-square w-full"
                  />
                  {isMain ? (
                    <span className="absolute left-2 top-2 rounded-full bg-brand-teal px-2 py-0.5 text-[0.65rem] font-semibold text-white">
                      {t.profileEdit.gallery.mainBadge}
                    </span>
                  ) : null}
                  {editable ? (
                    <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <button
                        type="button"
                        disabled={disabled || busy}
                        className="rounded-lg bg-surface/95 px-2 py-1 text-[0.65rem] font-semibold text-foreground"
                        onClick={() => openReplaceCrop(url)}
                      >
                        {t.media.editPhoto}
                      </button>
                      {!isMain ? (
                        <button
                          type="button"
                          disabled={disabled || busy}
                          className="rounded-lg bg-surface/95 px-2 py-1 text-[0.65rem] font-semibold text-foreground"
                          onClick={() =>
                            void run(async () => {
                              const updated = await setMainProfilePhoto(supabase, userId, url, {
                                currentPhotos: photos,
                              });
                              if (updated) onProfileUpdated(updated);
                            })
                          }
                        >
                          {t.profileEdit.gallery.setMain}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={disabled || busy}
                        className="rounded-lg bg-brand-pink/90 px-2 py-1 text-[0.65rem] font-semibold text-white"
                        onClick={() =>
                          void run(async () => {
                            const updated = await removeProfileGalleryPhoto(supabase, userId, url, {
                              currentPhotos: photos,
                              currentAvatarUrl: mainUrl,
                            });
                            if (updated) onProfileUpdated(updated);
                          })
                        }
                      >
                        {t.profileEdit.gallery.remove}
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}

        {editable ? (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              multiple
              className="sr-only"
              disabled={disabled || busy || slotsLeft <= 0}
              onChange={(e) => queueUploads(e.target.files)}
            />

            {slotsLeft > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                disabled={disabled || busy}
                onClick={() => inputRef.current?.click()}
              >
                {busy
                  ? t.common.uploading
                  : t.profileEdit.gallery.addPhotos.replace("{count}", String(slotsLeft))}
              </Button>
            ) : (
              <p className="mt-3 text-xs text-muted">
                {t.profileEdit.gallery.maxPhotosReached.replace(
                  "{max}",
                  String(MAX_PROFILE_GALLERY_PHOTOS),
                )}
              </p>
            )}

            {error ? (
              <p className="mt-2 text-xs text-brand-pink" role="alert">
                {error}
              </p>
            ) : null}
          </>
        ) : null}
      </div>

      <PhotoCropModal
        open={editable && Boolean(cropSession)}
        sourceFile={cropSession?.file}
        sourceUrl={cropSession?.url}
        initialPosition={
          cropSession?.replaceUrl
            ? galleryPositionFromDetails(profile?.details, cropSession.replaceUrl)
            : undefined
        }
        shape="rounded-square"
        saving={busy}
        onClose={() => {
          if (busy) return;
          if (cropSession?.replaceUrl) {
            setCropSession(null);
            return;
          }
          pendingUploadsRef.current = [];
          setCropSession(null);
        }}
        onSave={saveCroppedPhoto}
      />
    </>
  );
}
