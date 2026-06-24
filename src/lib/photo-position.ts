/** CSS object-position + scale metadata for profile and pet photos. */

import { baseCoverScale, type CropTransform } from "@/lib/image-crop";
import type { CSSProperties } from "react";

export type PhotoObjectPosition = {
  objectPositionX: number;
  objectPositionY: number;
  photoScale?: number;
};

export type PhotoCropSaveResult = {
  file: File;
  position: PhotoObjectPosition;
};

export const DEFAULT_PHOTO_POSITION: PhotoObjectPosition = {
  objectPositionX: 50,
  objectPositionY: 50,
  photoScale: 1,
};

const MIN_SCALE = 1;
const MAX_SCALE = 3;

export function clampPhotoScale(scale: number | undefined): number {
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale ?? 1));
}

export function clampPhotoPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/** Backward-compatible parse — Y-only legacy values default X to 50%. */
export function normalizePhotoPosition(
  input?: Partial<PhotoObjectPosition> | null,
): PhotoObjectPosition {
  if (!input) return { ...DEFAULT_PHOTO_POSITION };

  const objectPositionY =
    typeof input.objectPositionY === "number" && Number.isFinite(input.objectPositionY)
      ? clampPhotoPercent(input.objectPositionY)
      : DEFAULT_PHOTO_POSITION.objectPositionY;

  const objectPositionX =
    typeof input.objectPositionX === "number" && Number.isFinite(input.objectPositionX)
      ? clampPhotoPercent(input.objectPositionX)
      : DEFAULT_PHOTO_POSITION.objectPositionX;

  return {
    objectPositionX,
    objectPositionY,
    photoScale: clampPhotoScale(input.photoScale),
  };
}

export function parsePhotoPosition(raw: unknown): PhotoObjectPosition | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const hasX = typeof o.objectPositionX === "number";
  const hasY = typeof o.objectPositionY === "number";
  const hasScale = typeof o.photoScale === "number";
  if (!hasX && !hasY && !hasScale) return null;
  return normalizePhotoPosition({
    objectPositionX: hasX ? (o.objectPositionX as number) : undefined,
    objectPositionY: hasY ? (o.objectPositionY as number) : undefined,
    photoScale: hasScale ? (o.photoScale as number) : undefined,
  });
}

export function photoPositionStyle(position?: Partial<PhotoObjectPosition> | null): CSSProperties {
  const normalized = normalizePhotoPosition(position);
  const scale = normalized.photoScale ?? 1;
  const style: CSSProperties = {
    objectPosition: `${normalized.objectPositionX}% ${normalized.objectPositionY}%`,
  };
  if (scale > 1) {
    style.transform = `scale(${scale})`;
    style.transformOrigin = `${normalized.objectPositionX}% ${normalized.objectPositionY}%`;
  }
  return style;
}

/** Minimum zoom so both axes can be repositioned in a square crop editor. */
export function minScaleForDualAxisPan(
  imageWidth: number,
  imageHeight: number,
  viewportSize: number,
): number {
  const cover = baseCoverScale(imageWidth, imageHeight, viewportSize);
  const minScaled = Math.min(imageWidth * cover, imageHeight * cover);
  if (minScaled <= 0) return 1;
  return Math.max(1, viewportSize / minScaled + 0.001);
}

export function clampPhotoObjectPosition(
  imageWidth: number,
  imageHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  position: PhotoObjectPosition,
): PhotoObjectPosition {
  const scale = clampPhotoScale(position.photoScale);
  const cover =
    baseCoverScale(imageWidth, imageHeight, Math.min(viewportWidth, viewportHeight)) * scale;
  const scaledW = imageWidth * cover;
  const scaledH = imageHeight * cover;
  const maxOffsetX = Math.max(0, scaledW / 2 - viewportWidth / 2);
  const maxOffsetY = Math.max(0, scaledH / 2 - viewportHeight / 2);

  const offsetX = ((50 - position.objectPositionX) / 100) * scaledW;
  const offsetY = ((50 - position.objectPositionY) / 100) * scaledH;
  const clampedOffsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, offsetX));
  const clampedOffsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, offsetY));

  return {
    objectPositionX: clampPhotoPercent(50 - (clampedOffsetX / scaledW) * 100),
    objectPositionY: clampPhotoPercent(50 - (clampedOffsetY / scaledH) * 100),
    photoScale: scale,
  };
}

