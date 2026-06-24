/** Client-side image crop, reposition, and compression helpers. */

export const CROP_OUTPUT_JPEG_QUALITY = 0.88;
export const CROP_MAX_OUTPUT_BYTES = 3 * 1024 * 1024;
export const CROP_MAX_INPUT_BYTES = 12 * 1024 * 1024;
export const PHOTO_LOAD_ERROR = "Photo could not be loaded. Please try another image.";

export type CropShape = "circle" | "rounded-square";

export type CropTransform = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

export type CropRenderOptions = {
  image: CanvasImageSource & { width: number; height: number };
  transform: CropTransform;
  viewportSize: number;
  outputSize: number;
  shape: CropShape;
  mimeType?: "image/jpeg" | "image/webp" | "image/png";
};

const DEFAULT_ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validateCropSourceFile(
  file: File,
  options?: { allowedTypes?: Set<string>; maxBytes?: number },
): void {
  const allowed = options?.allowedTypes ?? DEFAULT_ALLOWED;
  const maxBytes = options?.maxBytes ?? CROP_MAX_INPUT_BYTES;

  if (!allowed.has(file.type)) {
    throw new Error("Photo must be a JPG, PNG, or WebP image.");
  }
  if (file.size > maxBytes) {
    throw new Error("Photo is too large. Choose an image under 12 MB.");
  }
}

export function isCropSupportedImageFile(file: File): boolean {
  return DEFAULT_ALLOWED.has(file.type);
}

function loadImageFromObjectUrl(objectUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      if (img.naturalWidth <= 0 || img.naturalHeight <= 0) {
        reject(new Error(PHOTO_LOAD_ERROR));
        return;
      }
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(PHOTO_LOAD_ERROR));
    };

    img.src = objectUrl;
  });
}

export async function loadImageElement(source: File | string): Promise<HTMLImageElement> {
  if (source instanceof File) {
    validateCropSourceFile(source);
    return loadImageFromObjectUrl(URL.createObjectURL(source));
  }

  try {
    const response = await fetch(source, { mode: "cors", credentials: "omit", cache: "no-store" });
    if (!response.ok) {
      throw new Error(PHOTO_LOAD_ERROR);
    }
    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) {
      throw new Error(PHOTO_LOAD_ERROR);
    }
    return loadImageFromObjectUrl(URL.createObjectURL(blob));
  } catch (err) {
    if (err instanceof Error && err.message === PHOTO_LOAD_ERROR) {
      throw err;
    }
    throw new Error(PHOTO_LOAD_ERROR);
  }
}

export function baseCoverScale(
  imageWidth: number,
  imageHeight: number,
  viewportSize: number,
): number {
  return Math.max(viewportSize / imageWidth, viewportSize / imageHeight);
}

export function clampCropTransform(
  imageWidth: number,
  imageHeight: number,
  viewportSize: number,
  transform: CropTransform,
): CropTransform {
  const scale = Math.max(1, Math.min(3, transform.scale));
  const cover = baseCoverScale(imageWidth, imageHeight, viewportSize) * scale;
  const scaledW = imageWidth * cover;
  const scaledH = imageHeight * cover;
  const maxOffsetX = Math.max(0, scaledW / 2 - viewportSize / 2);
  const maxOffsetY = Math.max(0, scaledH / 2 - viewportSize / 2);

  return {
    scale,
    offsetX: Math.max(-maxOffsetX, Math.min(maxOffsetX, transform.offsetX)),
    offsetY: Math.max(-maxOffsetY, Math.min(maxOffsetY, transform.offsetY)),
  };
}

export function initialCropTransform(
  imageWidth: number,
  imageHeight: number,
  viewportSize: number,
): CropTransform {
  return clampCropTransform(imageWidth, imageHeight, viewportSize, {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });
}

/** Ensures enough zoom that both axes can be repositioned in the square editor. */
export function initialCropTransformForEditor(
  imageWidth: number,
  imageHeight: number,
  viewportSize: number,
  existing?: Partial<CropTransform>,
): CropTransform {
  const cover = baseCoverScale(imageWidth, imageHeight, viewportSize);
  const minScaled = Math.min(imageWidth * cover, imageHeight * cover);
  const minScale =
    minScaled > 0 ? Math.max(1, viewportSize / minScaled + 0.001) : 1;
  return clampCropTransform(imageWidth, imageHeight, viewportSize, {
    scale: Math.max(minScale, existing?.scale ?? 1),
    offsetX: existing?.offsetX ?? 0,
    offsetY: existing?.offsetY ?? 0,
  });
}

