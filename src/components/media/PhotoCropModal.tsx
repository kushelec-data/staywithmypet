"use client";

import { Button } from "@/components/ui/Button";
import {
  blobToCropFile,
  clampCropTransform,
  cropOutputMimeType,
  cropOutputSize,
  initialCropTransform,
  loadImageElement,
  renderCropPreviewCanvas,
  renderCroppedImageBlob,
  type CropShape,
  type CropTransform,
} from "@/lib/image-crop";
import {
  useCallback,
  useEffect,
  useMemo,
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
  shape?: CropShape;
  saving?: boolean;
  onClose: () => void;
  onSave: (file: File) => void | Promise<void>;
};

const VIEWPORT_SIZE = 280;

export function PhotoCropModal({
  open,
  sourceFile,
  sourceUrl,
  shape = "rounded-square",
  saving = false,
  onClose,
  onSave,
}: PhotoCropModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(
    null,
  );
  const bodyScrollLockedRef = useRef(false);
  const prevBodyOverflowRef = useRef("");

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [transform, setTransform] = useState<CropTransform>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [localSaving, setLocalSaving] = useState(false);

  const sourceKey = sourceFile
    ? `${sourceFile.name}:${sourceFile.size}:${sourceFile.lastModified}`
    : (sourceUrl ?? "");

  const previewMaskClass =
    shape === "circle" ? "rounded-full" : "rounded-3xl";

  const outputSize = useMemo(() => cropOutputSize(shape), [shape]);

  const updateTransform = useCallback(
    (next: CropTransform) => {
      if (!image) return;
      setTransform(clampCropTransform(image.width, image.height, VIEWPORT_SIZE, next));
    },
    [image],
  );

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
      setImage(null);
      setLoadError(null);
      setLoading(false);
      setTransform({ scale: 1, offsetX: 0, offsetY: 0 });
      return;
    }

    if (!sourceFile && !sourceUrl) return;

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    void (async () => {
      try {
        const loaded = await loadImageElement(sourceFile ?? sourceUrl!);
        if (cancelled) return;
        setImage(loaded);
        setTransform(initialCropTransform(loaded.width, loaded.height, VIEWPORT_SIZE));
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Could not load this photo.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, sourceKey, sourceFile, sourceUrl]);

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !image || !open) return;
    renderCropPreviewCanvas(canvas, {
      image,
      transform,
      viewportSize: VIEWPORT_SIZE,
      outputSize,
      shape,
      mimeType: cropOutputMimeType(sourceFile?.type ?? "image/jpeg"),
    });
  }, [image, transform, open, outputSize, shape, sourceFile?.type]);

  function handleDialogCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    if (saving || localSaving) return;
    onClose();
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!image || saving || localSaving) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      offsetX: transform.offsetX,
      offsetY: transform.offsetY,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const start = dragStartRef.current;
    if (!start || !image) return;
    updateTransform({
      ...transform,
      offsetX: start.offsetX + (event.clientX - start.x),
      offsetY: start.offsetY + (event.clientY - start.y),
    });
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragStartRef.current) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      dragStartRef.current = null;
    }
  }

  async function handleSave() {
    if (!image || saving || localSaving) return;
    setLocalSaving(true);
    try {
      const mimeType = cropOutputMimeType(sourceFile?.type ?? "image/jpeg");
      const blob = await renderCroppedImageBlob({
        image,
        transform,
        viewportSize: VIEWPORT_SIZE,
        outputSize,
        shape,
        mimeType,
      });
      const baseName = sourceFile?.name ?? "photo.jpg";
      const file = blobToCropFile(blob, baseName, mimeType);
      await onSave(file);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not save cropped photo.");
    } finally {
      setLocalSaving(false);
    }
  }

  if (!mounted || !open) return null;

  const busy = saving || localSaving || loading;

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
                Adjust photo
              </h2>
              <p className="mt-1 text-sm text-muted">Drag to reposition. Use the slider to zoom.</p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="rounded-full px-2 py-1 text-sm text-muted hover:bg-mint/50 hover:text-foreground disabled:opacity-50"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="mt-5 flex flex-col items-center gap-4">
            <div
              className={`relative touch-none select-none overflow-hidden border border-black/10 bg-[#111] shadow-inner ${previewMaskClass}`}
              style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <canvas
                ref={previewCanvasRef}
                width={VIEWPORT_SIZE}
                height={VIEWPORT_SIZE}
                className="h-full w-full touch-none"
                aria-hidden
              />
              {shape === "circle" ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-white/70 ring-inset"
                />
              ) : (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-3xl ring-2 ring-white/70 ring-inset"
                />
              )}
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/35 text-sm font-medium text-white">
                  Loading…
                </div>
              ) : null}
            </div>

            <div className="w-full max-w-xs">
              <label htmlFor="photo-crop-zoom" className="text-xs font-medium text-muted">
                Zoom
              </label>
              <input
                id="photo-crop-zoom"
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={transform.scale}
                disabled={!image || busy}
                onChange={(event) =>
                  updateTransform({ ...transform, scale: Number(event.target.value) })
                }
                className="mt-2 h-2 w-full cursor-pointer accent-brand-teal"
              />
            </div>

            {loadError ? (
              <p className="w-full text-center text-sm text-brand-pink" role="alert">
                {loadError}
              </p>
            ) : null}
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
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="w-full sm:w-auto"
              disabled={!image || busy}
              onClick={() => void handleSave()}
            >
              {saving || localSaving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </dialog>
  );

  return createPortal(modal, document.body);
}
