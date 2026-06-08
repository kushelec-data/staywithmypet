"use client";

import { PhotoCropModal } from "@/components/media/PhotoCropModal";
import { Button } from "@/components/ui/Button";
import { validateCropSourceFile } from "@/lib/image-crop";
import { uploadProfileAvatar } from "@/lib/profile-avatar";
import { profileInitials } from "@/lib/profile-utils";
import { createClient } from "@/lib/supabase";
import { useMemo, useRef, useState } from "react";

type ProfileAvatarUploadProps = {
  userId: string;
  displayName: string;
  email?: string | null;
  avatarUrl: string | null;
  onAvatarUpdated: (avatarUrl: string) => void;
  /** When false, only the photo is shown (view mode). */
  editable?: boolean;
  disabled?: boolean;
};

type CropSession = {
  file?: File;
  url?: string;
} | null;

export function ProfileAvatarUpload({
  userId,
  displayName,
  email,
  avatarUrl,
  onAvatarUpdated,
  editable = true,
  disabled = false,
}: ProfileAvatarUploadProps) {
  const supabase = useMemo(() => createClient(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cropSession, setCropSession] = useState<CropSession>(null);

  const initials = profileInitials(displayName, email);
  const shownUrl = previewUrl ?? avatarUrl;

  function openCrop(file?: File, url?: string) {
    if (!editable || disabled || uploading) return;
    setError(null);
    try {
      if (file) validateCropSourceFile(file);
      setCropSession({ file, url });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open photo editor.");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleFileSelected(file: File | undefined) {
    if (!file || !editable || disabled || uploading) return;
    openCrop(file);
  }

  async function saveCroppedPhoto(file: File) {
    setError(null);
    setUploading(true);
    try {
      const updated = await uploadProfileAvatar(supabase, userId, file);
      setPreviewUrl(updated.avatar_url);
      if (updated.avatar_url) {
        onAvatarUpdated(updated.avatar_url);
      }
      setCropSession(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload profile photo.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        {shownUrl ? (
          <img
            src={shownUrl}
            alt=""
            className="h-24 w-24 shrink-0 rounded-2xl object-cover ring-2 ring-mint/50 shadow-md sm:h-28 sm:w-28"
          />
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-lavender/60 text-3xl font-semibold text-brand-teal shadow-md sm:h-28 sm:w-28">
            {initials}
          </div>
        )}

        <div className="min-w-0">
          <p className="form-field-label">Profile photo</p>
          {editable ? (
            <>
              <p className="mt-1 text-xs text-muted">JPG, PNG, or WebP · max 5 MB</p>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                className="sr-only"
                disabled={disabled || uploading}
                onChange={(e) => handleFileSelected(e.target.files?.[0])}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled || uploading}
                  onClick={() => inputRef.current?.click()}
                >
                  {uploading ? "Uploading…" : "Upload profile photo"}
                </Button>
                {shownUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled || uploading}
                    onClick={() => openCrop(undefined, shownUrl)}
                  >
                    Edit photo
                  </Button>
                ) : null}
              </div>
              {error ? (
                <p className="mt-2 text-xs text-brand-pink" role="alert">
                  {error}
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <PhotoCropModal
        open={editable && Boolean(cropSession)}
        sourceFile={cropSession?.file}
        sourceUrl={cropSession?.url}
        shape="circle"
        saving={uploading}
        onClose={() => {
          if (!uploading) setCropSession(null);
        }}
        onSave={saveCroppedPhoto}
      />
    </>
  );
}
