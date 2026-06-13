import { DASHBOARD_PATH } from "@/lib/auth-routing";
import { getAuthCallbackUrl } from "@/lib/auth";
import type { AuthError, Session, User } from "@supabase/supabase-js";

type SignupResponseLog = {
  error: Pick<AuthError, "message" | "status" | "name"> | null;
  hasUser: boolean;
  hasSession: boolean;
  userId: string | null;
  emailConfirmedAt: string | null;
  identitiesCount: number;
  emailRedirectTo: string;
};

/** Dev-only signup diagnostics — never logs passwords or tokens. */
export function logSignupResponseDev(
  data: { user: User | null; session: Session | null },
  error: AuthError | null,
): void {
  if (process.env.NODE_ENV !== "development") return;

  const payload: SignupResponseLog = {
    error: error
      ? { message: error.message, status: error.status, name: error.name }
      : null,
    hasUser: Boolean(data.user),
    hasSession: Boolean(data.session),
    userId: data.user?.id ?? null,
    emailConfirmedAt: data.user?.email_confirmed_at ?? null,
    identitiesCount: data.user?.identities?.length ?? 0,
    emailRedirectTo: getAuthCallbackUrl(DASHBOARD_PATH),
  };

  console.info("[auth:signup]", payload);
}
