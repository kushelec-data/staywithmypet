import type { AuthError, Session, User } from "@supabase/supabase-js";

/** Production confirm URL used for Supabase redirect allowlist audits. */
export const EXPECTED_PRODUCTION_SIGNUP_CALLBACK =
  "https://staywithmypet-5296.vercel.app/auth/confirm?next=%2Fdashboard";

export type SignupDebugSnapshot = {
  hasUser: boolean;
  hasSession: boolean;
  emailConfirmedAt: string | null;
  emailRedirectTo: string;
  supabaseError: string | null;
  matchesExpectedProductionRedirect: boolean;
};

export function isSignupDebugEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}

/** Temporary signup submit tracing — no secrets logged. */
export function logSignupSubmitStep(
  step: string,
  detail?: Record<string, unknown>,
): void {
  if (typeof console !== "undefined") {
    console.info("[auth:signup:submit]", step, detail ?? {});
  }
}

export function buildSignupDebugSnapshot(
  data: { user: User | null; session: Session | null },
  error: AuthError | null,
  emailRedirectTo: string,
): SignupDebugSnapshot {
  return {
    hasUser: Boolean(data.user),
    hasSession: Boolean(data.session),
    emailConfirmedAt: data.user?.email_confirmed_at ?? null,
    emailRedirectTo,
    supabaseError: error?.message ?? null,
    matchesExpectedProductionRedirect:
      emailRedirectTo === EXPECTED_PRODUCTION_SIGNUP_CALLBACK,
  };
}

type SignupResponseLog = SignupDebugSnapshot & {
  userId: string | null;
  identitiesCount: number;
  errorStatus: number | undefined;
};

/** Non-production signup diagnostics — never logs passwords or tokens. */
export function logSignupResponseDev(
  data: { user: User | null; session: Session | null },
  error: AuthError | null,
  emailRedirectTo: string,
): void {
  if (!isSignupDebugEnabled()) return;

  const snapshot = buildSignupDebugSnapshot(data, error, emailRedirectTo);
  const payload: SignupResponseLog = {
    ...snapshot,
    userId: data.user?.id ?? null,
    identitiesCount: data.user?.identities?.length ?? 0,
    errorStatus: error?.status,
  };

  console.info("[auth:signup]", payload);
}

export function signupOutcomeLabel(snapshot: SignupDebugSnapshot): string {
  if (snapshot.supabaseError) return "error";
  if (snapshot.hasSession && snapshot.hasUser) return "session (auto-confirmed or confirm off)";
  if (snapshot.hasUser && !snapshot.hasSession) return "user without session (confirm email pending)";
  return "empty response";
}
