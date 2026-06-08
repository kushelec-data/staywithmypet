"use client";

import { PhotoLightbox } from "@/components/media/PhotoLightbox";
import { AppImage } from "@/components/ui/AppImage";
import { useState } from "react";

type PublicProfileGalleryProps = {
  photos: string[];
  displayName: string;
};

export function PublicProfileGallery({ photos, displayName }: PublicProfileGalleryProps) {
  const urls = photos.filter((u) => u.trim()).slice(0, 6);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (!urls.length) return null;

  function openAt(index: number) {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }

  return (
    <>
      <section className="card-elevated rounded-2xl p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-foreground">Photos</h2>
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={`${displayName} profile photos`}>
          {urls.map((url, index) => (
            <li key={url}>
              <button
                type="button"
                className="relative h-14 w-14 overflow-hidden rounded-lg ring-1 ring-black/5 transition hover:ring-brand-teal/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal sm:h-16 sm:w-16"
                aria-label={`View ${displayName} photo ${index + 1}`}
                onClick={() => openAt(index)}
              >
                <AppImage
                  src={url}
                  alt=""
                  seed={url}
                  fallbackCaption={displayName}
                  sizes="64px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <PhotoLightbox
        photos={urls}
        open={lightboxOpen}
        initialIndex={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
        altPrefix={displayName}
      />
    </>
  );
}
