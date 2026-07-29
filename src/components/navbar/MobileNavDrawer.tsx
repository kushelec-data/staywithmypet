"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

type MobileNavDrawerProps = {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  closeLabel: string;
  headerStart: ReactNode;
  headerEnd?: ReactNode;
  children: ReactNode;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

export function MobileNavDrawer({
  open,
  onClose,
  ariaLabel,
  closeLabel,
  headerStart,
  headerEnd,
  children,
  returnFocusRef,
}: MobileNavDrawerProps) {
  const drawerRef = useRef<HTMLElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      drawerRef.current?.focus();
      return;
    }

    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      returnFocusRef?.current?.focus();
    }
  }, [open, returnFocusRef]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] lg:hidden" role="presentation">
      <button
        type="button"
        className="fixed inset-0 bg-black/40"
        aria-label={closeLabel}
        onClick={onClose}
      />

      <aside
        ref={drawerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className="fixed right-0 top-0 flex h-full max-h-[100dvh] w-[min(100vw,420px)] max-w-[100vw] flex-col overflow-x-hidden border-l border-border bg-background shadow-xl outline-none"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <header className="flex min-w-0 shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="min-w-0 flex-1">{headerStart}</div>
          <div className="flex shrink-0 items-center gap-2">
            {headerEnd}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-border bg-mint/50 transition-colors active:bg-mint"
              aria-label={closeLabel}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain [-webkit-overflow-scrolling:touch]">
          {children}
        </div>
      </aside>
    </div>,
    document.body,
  );
}