function drawCroppedImage(
  ctx: CanvasRenderingContext2D,
  options: CropRenderOptions,
  targetSize: number,
): void {
  const { image, transform, viewportSize, shape } = options;
  const pixelScale = targetSize / viewportSize;
  const cover = baseCoverScale(image.width, image.height, viewportSize) * transform.scale;
  const scaledW = image.width * cover * pixelScale;
  const scaledH = image.height * cover * pixelScale;
  const drawX = targetSize / 2 - scaledW / 2 + transform.offsetX * pixelScale;
  const drawY = targetSize / 2 - scaledH / 2 + transform.offsetY * pixelScale;

  ctx.clearRect(0, 0, targetSize, targetSize);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, targetSize, targetSize);

  if (shape === "circle") {
    ctx.save();
    ctx.beginPath();
    ctx.arc(targetSize / 2, targetSize / 2, targetSize / 2, 0, Math.PI * 2);
    ctx.clip();
  }

  ctx.drawImage(image, drawX, drawY, scaledW, scaledH);

  if (shape === "circle") {
    ctx.restore();
  }
}

export function renderCropPreviewCanvas(
  canvas: HTMLCanvasElement,
  options: CropRenderOptions,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare photo preview.");
  const size = options.viewportSize;
  if (canvas.width !== size) canvas.width = size;
  if (canvas.height !== size) canvas.height = size;
  drawCroppedImage(ctx, options, size);
}

export async function renderCroppedImageBlob(
  options: CropRenderOptions,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const targetSize = options.outputSize;
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare cropped photo.");

  drawCroppedImage(ctx, options, targetSize);

  const mimeType = options.mimeType ?? "image/jpeg";
  let quality = CROP_OUTPUT_JPEG_QUALITY;
  let blob = await canvasToBlob(canvas, mimeType, quality);

  if (blob.size <= CROP_MAX_OUTPUT_BYTES) {
    return blob;
  }

  for (let attempt = 0; attempt < 6 && blob.size > CROP_MAX_OUTPUT_BYTES; attempt += 1) {
    quality = Math.max(0.5, quality - 0.08);
    blob = await canvasToBlob(canvas, "image/jpeg", quality);
  }

  if (blob.size > CROP_MAX_OUTPUT_BYTES) {
    const smaller = Math.max(256, Math.floor(options.outputSize * 0.85));
    return renderCroppedImageBlob({ ...options, outputSize: smaller, mimeType: "image/jpeg" });
  }

  return blob;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not save cropped photo."));
          return;
        }
        resolve(blob);
      },
      type,
      quality,
    );
  });
}

export function blobToCropFile(blob: Blob, baseName: string, mimeType: string): File {
  const ext =
    mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const safeBase = baseName.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${safeBase}-cropped.${ext}`, { type: mimeType });
}

export function cropOutputMimeType(sourceType: string): "image/jpeg" | "image/webp" | "image/png" {
  if (sourceType === "image/png") return "image/png";
  if (sourceType === "image/webp") return "image/webp";
  return "image/jpeg";
}

export function cropOutputSize(shape: CropShape): number {
  return shape === "circle" ? 512 : 800;
}

export function cropImageDimensions(image: HTMLImageElement): { width: number; height: number } {
  return {
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
  };
}

const UPLOAD_MAX_DIMENSION = 2048;

/** Compress and optionally downscale the full image — no crop/reposition baked in. */
export async function compressImageForUpload(
  image: HTMLImageElement,
  mimeType: "image/jpeg" | "image/webp" | "image/png" = "image/jpeg",
  maxBytes: number = CROP_MAX_OUTPUT_BYTES,
): Promise<Blob> {
  const { width, height } = cropImageDimensions(image);
  const scale = Math.min(1, UPLOAD_MAX_DIMENSION / Math.max(width, height));
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare photo for upload.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(image, 0, 0, targetW, targetH);

  let quality = CROP_OUTPUT_JPEG_QUALITY;
  let blob = await canvasToBlob(canvas, mimeType, quality);

  if (blob.size <= maxBytes) return blob;

  for (let attempt = 0; attempt < 6 && blob.size > maxBytes; attempt += 1) {
    quality = Math.max(0.5, quality - 0.08);
    blob = await canvasToBlob(canvas, "image/jpeg", quality);
  }

  if (blob.size > maxBytes) {
    const smaller = Math.max(256, Math.floor(Math.max(targetW, targetH) * 0.85));
    const retryScale = smaller / Math.max(targetW, targetH);
    canvas.width = Math.max(1, Math.round(targetW * retryScale));
    canvas.height = Math.max(1, Math.round(targetH * retryScale));
    const retryCtx = canvas.getContext("2d");
    if (!retryCtx) throw new Error("Could not prepare photo for upload.");
    retryCtx.fillStyle = "#ffffff";
    retryCtx.fillRect(0, 0, canvas.width, canvas.height);
    retryCtx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvasToBlob(canvas, "image/jpeg", CROP_OUTPUT_JPEG_QUALITY);
  }

  return blob;
}
