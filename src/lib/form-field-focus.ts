import type { KeyboardEvent } from "react";
import type { ProfileRequiredFieldId } from "@/lib/profile-required-fields";

/** Scroll to and focus the first invalid required field. */
export function focusFirstInvalidField(
  issues: { focusId?: string }[],
  formRoot?: HTMLElement | null,
): boolean {
  const root = formRoot ?? document;
  for (const issue of issues) {
    if (!issue.focusId) continue;
    const el = root.querySelector<HTMLElement>(`#${CSS.escape(issue.focusId)}`);
    if (!el) continue;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    if ("focus" in el && typeof el.focus === "function") {
      el.focus({ preventScroll: true });
    }
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
