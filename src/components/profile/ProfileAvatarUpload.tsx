"use client";

import { PhotoCropModal } from "@/components/media/PhotoCropModal";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { Button } from "@/components/ui/Button";
import { validateCropSourceFile } from "@/lib/image-crop";
import { PositionedPhoto } from "@/components/media/PositionedPhoto";
import {
  avatarPositionFromDetails,
  type PhotoCropSaveResult,
} from "@/lib/photo-position";
import { resolveSanitizedAvatarUrl } from "@/lib/profile-avatar-display";
import { uploadProfileAvatar } from "@/lib/profile-avatar";
import { useLanguage } from "@/context/LanguageContext";
import { createClient } from "@/lib/supabase";
import { useEffect, useMemo, useRef, useState } from "react";

type ProfileAvatarUploadProps = {
  userId: string;
  displayName: string;
  email?: string | null;
  avatarUrl: string | null;
  profileDetails?: unknown;
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
  profileDetails,
  onAvatarUpdated,
  editable = true,
  disabled = false,
}: ProfileAvatarUploadProps) {
  const { t } = useLanguage();
  const supabase = useMemo(() => createClient(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cropSession, setCropSession] = useState<CropSession>(null);

  useEffect(() => {
    setPreviewUrl(null);
    setCropSession(null);
    setError(null);
  }, [userId]);

  const safeAvatarUrl = resolveSanitizedAvatarUrl(userId, avatarUrl);
  const shownUrl = previewUrl ?? safeAvatarUrl;
  const avatarPosition = avatarPositionFromDetails(profileDetails);

  function openCrop(file?: File, url?: string) {
    if (!editable || disabled || uploading) return;
    setError(null);
    try {
      if (file) validateCropSourceFile(file);
      setCropSession({ file, url });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.media.openEditorError);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleFileSelected(file: File | undefined) {
    if (!file || !editable || disabled || uploading) return;
    openCrop(file);
  }

  async function saveCroppedPhoto({ file, position }: PhotoCropSaveResult) {
    setError(null);
    setUploading(true);
    try {
      const updated = await uploadProfileAvatar(supabase, userId, file, position);
      const canonicalUrl = updated.avatar_url?.trim() || null;
      const nextUrl = resolveSanitizedAvatarUrl(userId, canonicalUrl) ?? canonicalUrl;
      if (nextUrl) {
        const preview = `${nextUrl}${nextUrl.includes("?") ? "&" : "?"}v=${Date.now()}`;
        setPreviewUrl(preview);
        onAvatarUpdated(canonicalUrl ?? nextUrl);
      } else {
        console.error("[avatar-upload] preview url missing after successful upload", { canonicalUrl });
        setError(t.media.uploadAvatarError);
      }
      setCropSession(null);
    } catch (err) {
      console.error("[avatar-upload] error", err);
      if (err instanceof Error && err.message.trim()) {
        setError(err.message);
      } else {
        setError(t.media.uploadAvatarError);
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        {shownUrl ? (
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl ring-2 ring-mint/50 shadow-md sm:h-28 sm:w-28">
            <PositionedPhoto
              src={shownUrl}
              alt=""
              position={avatarPosition}
              useAppImage={false}
              className="block h-full w-full"
            />
          </div>
        ) : (
          <ProfileAvatar
            userId={userId}
            displayName={displayName}
            email={email}
            avatarUrl={null}
            size="xl"
            shape="rounded"
            className="ring-2 ring-mint/50 shadow-md"
          />
        )}

        <div className="min-w-0">
          <p className="form-field-label">{t.account.petsPage.profilePhoto}</p>
          {editable ? (
            <>
              <p className="mt-1 text-xs text-muted">{t.account.petsPage.photoFormatHint}</p>
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
                  {uploading ? t.common.uploading : t.account.petsPage.uploadProfilePhoto}
                </Button>
                {shownUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled || uploading}
                    onClick={() => openCrop(undefined, shownUrl)}
                  >
                    {t.media.editPhoto}
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
        initialPosition={cropSession?.url ? avatarPosition : undefined}
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
