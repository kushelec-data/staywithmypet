import { resolvePostLoginPath } from "@/lib/auth-routing";
import {
  ensureOAuthProfile,
  logAuthCallback,
  logAuthCallbackError,
  logAuthCallbackWarn,
  waitForAuthUser,
} from "@/lib/auth-callback";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function redirectTo(origin: string, path: string): NextResponse {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return NextResponse.redirect(`${origin}${normalized}`);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next");
  const oauthError = searchParams.get("error");
  const oauthErrorDescription = searchParams.get("error_description");

  logAuthCallback("callback received", {
    hasCode: Boolean(code),
    oauthError: oauthError ?? null,
    oauthErrorDescription: oauthErrorDescription ?? null,
    next: requestedNext ?? null,
  });

  if (oauthError) {
    logAuthCallbackWarn("oauth provider error", {
      oauthError,
      oauthErrorDescription: oauthErrorDescription ?? null,
    });
    return redirectTo(origin, "/login?error=auth");
  }

  if (!code) {
    logAuthCallbackWarn("missing authorization code");
    return redirectTo(origin, "/login?error=auth");
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    logAuthCallbackWarn("exchangeCodeForSession error", { message: exchangeError.message });
  } else {
    logAuthCallback("exchangeCodeForSession success");
  }

  const user = await waitForAuthUser(supabase);

  if (!user) {
    logAuthCallbackError("no authenticated user after retries", {
      exchangeFailed: Boolean(exchangeError),
    });
    return redirectTo(origin, "/login?error=auth");
  }

  logAuthCallback("user present", { userId: user.id });

  const { profile, ensureError } = await ensureOAuthProfile(supabase, user);

  if (ensureError) {
    logAuthCallbackWarn("profile ensure completed with errors", {
      userId: user.id,
      message: ensureError,
    });
  }

  if (profile) {
    logAuthCallback("profile found", { profileId: profile.id });
  } else {
    logAuthCallbackWarn("profile missing after retries; routing to onboarding", {
      userId: user.id,
    });
  }

  if (profile && profile.id !== user.id) {
    logAuthCallbackError("profile session mismatch", {
      userId: user.id,
      profileId: profile.id,
    });
    return redirectTo(origin, "/login?error=profile_session");
  }

  const destination = resolvePostLoginPath(profile, requestedNext);
  logAuthCallback("redirect", { destination, userId: user.id, hasProfile: Boolean(profile) });

  return redirectTo(origin, destination);
}
