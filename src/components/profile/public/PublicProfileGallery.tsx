"use client";

import { PositionedPhoto } from "@/components/media/PositionedPhoto";
import { PhotoLightbox } from "@/components/media/PhotoLightbox";
import { useLanguage } from "@/context/LanguageContext";
import { DEFAULT_PHOTO_POSITION, type PhotoObjectPosition } from "@/lib/photo-position";
import { useState } from "react";

type PublicProfileGalleryProps = {
  photos: string[];
  photoPositions?: Record<string, PhotoObjectPosition>;
  displayName: string;
};

export function PublicProfileGallery({
  photos,
  photoPositions,
  displayName,
}: PublicProfileGalleryProps) {
  const { t } = useLanguage();
  const ui = t.publicProfileUi;
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
        <h2 className="text-sm font-semibold text-foreground">{ui.photos}</h2>
        <ul
          className="mt-2 flex flex-wrap gap-1.5"
          aria-label={ui.profilePhotosAria.replace("{name}", displayName)}
        >
          {urls.map((url, index) => (
            <li key={url}>
              <button
                type="button"
                className="relative h-14 w-14 overflow-hidden rounded-lg ring-1 ring-black/5 transition hover:ring-brand-teal/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal sm:h-16 sm:w-16"
                aria-label={ui.viewPhoto
                  .replace("{name}", displayName)
                  .replace("{n}", String(index + 1))}
                onClick={() => openAt(index)}
              >
                <PositionedPhoto
                  src={url}
                  alt=""
                  seed={url}
                  position={photoPositions?.[url] ?? DEFAULT_PHOTO_POSITION}
                  fallbackCaption={displayName}
                  sizes="64px"
                  className="h-full w-full"
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
