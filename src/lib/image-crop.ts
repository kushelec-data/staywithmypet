/** Client-side image crop, reposition, and compression helpers. */

export const CROP_OUTPUT_JPEG_QUALITY = 0.88;
export const CROP_MAX_OUTPUT_BYTES = 3 * 1024 * 1024;
export const CROP_MAX_INPUT_BYTES = 12 * 1024 * 1024;

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

export function loadImageElement(source: File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    let objectUrl: string | null = null;
    if (typeof source === "string") {
      img.crossOrigin = "anonymous";
      img.referrerPolicy = "no-referrer";
    }
    img.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not load this photo."));
    };
    if (source instanceof File) {
      objectUrl = URL.createObjectURL(source);
      img.src = objectUrl;
    } else {
      img.src = source;
    }
  });
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

function drawCroppedImage(
  ctx: CanvasRenderingContext2D,
  options: CropRenderOptions,
): void {
  const { image, transform, viewportSize, outputSize, shape } = options;
  const cover = baseCoverScale(image.width, image.height, viewportSize) * transform.scale;
  const scaledW = image.width * cover;
  const scaledH = image.height * cover;
  const drawX = outputSize / 2 - scaledW / 2 + (transform.offsetX * outputSize) / viewportSize;
  const drawY = outputSize / 2 - scaledH / 2 + (transform.offsetY * outputSize) / viewportSize;

  ctx.clearRect(0, 0, outputSize, outputSize);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, outputSize, outputSize);

  if (shape === "circle") {
    ctx.save();
    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
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
  canvas.width = options.viewportSize;
  canvas.height = options.viewportSize;
  drawCroppedImage(ctx, options);
}

export async function renderCroppedImageBlob(
  options: CropRenderOptions,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = options.outputSize;
  canvas.height = options.outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare cropped photo.");

  drawCroppedImage(ctx, { ...options, viewportSize: options.viewportSize });

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
