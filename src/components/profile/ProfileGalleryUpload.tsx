"use client";

import { Button } from "@/components/ui/Button";
import {
  MAX_PROFILE_GALLERY_PHOTOS,
  profilePhotosFromDetails,
  removeProfileGalleryPhoto,
  setMainProfilePhoto,
  uploadProfileGalleryPhoto,
} from "@/lib/profile-gallery";
import { createClient } from "@/lib/supabase";
import type { ProfileRow } from "@/lib/profile-utils";
import { useMemo, useRef, useState } from "react";

type ProfileGalleryUploadProps = {
  userId: string;
  profile: ProfileRow | null;
  avatarUrl: string | null;
  onProfileUpdated: (profile: ProfileRow) => void;
  disabled?: boolean;
};

export function ProfileGalleryUpload({
  userId,
  profile,
  avatarUrl,
  onProfileUpdated,
  disabled = false,
}: ProfileGalleryUploadProps) {
  const supabase = useMemo(() => createClient(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const photos = profilePhotosFromDetails(profile?.details ?? {});
  const slotsLeft = MAX_PROFILE_GALLERY_PHOTOS - photos.length;
  const mainUrl = avatarUrl?.trim() || null;

  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    if (disabled || busy) return;
    setError(null);
    setBusy(true);
    try {
      return await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      return undefined;
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length || slotsLeft <= 0) return;
    const files = Array.from(fileList).slice(0, slotsLeft);
    let currentPhotos = photos;
    let currentAvatar = mainUrl;

    for (const file of files) {
      const updated = await run(() =>
        uploadProfileGalleryPhoto(supabase, userId, file, {
          currentPhotos,
          currentAvatarUrl: currentAvatar,
        }),
      );
      if (!updated) break;
      onProfileUpdated(updated);
      currentPhotos = profilePhotosFromDetails(updated.details);
      currentAvatar = updated.avatar_url;
    }
  }

  return (
    <div className="sm:col-span-2">
      <p className="form-field-label">Profile photos</p>
      <p className="mt-1 text-xs text-muted">
        Upload up to {MAX_PROFILE_GALLERY_PHOTOS} photos. Choose one as your main profile photo.
      </p>

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
                <img src={url} alt="" className="aspect-square w-full object-cover" />
                {isMain ? (
                  <span className="absolute left-2 top-2 rounded-full bg-brand-teal px-2 py-0.5 text-[0.65rem] font-semibold text-white">
                    Main
                  </span>
                ) : null}
                <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1 bg-gradient-to-t from-black/70 to-transparent p-2">
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
                      Set main
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
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        multiple
        className="sr-only"
        disabled={disabled || busy || slotsLeft <= 0}
        onChange={(e) => void handleFiles(e.target.files)}
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
          {busy ? "Uploading…" : `Add photos (${slotsLeft} left)`}
        </Button>
      ) : (
        <p className="mt-3 text-xs text-muted">Maximum {MAX_PROFILE_GALLERY_PHOTOS} photos reached.</p>
      )}

      {error ? (
        <p className="mt-2 text-xs text-brand-pink" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
