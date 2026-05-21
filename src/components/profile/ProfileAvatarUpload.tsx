"use client";

import { Button } from "@/components/ui/Button";
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
  disabled?: boolean;
};

export function ProfileAvatarUpload({
  userId,
  displayName,
  email,
  avatarUrl,
  onAvatarUpdated,
  disabled = false,
}: ProfileAvatarUploadProps) {
  const supabase = useMemo(() => createClient(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const initials = profileInitials(displayName, email);
  const shownUrl = previewUrl ?? avatarUrl;

  async function handleFile(file: File | undefined) {
    if (!file || disabled || uploading) return;
    setError(null);
    setUploading(true);

    try {
      const updated = await uploadProfileAvatar(supabase, userId, file);
      setPreviewUrl(updated.avatar_url);
      if (updated.avatar_url) {
        onAvatarUpdated(updated.avatar_url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload profile photo.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
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
        <p className="text-sm font-medium text-foreground">Profile photo</p>
        <p className="mt-1 text-xs text-muted">JPG, PNG, or WebP · max 5 MB</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          className="sr-only"
          disabled={disabled || uploading}
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Uploading…" : "Upload profile photo"}
        </Button>
        {error ? (
          <p className="mt-2 text-xs text-brand-pink" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
