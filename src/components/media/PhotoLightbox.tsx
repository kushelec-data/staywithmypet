"use client";

import { useLanguage } from "@/context/LanguageContext";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type PhotoLightboxProps = {
  photos: string[];
  open: boolean;
  initialIndex?: number;
  onClose: () => void;
  /** Prefix for image alt text, e.g. member or pet name. */
  altPrefix: string;
};

const SWIPE_THRESHOLD_PX = 48;

export function PhotoLightbox({
  photos,
  open,
  initialIndex = 0,
  onClose,
  altPrefix,
}: PhotoLightboxProps) {
  const { t } = useLanguage();
  const media = t.media;
  const urls = photos.filter((url) => url.trim());
  const [index, setIndex] = useState(initialIndex);
  const touchStartX = useRef<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) setIndex(Math.min(Math.max(initialIndex, 0), Math.max(urls.length - 1, 0)));
  }, [open, initialIndex, urls.length]);

  const goPrev = useCallback(() => {
    if (urls.length <= 1) return;
    setIndex((current) => (current - 1 + urls.length) % urls.length);
  }, [urls.length]);

  const goNext = useCallback(() => {
    if (urls.length <= 1) return;
    setIndex((current) => (current + 1) % urls.length);
  }, [urls.length]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose, goPrev, goNext]);

  if (!open || urls.length === 0) return null;

  const currentUrl = urls[index]!;
  const hasMultiple = urls.length > 1;

  function handleTouchStart(event: React.TouchEvent) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: React.TouchEvent) {
    const startX = touchStartX.current;
    touchStartX.current = null;
    if (startX == null || urls.length <= 1) return;

    const endX = event.changedTouches[0]?.clientX;
    if (endX == null) return;

    const delta = endX - startX;
    if (delta > SWIPE_THRESHOLD_PX) goPrev();
    else if (delta < -SWIPE_THRESHOLD_PX) goNext();
  }

  const modal = (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`${altPrefix} photos`}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-black/80"
        aria-label={media.closePhotoViewer}
        onClick={onClose}
      />

      <div
        className="relative z-10 flex w-full max-w-5xl flex-col items-center gap-3"
        onClick={(event) => event.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex w-full items-center justify-end">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="inline-flex h-10 min-w-10 items-center justify-center rounded-full bg-black/50 px-3 text-sm font-semibold text-white ring-1 ring-white/20 hover:bg-black/70"
            aria-label={t.common.close}
          >
            <span aria-hidden>×</span>
          </button>
        </div>

        <div className="relative flex w-full min-w-0 items-center justify-center">
          {hasMultiple ? (
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-0 z-20 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/50 text-lg text-white ring-1 ring-white/20 hover:bg-black/70 sm:-left-12"
              aria-label={media.previousPhoto}
            >
              ‹
            </button>
          ) : null}

          <figure className="mx-auto flex max-h-[min(78dvh,900px)] w-full min-w-0 max-w-full flex-col items-center justify-center">
            <img
              src={currentUrl}
              alt={`${altPrefix} ${media.photoOf.replace("{n}", String(index + 1)).replace("{total}", String(urls.length))}`}
              className="max-h-[min(78dvh,900px)] w-auto max-w-full rounded-xl object-contain shadow-2xl"
            />
            {hasMultiple ? (
              <figcaption className="mt-2 text-center text-xs font-medium text-white/90">
                {index + 1} / {urls.length}
              </figcaption>
            ) : null}
          </figure>

          {hasMultiple ? (
            <button
              type="button"
              onClick={goNext}
              className="absolute right-0 z-20 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/50 text-lg text-white ring-1 ring-white/20 hover:bg-black/70 sm:-right-12"
              aria-label={media.nextPhoto}
            >
              ›
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}
