import { PASSWORD_RESET_PATH } from "@/lib/auth-recovery";
import { logRecoveryExchangeDev, recoveryTypeFromQuery } from "@/lib/auth-recovery-dev";
import { syncProfileEmailVerified } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function redirectTo(origin: string, path: string): NextResponse {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return NextResponse.redirect(`${origin}${normalized}`);
}

function safeNextPath(value: string | null): string {
  if (!value?.trim()) return PASSWORD_RESET_PATH;
  const decoded = decodeURIComponent(value.trim());
  if (!decoded.startsWith("/") || decoded.startsWith("//")) return PASSWORD_RESET_PATH;
  return decoded;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get("token_hash");
  const typeRaw = url.searchParams.get("type");
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));

  if (process.env.NODE_ENV !== "production") {
    console.info("[auth:confirm] request", {
      hasCode: Boolean(code),
      hasTokenHash: Boolean(token_hash),
      type: typeRaw,
      next,
      pathname: url.pathname,
    });
  }

  const supabase = await createClient();

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
        url.origin,
        `${PASSWORD_RESET_PATH}?recovery_error=${encodeURIComponent(error.message)}`,
      );
    }

    if (type === "signup" || type === "email_change" || type === "email") {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const newlyVerified = await syncProfileEmailVerified(supabase, user);
        if (newlyVerified) {
          const { sendEmailVerifiedEmailAction } = await import("@/app/actions/email-events");
          await sendEmailVerifiedEmailAction();
        }
      }
    }

    return redirectTo(url.origin, next);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    logRecoveryExchangeDev("exchangeCodeForSession", {
      method: "exchangeCodeForSession",
      error: error?.message ?? null,
    });

    if (error) {
      return redirectTo(
        url.origin,
        `${PASSWORD_RESET_PATH}?recovery_error=${encodeURIComponent(error.message)}`,
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.email_confirmed_at) {
      const newlyVerified = await syncProfileEmailVerified(supabase, user);
      if (newlyVerified) {
        const { sendEmailVerifiedEmailAction } = await import("@/app/actions/email-events");
        await sendEmailVerifiedEmailAction();
      }
    }

    return redirectTo(url.origin, next);
  }

  return redirectTo(
    url.origin,
    `${PASSWORD_RESET_PATH}?recovery_error=${encodeURIComponent("Missing recovery token.")}`,
  );
}
