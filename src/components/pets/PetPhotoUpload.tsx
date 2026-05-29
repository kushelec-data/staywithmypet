"use client";

import { MAX_PET_PHOTOS } from "@/lib/pet-photos";
import { useEffect, useRef, useState } from "react";

type PetPhotoUploadProps = {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  /** When true, media is optional (edit mode). */
  optional?: boolean;
};

export function PetPhotoUpload({ files, onChange, disabled, optional }: PetPhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [pickError, setPickError] = useState<string | null>(null);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  function handleFilesSelected(selected: FileList | null) {
    if (!selected?.length) return;
    setPickError(null);

    const next = [...files, ...Array.from(selected)].slice(0, MAX_PET_PHOTOS);
    if (files.length + selected.length > MAX_PET_PHOTOS) {
      setPickError(`You can add up to ${MAX_PET_PHOTOS} files.`);
    }
    onChange(next);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeAt(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div className="sm:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="form-field-label">Photos & videos</span>
        <span className="text-xs text-muted">
          {files.length}/{MAX_PET_PHOTOS}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted">
        {optional
          ? "Add new files to replace or extend the gallery (optional)."
          : "Add 1–6 photos or videos. The first file is the main listing image."}
      </p>

      {pickError ? (
        <p className="mt-2 text-xs text-brand-pink" role="alert">
          {pickError}
        </p>
      ) : null}

      {previews.length > 0 ? (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {previews.map((src, index) => (
            <li key={src} className="relative aspect-square overflow-hidden rounded-2xl border border-black/5">
              {files[index]?.type.startsWith("video/") ? (
                <video src={src} className="h-full w-full object-cover" muted playsInline />
              ) : (
                <img src={src} alt="" className="h-full w-full object-cover" />
              )}
              {index === 0 ? (
                <span className="absolute left-2 top-2 rounded-full bg-brand-teal px-2 py-0.5 text-[0.65rem] font-semibold text-white">
                  Main
                </span>
              ) : null}
              <button
                type="button"
                disabled={disabled}
                onClick={() => removeAt(index)}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-surface/95 text-sm text-foreground shadow-sm ring-1 ring-black/5"
                aria-label="Remove file"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {files.length < MAX_PET_PHOTOS ? (
        <label className="mt-3 flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-black/10 bg-mint/20 px-4 py-6 text-center transition-colors hover:bg-mint/35">
          <span className="text-sm font-medium text-brand-teal">Upload photos or videos</span>
          <span className="mt-1 text-xs text-muted">Images or MP4/WebM · max 25 MB each</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
            multiple
            disabled={disabled}
            className="sr-only"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
        </label>
      ) : null}
    </div>
  );
}
