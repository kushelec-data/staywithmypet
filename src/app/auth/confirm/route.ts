import { PASSWORD_RESET_PATH } from "@/lib/auth-recovery";
import { logRecoveryExchangeDev, recoveryTypeFromQuery } from "@/lib/auth-recovery-dev";
import { ensureOAuthProfile, waitForAuthUser } from "@/lib/auth-callback";
import { resolveConfirmRedirectPath } from "@/lib/auth-confirm-redirect";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import type { EmailOtpType, SupabaseClient } from "@supabase/supabase-js";
import { type NextRequest, type NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get("token_hash");
  const typeRaw = url.searchParams.get("type");
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next");

  if (process.env.NODE_ENV !== "production") {
    console.info("[auth:confirm] request", {
      hasCode: Boolean(code),
      hasTokenHash: Boolean(token_hash),
      type: typeRaw,
      next: requestedNext,
      pathname: url.pathname,
    });
  }

  const { supabase, redirectTo } = createRouteHandlerClient(request);

  if (token_hash && typeRaw) {
    const type = recoveryTypeFromQuery(typeRaw) ?? (typeRaw as EmailOtpType);
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    logRecoveryExchangeDev("verifyOtp", {
      method: "verifyOtp",
      error: error?.message ?? null,
    });

    if (error) {
      return redirectTo(
        `${PASSWORD_RESET_PATH}?recovery_error=${encodeURIComponent(error.message)}`,
      );
    }

    return finishConfirm(supabase, redirectTo, typeRaw, requestedNext);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    logRecoveryExchangeDev("exchangeCodeForSession", {
      method: "exchangeCodeForSession",
      error: error?.message ?? null,
    });

    if (error) {
      return redirectTo(
        `${PASSWORD_RESET_PATH}?recovery_error=${encodeURIComponent(error.message)}`,
      );
    }

    return finishConfirm(supabase, redirectTo, typeRaw, requestedNext);
  }

  return redirectTo(
    `${PASSWORD_RESET_PATH}?recovery_error=${encodeURIComponent("Missing recovery token.")}`,
  );
}

async function finishConfirm(
  supabase: SupabaseClient,
  redirectTo: (path: string) => NextResponse,
  confirmType: string | null,
  requestedNext: string | null,
) {
  const user = await waitForAuthUser(supabase);

  if (!user) {
    return redirectTo("/login?error=auth");
  }

  if (confirmType === "recovery") {
    return redirectTo(resolveConfirmRedirectPath(null, requestedNext, confirmType));
  }

  const { profile } = await ensureOAuthProfile(supabase, user);

  if (profile && profile.id !== user.id) {
    return redirectTo("/login?error=profile_session");
  }

  return redirectTo(resolveConfirmRedirectPath(profile, requestedNext, confirmType));
}
