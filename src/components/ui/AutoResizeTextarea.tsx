"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  type Ref,
  type TextareaHTMLAttributes,
} from "react";

const DEFAULT_MIN_ROWS = 4;
/** ~4–5 lines at input-field font size and padding. */
const DEFAULT_MIN_HEIGHT_PX = 120;
const LINE_HEIGHT_PX = 14 * 1.45;
const VERTICAL_PADDING_PX = 20;

export type AutoResizeTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /** Minimum visible rows before content growth (default 4). */
  minRows?: number;
  /** Allow dragging the bottom edge to resize vertically (default true). */
  allowManualResize?: boolean;
};

function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (value: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") ref(value);
      else ref.current = value;
    }
  };
}

function minHeightForRows(minRows: number): number | undefined {
  if (minRows <= 1) return undefined;
  const computed = VERTICAL_PADDING_PX + minRows * LINE_HEIGHT_PX;
  return minRows >= DEFAULT_MIN_ROWS ? Math.max(computed, DEFAULT_MIN_HEIGHT_PX) : computed;
}

export const AutoResizeTextarea = forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  function AutoResizeTextarea(
    {
      className = "",
      minRows = DEFAULT_MIN_ROWS,
      allowManualResize = true,
      value,
      defaultValue,
      onChange,
      onInput,
      rows: _rows,
      style,
      ...props
    },
    forwardedRef,
  ) {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const syncHeight = useCallback(() => {
      const el = textareaRef.current;
      if (!el) return;

      el.style.height = "auto";

      const minHeight =
        Number.parseFloat(el.style.minHeight) ||
        Number.parseFloat(getComputedStyle(el).minHeight) ||
        minHeightForRows(minRows) ||
        0;

      let nextHeight = Math.max(el.scrollHeight, minHeight);
      const maxHeightRaw = getComputedStyle(el).maxHeight;
      const maxHeight = maxHeightRaw === "none" ? Infinity : Number.parseFloat(maxHeightRaw);

      if (Number.isFinite(maxHeight)) {
        nextHeight = Math.min(nextHeight, maxHeight);
        el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
      } else {
        el.style.overflowY = "hidden";
      }

      el.style.height = `${nextHeight}px`;
    }, [minRows]);

    useEffect(() => {
      syncHeight();
    }, [value, defaultValue, syncHeight]);

    useEffect(() => {
      syncHeight();
      window.addEventListener("resize", syncHeight);
      return () => window.removeEventListener("resize", syncHeight);
    }, [syncHeight]);

    const minHeightPx = minHeightForRows(minRows);

    return (
      <textarea
        {...props}
        ref={mergeRefs(textareaRef, forwardedRef)}
        rows={minRows}
        value={value}
        defaultValue={defaultValue}
        onChange={(event) => {
          onChange?.(event);
          syncHeight();
        }}
        onInput={(event) => {
          onInput?.(event);
          syncHeight();
        }}
        className={className}
        style={{
          resize: allowManualResize ? "vertical" : "none",
          overflow: "hidden",
          minHeight: minHeightPx,
          ...style,
        }}
      />
    );
  },
);
