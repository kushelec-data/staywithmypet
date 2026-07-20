import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { restoreBodyScroll } from "@/components/media/PhotoCropModal";

const MODAL_SOURCE = readFileSync(
  join(process.cwd(), "src/components/media/PhotoCropModal.tsx"),
  "utf8",
);

describe("PhotoCropModal lifecycle (source regression)", () => {
  it("renders nothing when closed", () => {
    expect(MODAL_SOURCE).toMatch(/if\s*\(\s*!mounted\s*\|\|\s*!open\s*\)\s*return\s*null/);
  });

  it("uses showModal instead of non-modal show()", () => {
    expect(MODAL_SOURCE).toMatch(/dialog\.showModal\(\)/);
    expect(MODAL_SOURCE).not.toMatch(/dialog\.show\(\)/);
  });

  it("closes dialog in effect cleanup before unmounting portal", () => {
    expect(MODAL_SOURCE).toMatch(/return\s*\(\)\s*=>\s*\{[\s\S]*if\s*\(\s*dialog\.open\s*\)\s*dialog\.close\(\)/);
  });

  it("closes dialog and restores body scroll on component unmount", () => {
    expect(MODAL_SOURCE).toMatch(/if\s*\(\s*dialog\?\.open\s*\)\s*dialog\.close\(\)/);
    expect(MODAL_SOURCE).toMatch(/restoreBodyScroll\(bodyScrollLockedRef,\s*prevBodyOverflowRef\)/);
  });

  it("does not keep a persistent closed backdrop in the DOM", () => {
    expect(MODAL_SOURCE).not.toMatch(/pointer-events-none hidden/);
    expect(MODAL_SOURCE).not.toMatch(/open\s*\?\s*""\s*:\s*"pointer-events-none"/);
  });

  it("closes on route navigation while open", () => {
    expect(MODAL_SOURCE).toMatch(/pathnameWhenOpenedRef/);
    expect(MODAL_SOURCE).toMatch(/pathname !== pathnameWhenOpenedRef\.current/);
  });

  it("portals only while open (one dialog and one backdrop when rendered)", () => {
    const backdropMatches = MODAL_SOURCE.match(/fixed inset-0 cursor-default bg-foreground\/40/g) ?? [];
    expect(backdropMatches.length).toBe(1);
    expect(MODAL_SOURCE).toMatch(
      /return createPortal\(modal,\s*document\.body\)/,
    );
  });

  it("preserves escape and backdrop close handlers", () => {
    expect(MODAL_SOURCE).toMatch(/onCancel=\{handleDialogCancel\}/);
    expect(MODAL_SOURCE).toMatch(/onClick=\{handleRequestClose\}/);
    expect(MODAL_SOURCE).toMatch(/if\s*\(\s*saving\s*\|\|\s*localSaving\s*\)\s*return/);
  });
});

describe("restoreBodyScroll", () => {
  it("restores the previous overflow and clears the lock flag", () => {
    const bodyScrollLockedRef = { current: true };
    const prevBodyOverflowRef = { current: "scroll" };
    const body = { style: { overflow: "hidden" as string } };
    const previousDocument = globalThis.document;
    globalThis.document = { body } as Document;

    try {
      restoreBodyScroll(bodyScrollLockedRef, prevBodyOverflowRef);
    } finally {
      globalThis.document = previousDocument;
    }

    expect(body.style.overflow).toBe("scroll");
    expect(bodyScrollLockedRef.current).toBe(false);
  });

  it("is a no-op when scroll was not locked", () => {
    const bodyScrollLockedRef = { current: false };
    const prevBodyOverflowRef = { current: "auto" };

    restoreBodyScroll(bodyScrollLockedRef, prevBodyOverflowRef);

    expect(bodyScrollLockedRef.current).toBe(false);
  });
});
