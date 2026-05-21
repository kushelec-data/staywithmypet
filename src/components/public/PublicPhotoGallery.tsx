"use client";

import { AppImage } from "@/components/ui/AppImage";
import { speciesEmoji, type PetSpecies } from "@/lib/pet-data";
import type { ReactNode } from "react";

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
  if (!urls.length) return null;

  const [hero, ...rest] = urls;
  const thumbs = rest.slice(0, 5);
  const compactThumbs = urls.length <= 3;

  return (
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
        {favoriteSlot ? (
          <div className="absolute right-3 top-3 z-10">{favoriteSlot}</div>
        ) : null}
      </div>

      {thumbs.length > 0 ? (
        <ul
          className={
            compactThumbs
              ? "flex gap-1.5 border-t border-black/5 p-2"
              : "grid grid-cols-4 gap-1.5 border-t border-black/5 p-2 sm:grid-cols-5"
          }
        >
          {thumbs.map((url, i) => (
            <li
              key={`${url}-${i}`}
              className={
                compactThumbs
                  ? "relative h-14 w-14 shrink-0 overflow-hidden rounded-lg"
                  : "relative aspect-[4/3] overflow-hidden rounded-lg"
              }
            >
              <AppImage
                src={url}
                alt=""
                seed={`${seed}-t-${i}`}
                fallbackEmoji={speciesEmoji(species)}
                sizes={compactThumbs ? "56px" : "120px"}
                className="h-full w-full object-cover"
              />
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
