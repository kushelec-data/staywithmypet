/** Development-only helper to trace click interception on account pages. */

type ClickBlockerSnapshot = {
  pathname: string;
  targetTag: string;
  targetClass: string;
  elementFromPointTag: string;
  elementFromPointClass: string;
  bodyOverflow: string;
  openDialogs: number;
  fixedOverlays: number;
};

function overlaySummary(el: Element | null): { tag: string; className: string } {
  if (!(el instanceof HTMLElement)) {
    return { tag: "none", className: "" };
  }
  return { tag: el.tagName.toLowerCase(), className: el.className.toString().slice(0, 120) };
}

export function snapshotClickBlockers(clientX: number, clientY: number): ClickBlockerSnapshot {
  const hit = document.elementFromPoint(clientX, clientY);
  const targetSummary = overlaySummary(hit);
  const openDialogs = document.querySelectorAll("dialog[open]").length;
  const fixedOverlays = document.querySelectorAll(
    "dialog[open], .fixed.inset-0, [class*='fixed'][class*='inset-0']",
  ).length;

  return {
    pathname: window.location.pathname,
    targetTag: targetSummary.tag,
    targetClass: targetSummary.className,
    elementFromPointTag: targetSummary.tag,
    elementFromPointClass: targetSummary.className,
    bodyOverflow: document.body.style.overflow,
    openDialogs,
    fixedOverlays,
  };
}

export function installClickBlockerDiagnostic(): () => void {
  if (process.env.NODE_ENV !== "development") return () => {};

  function onClickCapture(event: MouseEvent) {
    const snapshot = snapshotClickBlockers(event.clientX, event.clientY);
    const interactive = event.target instanceof Element ? event.target.closest("a,button") : null;
    if (!interactive) return;

    const link = interactive.closest("a[href]");
    if (!link || !(link instanceof HTMLAnchorElement)) return;

    const hit = document.elementFromPoint(event.clientX, event.clientY);
    if (hit && (hit === link || link.contains(hit))) return;

    console.warn("[click-blocker-diagnostic] navigation click intercepted", {
      href: link.getAttribute("href"),
      ...snapshot,
    });
  }

  document.addEventListener("click", onClickCapture, true);
  return () => document.removeEventListener("click", onClickCapture, true);
}
