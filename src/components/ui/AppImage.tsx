"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { CaptionImagePlaceholder } from "@/components/ui/CaptionImagePlaceholder";
import { PawPlaceholder } from "@/components/ui/PawPlaceholder";
import { canUseNextImage, shouldBypassNextImageOptimization } from "@/lib/remote-image";

type AppImageProps = Omit<ImageProps, "src" | "alt"> & {
  src: string;
  alt: string;
  seed?: string;
  fallbackCaption?: string;
  fallbackEmoji?: string;
  /** Text-only gradient fallback (no emoji) — for editorial / about imagery */
  captionOnlyFallback?: boolean;
};

export function AppImage({
  src,
  alt,
  seed,
  fallbackCaption,
  fallbackEmoji = "🐾",
  captionOnlyFallback = false,
  className = "object-cover",
  fill = true,
  style,
  unoptimized,
  ...props
}: AppImageProps) {
  const [failed, setFailed] = useState(false);
  const useNext = canUseNextImage(src);
  const skipOptimizer = Boolean(unoptimized) || shouldBypassNextImageOptimization(src);

  const positionClass = fill ? "absolute inset-0 h-full w-full" : "h-full w-full";

  if (!src?.trim() || failed) {
    if (captionOnlyFallback) {
      return (
        <CaptionImagePlaceholder
          seed={seed ?? alt}
          label={alt}
          caption={fallbackCaption ?? alt}
          className={`${positionClass} ${className}`}
        />
      );
    }
    return (
      <PawPlaceholder
        seed={seed ?? alt}
        label={alt}
        caption={fallbackCaption ?? alt}
        emoji={fallbackEmoji}
        className={`${positionClass} ${className}`}
      />
    );
  }

  if (!useNext) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- fallback for hosts not in next.config
      <img
        src={src}
        alt={alt}
        style={style}
        className={`${positionClass} ${className}`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      className={className}
      style={style}
      sizes={props.sizes ?? "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"}
      onError={() => setFailed(true)}
      {...props}
      unoptimized={skipOptimizer}
    />
  );
}
