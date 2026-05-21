/** Client-side password rules aligned with product policy (Supabase may enforce separately). */

export type PasswordRuleId = "minLength" | "upper" | "lower" | "number" | "special";

export function evaluatePasswordRules(password: string): Record<PasswordRuleId, boolean> {
  return {
    minLength: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

export function passwordMeetsPolicy(password: string): boolean {
  const r = evaluatePasswordRules(password);
  return r.minLength && r.upper && r.lower && r.number && r.special;
}
