"use client";

import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import {
  blobToCropFile,
  clampCropTransform,
  compressImageForUpload,
  cropImageDimensions,
  cropOutputMimeType,
  initialCropTransformForEditor,
  loadImageElement,
  PHOTO_LOAD_ERROR,
  renderCropPreviewCanvas,
  type CropShape,
  type CropTransform,
} from "@/lib/image-crop";
import {
  cropTransformToPhotoPosition,
  normalizePhotoPosition,
  photoPositionToCropTransform,
  type PhotoCropSaveResult,
  type PhotoObjectPosition,
} from "@/lib/photo-position";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent,
} from "react";
import { createPortal } from "react-dom";

type PhotoCropModalProps = {
  open: boolean;
  sourceFile?: File;
  sourceUrl?: string;
  initialPosition?: Partial<PhotoObjectPosition> | null;
  shape?: CropShape;
  saving?: boolean;
  onClose: () => void;
  onSave: (result: PhotoCropSaveResult) => void | Promise<void>;
};

const VIEWPORT_SIZE = 280;

export function PhotoCropModal({
  open,
  sourceFile,
  sourceUrl,
  initialPosition,
  shape = "rounded-square",
  saving = false,
  onClose,
  onSave,
}: PhotoCropModalProps) {
  const { t } = useLanguage();
  const media = t.media;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; transform: CropTransform } | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const bodyScrollLockedRef = useRef(false);
  const prevBodyOverflowRef = useRef("");

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [imageReady, setImageReady] = useState(false);
  const [transform, setTransform] = useState<CropTransform>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [localSaving, setLocalSaving] = useState(false);

  const sourceKey = sourceFile
    ? `${sourceFile.name}:${sourceFile.size}:${sourceFile.lastModified}`
    : (sourceUrl ?? "");

  const previewMaskClass = shape === "circle" ? "rounded-full" : "rounded-3xl";

  const paintPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !open) return;
    renderCropPreviewCanvas(canvas, {
      image: img,
      transform,
      viewportSize: VIEWPORT_SIZE,
      outputSize: VIEWPORT_SIZE,
      shape,
      mimeType: cropOutputMimeType(sourceFile?.type ?? "image/jpeg"),
    });
  }, [open, shape, sourceFile?.type, transform]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.show();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!mounted || !open) return;
    if (bodyScrollLockedRef.current) return;
    prevBodyOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    bodyScrollLockedRef.current = true;
    return () => {
      if (!bodyScrollLockedRef.current) return;
      document.body.style.overflow = prevBodyOverflowRef.current;
      bodyScrollLockedRef.current = false;
    };
  }, [mounted, open]);

  useEffect(() => {
    if (!open) {
      imageRef.current = null;
      setImageReady(false);
      setLoadError(null);
      setLoading(false);
      setTransform({ scale: 1, offsetX: 0, offsetY: 0 });
      return;
    }

    if (!sourceFile && !sourceUrl) return;

    let cancelled = false;
    setLoading(true);
    setImageReady(false);
    setLoadError(null);

    void (async () => {
      try {
        const loaded = await loadImageElement(sourceFile ?? sourceUrl!);
        if (cancelled) return;
        imageRef.current = loaded;
        const { width, height } = cropImageDimensions(loaded);
        const fromPosition = initialPosition
          ? photoPositionToCropTransform(
              normalizePhotoPosition(initialPosition),
              width,
              height,
              VIEWPORT_SIZE,
            )
          : undefined;
        setTransform(initialCropTransformForEditor(width, height, VIEWPORT_SIZE, fromPosition));
        setImageReady(true);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : PHOTO_LOAD_ERROR);
          imageRef.current = null;
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, sourceKey, sourceFile, sourceUrl, initialPosition]);

  useEffect(() => {
    if (!imageReady) return;
    paintPreview();
  }, [imageReady, paintPreview]);

  function handleDialogCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    if (saving || localSaving) return;
    onClose();
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const img = imageRef.current;
    if (!img || !imageReady || saving || localSaving || loading) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      transform,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const start = dragStartRef.current;
    const img = imageRef.current;
    if (!start || !img) return;
    event.preventDefault();
    const { width, height } = cropImageDimensions(img);
    setTransform(
      clampCropTransform(width, height, VIEWPORT_SIZE, {
        scale: start.transform.scale,
        offsetX: start.transform.offsetX + (event.clientX - start.x),
        offsetY: start.transform.offsetY + (event.clientY - start.y),
      }),
    );
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragStartRef.current) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStartRef.current = null;
  }

  function handleZoomChange(nextScale: number) {
    const img = imageRef.current;
    if (!img) return;
    const { width, height } = cropImageDimensions(img);
    setTransform((current) =>
      clampCropTransform(width, height, VIEWPORT_SIZE, {
        ...current,
        scale: nextScale,
      }),
    );
  }

  async function handleSave() {
    const img = imageRef.current;
    if (!img || !imageReady || saving || localSaving) return;
    setLocalSaving(true);
    try {
      const { width, height } = cropImageDimensions(img);
      const position = cropTransformToPhotoPosition(transform, width, height, VIEWPORT_SIZE);
      const mimeType = cropOutputMimeType(sourceFile?.type ?? "image/jpeg");
      const blob = await compressImageForUpload(img, mimeType);
      const baseName = sourceFile?.name ?? "photo.jpg";
      const file = blobToCropFile(blob, baseName, mimeType);
      await onSave({ file, position: normalizePhotoPosition(position) });
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : t.media.saveCroppedError);
    } finally {
      setLocalSaving(false);
    }
  }

  if (!mounted || !open) return null;

  const busy = saving || localSaving || loading;
  const showCropArea = imageReady && !loadError;
  const previewBgClass = loadError ? "bg-brand-pink/10" : loading ? "bg-mint/20" : "bg-white";

  const modal = (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby="photo-crop-title"
      onClose={onClose}
      onCancel={handleDialogCancel}
      className="fixed inset-0 z-[100] m-0 flex h-[100dvh] w-full max-w-none items-end justify-center border-0 bg-transparent p-0 open:flex sm:items-center [&:not([open])]:hidden"
    >
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        className="fixed inset-0 cursor-default bg-foreground/40"
        onClick={() => {
          if (!busy) onClose();
        }}
      />
      <div
        role="document"
        className="relative z-10 flex max-h-[100dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border bg-cream shadow-xl dark:bg-surface sm:max-h-[92dvh] sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-6 sm:pt-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="photo-crop-title" className="font-heading text-lg font-semibold">
                {media.adjustPhoto}
              </h2>
              <p className="mt-1 text-sm text-muted">{media.adjustPhotoHint}</p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="rounded-full px-2 py-1 text-sm text-muted hover:bg-mint/50 hover:text-foreground disabled:opacity-50"
              aria-label={t.common.close}
            >
              ✕
            </button>
          </div>

          <div className="mt-5 flex flex-col items-center gap-4">
            <div
              className={`relative select-none overflow-hidden border border-black/10 shadow-inner ${previewMaskClass} ${previewBgClass}`}
              style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE, touchAction: "none" }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {showCropArea ? (
                <canvas
                  ref={previewCanvasRef}
                  width={VIEWPORT_SIZE}
                  height={VIEWPORT_SIZE}
                  className="block h-full w-full touch-none"
                  aria-hidden
                />
              ) : null}
              {shape === "circle" && showCropArea ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-white/70 ring-inset"
                />
              ) : null}
              {shape === "rounded-square" && showCropArea ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-3xl ring-2 ring-white/70 ring-inset"
                />
              ) : null}
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-muted">
                  {t.common.loading}
                </div>
              ) : null}
              {loadError ? (
                <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-brand-pink">
                  {loadError}
                </div>
              ) : null}
            </div>

            <div className="w-full max-w-xs">
              <label htmlFor="photo-crop-zoom" className="text-xs font-medium text-muted">
                {media.zoom}
              </label>
              <input
                id="photo-crop-zoom"
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={transform.scale}
                disabled={!showCropArea || busy}
                onInput={(event) => handleZoomChange(Number(event.currentTarget.value))}
                className="mt-2 h-2 w-full cursor-pointer accent-brand-teal"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              disabled={busy}
              onClick={onClose}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="button"
              size="sm"
              className="w-full sm:w-auto"
              disabled={!showCropArea || busy}
              onClick={() => void handleSave()}
            >
              {saving || localSaving ? t.common.saving : t.common.save}
            </Button>
          </div>
        </div>
      </div>
    </dialog>
  );

  return createPortal(modal, document.body);
}
