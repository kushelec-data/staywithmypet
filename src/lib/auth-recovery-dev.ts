import type { EmailOtpType } from "@supabase/supabase-js";

export type RecoveryUrlDebug = {
  href: string;
  pathname: string;
  query: Record<string, string | null>;
  hash: Record<string, string>;
  recoveryType: string | null;
  hasCode: boolean;
  hasTokenHash: boolean;
  hasHashAccessToken: boolean;
  hasHashRefreshToken: boolean;
};

export function isRecoveryDebugEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function captureRecoveryUrlDebug(): RecoveryUrlDebug | null {
  if (typeof window === "undefined") return null;

  const url = new URL(window.location.href);
  const query = Object.fromEntries(url.searchParams.entries()) as Record<string, string | null>;
  const hash = Object.fromEntries(new URLSearchParams(url.hash.replace(/^#/, "")).entries());

  return {
    href: url.href,
    pathname: url.pathname,
    query,
    hash,
    recoveryType: query.type ?? hash.type ?? null,
    hasCode: Boolean(query.code),
    hasTokenHash: Boolean(query.token_hash),
    hasHashAccessToken: Boolean(hash.access_token),
    hasHashRefreshToken: Boolean(hash.refresh_token),
  };
}

export function logRecoveryUrlDebug(context: string, extra?: Record<string, unknown>): void {
  if (!isRecoveryDebugEnabled()) return;
  const snapshot = captureRecoveryUrlDebug();
  console.info(`[auth:recovery:${context}]`, { ...snapshot, ...extra });
}

export function logRecoveryExchangeDev(
  context: string,
  result: { error: string | null; method: "verifyOtp" | "exchangeCodeForSession" | "setSession" },
): void {
  if (!isRecoveryDebugEnabled()) return;
  console.info(`[auth:recovery:${context}]`, result);
}

export function recoveryTypeFromQuery(type: string | null): EmailOtpType | null {
  if (
    type === "recovery" ||
    type === "signup" ||
    type === "invite" ||
    type === "magiclink" ||
    type === "email_change" ||
    type === "email"
  ) {
    return type;
  }
  return null;
}
