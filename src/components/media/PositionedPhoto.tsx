"use client";

import { AppImage } from "@/components/ui/AppImage";
import {
  normalizePhotoPosition,
  photoPositionStyle,
  type PhotoObjectPosition,
} from "@/lib/photo-position";
import type { ComponentProps } from "react";

type PositionedPhotoProps = Omit<ComponentProps<typeof AppImage>, "style"> & {
  position?: Partial<PhotoObjectPosition> | null;
  /** When false, render a plain img (for crop editor / local blob previews). */
  useAppImage?: boolean;
};

/** object-cover photo with saved X/Y focal point and optional zoom scale. */
export function PositionedPhoto({
  position,
  className = "object-cover",
  useAppImage = true,
  ...props
}: PositionedPhotoProps) {
  const normalized = normalizePhotoPosition(position);
  const style = photoPositionStyle(normalized);
  const mergedClassName = `h-full w-full object-cover ${className}`.trim();

  if (!useAppImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- crop editor preview
      <img
        src={props.src}
        alt={props.alt}
        className={mergedClassName}
        style={style}
        draggable={false}
      />
    );
  }

  return <AppImage {...props} className={mergedClassName} style={style} />;
}
