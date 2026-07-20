/** Per-plan Stripe checkout UI state (client-safe helpers). */

export type PlanCheckoutErrors = Record<string, string>;

export function checkoutRuntimeErrorForPlan(
  errors: PlanCheckoutErrors,
  planId: string,
): string | null {
  return errors[planId] ?? null;
}

export function setPlanCheckoutError(
  errors: PlanCheckoutErrors,
  planId: string,
  message: string,
): PlanCheckoutErrors {
  return { ...errors, [planId]: message };
}

export function clearPlanCheckoutError(
  errors: PlanCheckoutErrors,
  planId: string,
): PlanCheckoutErrors {
  if (!(planId in errors)) return errors;
  const next = { ...errors };
  delete next[planId];
  return next;
}

export function isPlanCheckoutLoading(
  loadingPlanId: string | null,
  planId: string,
): boolean {
  return loadingPlanId === planId;
}

export function planConfigErrorForPlan(
  planCheckoutErrors: Record<string, string | null | undefined> | undefined,
  planId: string,
): string | null {
  const value = planCheckoutErrors?.[planId];
  return value ?? null;
}

/** Non-current plan cards when the role already has an active membership. */
export function isOtherPlanBlockedByActiveMembership(input: {
  variant: "marketing" | "account";
  roleHasActiveMembership: boolean;
  isCurrentPlan: boolean;
}): boolean {
  return (
    input.variant === "account" &&
    input.roleHasActiveMembership &&
    !input.isCurrentPlan
  );
}
