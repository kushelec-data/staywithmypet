"use client";

import { useEffect, useRef, useState } from "react";
import { AppImage } from "@/components/ui/AppImage";
import { DOG_STORY_FALLBACK_IMAGE_SRC, DOG_STORY_VIDEO_SRC } from "@/lib/dog-story-assets";
import { DogStoryScene } from "@/components/marketing/DogStoryScene";

type DogStoryMediaProps = {
  hookMessage: string;
  animationAlt: string;
  className?: string;
};

export function DogStoryMedia({ hookMessage, animationAlt, className = "" }: DogStoryMediaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const showScene = !videoReady;
  const showFallbackImage = videoFailed && !videoReady;

  return (
    <div ref={containerRef} className={`relative w-full max-w-md ${className}`}>
      {showScene ? (
        showFallbackImage ? (
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl ring-1 ring-black/5">
            <AppImage
              src={DOG_STORY_FALLBACK_IMAGE_SRC}
              alt={animationAlt}
              seed="dog-story-fallback"
              captionOnlyFallback
              sizes="(max-width: 768px) 100vw, 28rem"
              className="object-cover"
            />
            <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-3">
              <span className="rounded-2xl bg-white/95 px-4 py-2 text-center text-sm font-semibold text-brand-teal shadow-md ring-1 ring-black/5">
                {hookMessage}
              </span>
            </div>
          </div>
        ) : (
          <DogStoryScene hookMessage={hookMessage} />
        )
      ) : null}

      {inView && !videoFailed ? (
        <video
          className={`aspect-[4/3] w-full rounded-2xl object-cover ring-1 ring-black/5 ${
            videoReady ? "relative" : "absolute inset-0 h-full w-full opacity-0"
          }`}
          src={DOG_STORY_VIDEO_SRC}
          muted
          autoPlay
          loop
          playsInline
          preload="none"
          aria-label={animationAlt}
          onLoadedData={() => setVideoReady(true)}
          onError={() => setVideoFailed(true)}
        />
      ) : null}
    </div>
  );
}
