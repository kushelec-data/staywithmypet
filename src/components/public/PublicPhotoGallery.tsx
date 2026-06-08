"use client";

import { PhotoLightbox } from "@/components/media/PhotoLightbox";
import { AppImage } from "@/components/ui/AppImage";
import { speciesEmoji, type PetSpecies } from "@/lib/pet-data";
import { useState, type ReactNode } from "react";

type PublicPhotoGalleryProps = {
  photos: string[];
  alt: string;
  seed: string;
  species?: PetSpecies;
  favoriteSlot?: ReactNode;
};

export function PublicPhotoGallery({
  photos,
  alt,
  seed,
  species = "dog",
  favoriteSlot,
}: PublicPhotoGalleryProps) {
  const urls = photos.filter(Boolean);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (!urls.length) return null;

  const [hero, ...rest] = urls;
  const thumbs = rest.slice(0, 5);
  const compactThumbs = urls.length <= 3;

  function openAt(index: number) {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }

  return (
    <>
      <article className="overflow-hidden rounded-2xl border border-black/5 bg-surface/90">
        <div className="relative h-[220px] max-h-[220px] w-full bg-mint/15 lg:h-[320px] lg:max-h-[320px]">
          <AppImage
            src={hero}
            alt={alt}
            seed={seed}
            fallbackEmoji={speciesEmoji(species)}
            fallbackCaption={alt}
            sizes="(max-width: 1024px) 100vw, 720px"
            className="h-full w-full object-cover"
          />
          <button
            type="button"
            className="absolute inset-0 z-[1]"
            aria-label={`View ${alt} photo 1`}
            onClick={() => openAt(0)}
          />
          {favoriteSlot ? <div className="absolute right-3 top-3 z-[2]">{favoriteSlot}</div> : null}
        </div>

        {thumbs.length > 0 ? (
          <ul
            className={
              compactThumbs
                ? "flex gap-1.5 border-t border-black/5 p-2"
                : "grid grid-cols-4 gap-1.5 border-t border-black/5 p-2 sm:grid-cols-5"
            }
          >
            {thumbs.map((url, i) => {
              const photoIndex = i + 1;
              return (
                <li
                  key={`${url}-${i}`}
                  className={
                    compactThumbs
                      ? "relative h-14 w-14 shrink-0 overflow-hidden rounded-lg"
                      : "relative aspect-[4/3] overflow-hidden rounded-lg"
                  }
                >
                  <button
                    type="button"
                    className="relative h-full w-full ring-1 ring-black/5 transition hover:ring-brand-teal/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
                    aria-label={`View ${alt} photo ${photoIndex + 1}`}
                    onClick={() => openAt(photoIndex)}
                  >
                    <AppImage
                      src={url}
                      alt=""
                      seed={`${seed}-t-${i}`}
                      fallbackEmoji={speciesEmoji(species)}
                      sizes={compactThumbs ? "56px" : "120px"}
                      className="h-full w-full object-cover"
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </article>

      <PhotoLightbox
        photos={urls}
        open={lightboxOpen}
        initialIndex={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
        altPrefix={alt}
      />
    </>
  );
}