export function initialPhotoObjectPosition(
  imageWidth: number,
  imageHeight: number,
  viewportSize: number,
  existing?: Partial<PhotoObjectPosition> | null,
): PhotoObjectPosition {
  const minScale = minScaleForDualAxisPan(imageWidth, imageHeight, viewportSize);
  const base = normalizePhotoPosition(existing);
  const photoScale = Math.max(minScale, base.photoScale ?? 1);
  return clampPhotoObjectPosition(imageWidth, imageHeight, viewportSize, viewportSize, {
    ...base,
    photoScale,
  });
}

export function applyPhotoDragDelta(
  start: PhotoObjectPosition,
  deltaX: number,
  deltaY: number,
  imageWidth: number,
  imageHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): PhotoObjectPosition {
  const scale = clampPhotoScale(start.photoScale);
  const cover =
    baseCoverScale(imageWidth, imageHeight, Math.min(viewportWidth, viewportHeight)) * scale;
  const scaledW = imageWidth * cover;
  const scaledH = imageHeight * cover;

  return clampPhotoObjectPosition(imageWidth, imageHeight, viewportWidth, viewportHeight, {
    objectPositionX: start.objectPositionX - (deltaX / scaledW) * 100,
    objectPositionY: start.objectPositionY - (deltaY / scaledH) * 100,
    photoScale: scale,
  });
}

export function cropTransformToPhotoPosition(
  transform: CropTransform,
  imageWidth: number,
  imageHeight: number,
  viewportSize: number,
): PhotoObjectPosition {
  const scale = clampPhotoScale(transform.scale);
  const cover = baseCoverScale(imageWidth, imageHeight, viewportSize) * scale;
  const scaledW = imageWidth * cover;
  const scaledH = imageHeight * cover;

  return clampPhotoObjectPosition(imageWidth, imageHeight, viewportSize, viewportSize, {
    objectPositionX: 50 - (transform.offsetX / scaledW) * 100,
    objectPositionY: 50 - (transform.offsetY / scaledH) * 100,
    photoScale: scale,
  });
}

export function photoPositionToCropTransform(
  position: PhotoObjectPosition,
  imageWidth: number,
  imageHeight: number,
  viewportSize: number,
): CropTransform {
  const scale = clampPhotoScale(position.photoScale);
  const cover = baseCoverScale(imageWidth, imageHeight, viewportSize) * scale;
  const scaledW = imageWidth * cover;
  const scaledH = imageHeight * cover;

  return {
    scale,
    offsetX: ((50 - position.objectPositionX) / 100) * scaledW,
    offsetY: ((50 - position.objectPositionY) / 100) * scaledH,
  };
}

export function avatarPositionFromDetails(detailsRaw: unknown): PhotoObjectPosition {
  if (!detailsRaw || typeof detailsRaw !== "object" || Array.isArray(detailsRaw)) {
    return { ...DEFAULT_PHOTO_POSITION };
  }
  const parsed = parsePhotoPosition((detailsRaw as Record<string, unknown>).avatar_position);
  return parsed ?? { ...DEFAULT_PHOTO_POSITION };
}

export function galleryPositionFromDetails(
  detailsRaw: unknown,
  url: string,
): PhotoObjectPosition {
  if (!detailsRaw || typeof detailsRaw !== "object" || Array.isArray(detailsRaw)) {
    return { ...DEFAULT_PHOTO_POSITION };
  }
  const map = (detailsRaw as Record<string, unknown>).profile_photo_positions;
  if (!map || typeof map !== "object" || Array.isArray(map)) {
    return { ...DEFAULT_PHOTO_POSITION };
  }
  const parsed = parsePhotoPosition((map as Record<string, unknown>)[url]);
  return parsed ?? { ...DEFAULT_PHOTO_POSITION };
}

export function photoPositionFromPetRow(row: {
  object_position_x?: unknown;
  object_position_y?: unknown;
  photo_scale?: unknown;
}): PhotoObjectPosition {
  const hasX = typeof row.object_position_x === "number";
  const hasY = typeof row.object_position_y === "number";
  const hasScale = typeof row.photo_scale === "number";
  if (!hasX && !hasY && !hasScale) return { ...DEFAULT_PHOTO_POSITION };
  return normalizePhotoPosition({
    objectPositionX: hasX ? (row.object_position_x as number) : undefined,
    objectPositionY: hasY ? (row.object_position_y as number) : undefined,
    photoScale: hasScale ? (row.photo_scale as number) : undefined,
  });
}
