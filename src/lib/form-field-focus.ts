import type { KeyboardEvent } from "react";
import type { ProfileRequiredFieldId } from "@/lib/profile-required-fields";

export const PROFILE_REQUIRED_FIELD_HIGHLIGHT_CLASS = "profile-required-field-highlight";

function resolveFocusTarget(el: HTMLElement): HTMLElement {
  if (
    el.matches(
      'input:not([type="hidden"]), textarea, select, button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
  ) {
    return el;
  }
  const inner = el.querySelector<HTMLElement>(
    'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])',
  );
  return inner ?? el;
}

function applyFieldHighlight(el: HTMLElement): void {
  const target = resolveFocusTarget(el);
  target.classList.add(PROFILE_REQUIRED_FIELD_HIGHLIGHT_CLASS);
  window.setTimeout(() => {
    target.classList.remove(PROFILE_REQUIRED_FIELD_HIGHLIGHT_CLASS);
  }, 2000);
}

/** Scroll to and focus the first invalid required field. */
export function focusFirstInvalidField(
  issues: { focusId?: string }[],
  formRoot?: HTMLElement | null,
): boolean {
  if (typeof document === "undefined") return false;
  const root = formRoot ?? document;
  for (const issue of issues) {
    if (!issue.focusId) continue;
    const el = root.querySelector<HTMLElement>(`#${CSS.escape(issue.focusId)}`);
    if (!el) continue;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const focusTarget = resolveFocusTarget(el);
    if ("focus" in focusTarget && typeof focusTarget.focus === "function") {
      focusTarget.focus({ preventScroll: true });
    }
    applyFieldHighlight(el);
    return true;
  }
  return false;
}

export type FocusRequiredFieldTarget = {
  focusId?: string;
  href?: string;
};

export type FocusRequiredFieldOptions = {
  formRoot?: HTMLElement | null;
  onNavigate?: (href: string) => void;
};

/** Scroll/focus a required field or navigate to its href. */
export function focusRequiredFieldTarget(
  target: FocusRequiredFieldTarget,
  options: FocusRequiredFieldOptions = {},
): boolean {
  if (target.focusId) {
    const focused = focusFirstInvalidField([{ focusId: target.focusId }], options.formRoot);
    if (focused) return true;
  }
  if (target.href) {
    options.onNavigate?.(target.href);
    return true;
  }
  return false;
}

const FIELD_ORDER_ATTR = "data-required-field-order";

/** Register field order on a form for Enter-to-advance. */
export function requiredFieldOrderProps(order: number): {
  [FIELD_ORDER_ATTR]: number;
  onKeyDown: (e: KeyboardEvent) => void;
} {
  return {
    [FIELD_ORDER_ATTR]: order,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      const target = e.target as HTMLElement;
      if (target.tagName === "TEXTAREA") return;
      const form = target.closest("form");
      if (!form) return;
      e.preventDefault();
      focusNextRequiredField(form, order);
    },
  };
}

export function focusNextRequiredField(form: HTMLElement, currentOrder: number): void {
  const fields = Array.from(
    form.querySelectorAll<HTMLElement>(`[${FIELD_ORDER_ATTR}]`),
  ).sort(
    (a, b) =>
      Number(a.getAttribute(FIELD_ORDER_ATTR)) - Number(b.getAttribute(FIELD_ORDER_ATTR)),
  );

  const next = fields.find(
    (el) => Number(el.getAttribute(FIELD_ORDER_ATTR)) > currentOrder,
  );
  if (!next) return;

  next.scrollIntoView({ behavior: "smooth", block: "center" });
  if ("focus" in next && typeof next.focus === "function") {
    next.focus({ preventScroll: true });
  }
}

export function fieldErrorId(fieldId: ProfileRequiredFieldId): string {
  return `field-error-${fieldId}`;
}
