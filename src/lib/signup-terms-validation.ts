export const TERMS_ACCEPTANCE_SHAKE_CLASS = "terms-acceptance-shake";
export const TERMS_ACCEPTANCE_HIGHLIGHT_CLASS = "terms-acceptance-highlight";
export const TERMS_SHAKE_ANIMATION_NAME = "terms-acceptance-shake";
export const TERMS_SHAKE_DURATION_MS = 350;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function shouldApplyTermsShake(): boolean {
  return !prefersReducedMotion();
}

export function scrollSignupTermsIntoView(container: HTMLElement | null): void {
  container?.scrollIntoView({ behavior: "smooth", block: "center" });
}

export function focusSignupTermsCheckbox(checkbox: HTMLInputElement | null): void {
  requestAnimationFrame(() => {
    checkbox?.focus({ preventScroll: true });
  });
}

export function focusSignupTermsField(
  container: HTMLElement | null,
  checkbox: HTMLInputElement | null,
): void {
  scrollSignupTermsIntoView(container);
  focusSignupTermsCheckbox(checkbox);
}
