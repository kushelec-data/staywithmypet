"use client";

import Link from "next/link";
import { STATUS_ALERT_ERROR_CLASS, STATUS_ALERT_SUCCESS_CLASS } from "@/lib/status-colors";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { PasswordPolicyChecklist } from "@/components/auth/PasswordPolicyChecklist";
import { useLanguage } from "@/context/LanguageContext";
import { completeAuthSession } from "@/lib/auth-flow";
import { formatAuthError } from "@/lib/auth-messages";
import { DASHBOARD_PATH, resolveLoginReturnPath, resolvePostLoginPath } from "@/lib/auth-routing";
import { getAuthCallbackUrl } from "@/lib/auth";
import {
  buildSignupDebugSnapshot,
  isSignupDebugEnabled,
  logSignupResponseDev,
  type SignupDebugSnapshot,
} from "@/lib/auth-signup-dev";
import { SignupDebugPanel } from "@/components/auth/SignupDebugPanel";
import { PROFILE_SESSION_MISMATCH_PARAM } from "@/lib/profile-session-guard";
import { fetchUserProfile } from "@/lib/profile-load";
import { passwordMeetsPolicy } from "@/lib/password-policy";
import { createClient } from "@/lib/supabase";
import { rateLimitMessage, checkRateLimit } from "@/lib/security/rate-limit";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useEffect, useMemo, useState } from "react";

type AuthFormProps = {
  mode: "login" | "signup";
};

export function AuthForm({ mode }: AuthFormProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const isSignup = mode === "signup";
  const copy = isSignup ? t.auth.signup : t.auth.login;

  const authMessages = useMemo(
    () => ({
      errorGeneric: t.auth.errorGeneric,
      invalidCredentials: t.auth.invalidCredentials,
      emailAlreadyRegistered: t.auth.emailAlreadyRegistered,
      weakPassword: t.auth.weakPassword,
      oauthFailed: t.auth.oauthFailed,
      profileCreateFailed: t.auth.profileCreateFailed,
    }),
    [t],
  );

  const [password, setPassword] = useState("");
  const [signupDebug, setSignupDebug] = useState<SignupDebugSnapshot | null>(null);
  const showSignupDebug = isSignupDebugEnabled();

  useEffect(() => {
    if (searchParams.get("passwordReset") === "1") {
      setSuccess(t.auth.loginPasswordResetSuccess);
    }
  }, [searchParams, t.auth.loginPasswordResetSuccess]);

  useEffect(() => {
    if (searchParams.get("error") === "auth") {
      setError(t.auth.oauthFailed);
    }
    if (searchParams.get("error") === PROFILE_SESSION_MISMATCH_PARAM) {
      setError(t.auth.profileSessionMismatch);
    }
  }, [searchParams, t.auth.oauthFailed, t.auth.profileSessionMismatch]);

  async function finishSession(displayName?: string) {
    await completeAuthSession(supabase, {
      mode: isSignup ? "signup" : "login",
      displayName,
    });
  }

  async function goAfterAuth(message: string) {
    setSuccess(message);
    const {
      data: { user: sessionUser },
    } = await supabase.auth.getUser();
    let destination = DASHBOARD_PATH;
    if (sessionUser) {
      const profile = await fetchUserProfile(supabase, sessionUser.id);
      if (profile && profile.id !== sessionUser.id) {
        await supabase.auth.signOut();
        setError(t.auth.profileSessionMismatch);
        setLoading(false);
        return;
      }
      destination = resolvePostLoginPath(profile, searchParams.get("next"));
    }
    await new Promise((resolve) => setTimeout(resolve, 600));
    router.push(destination);
    router.refresh();
  }

  async function handleEmailAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setInfo(null);
    setSignupDebug(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const name = String(form.get("name") ?? "").trim();
    const passwordField = isSignup ? password : String(form.get("password") ?? "");

    const rateAction = isSignup ? "auth_signup" : "auth_login";
    const limit = checkRateLimit(rateAction, email.toLowerCase() || "anonymous");
    if (!limit.ok) {
      setError(rateLimitMessage(limit.retryAfterSec));
      setLoading(false);
      return;
    }

    try {
      if (isSignup) {
        if (!passwordMeetsPolicy(passwordField)) {
          setError(t.auth.weakPassword);
          return;
        }
        const emailRedirectTo = getAuthCallbackUrl(DASHBOARD_PATH);
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password: passwordField,
          options: {
            data: { display_name: name || undefined },
            emailRedirectTo,
          },
        });

        logSignupResponseDev(data, signUpError, emailRedirectTo);
        if (showSignupDebug) {
          setSignupDebug(buildSignupDebugSnapshot(data, signUpError, emailRedirectTo));
        }

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        if (data.session && data.user) {
          await finishSession(name);
          await goAfterAuth(t.auth.signupSuccess);
          return;
        }

        if (data.user && !data.session) {
          setInfo(t.auth.checkEmail);
          return;
        }

        setError(t.auth.errorGeneric);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: passwordField,
      });

      if (signInError) throw signInError;

      await finishSession();
      await goAfterAuth(t.auth.loginSuccess);
    } catch (err) {
      if (isSignup) {
        const message = err instanceof Error ? err.message : t.auth.errorGeneric;
        setError(message || t.auth.errorGeneric);
      } else {
        setError(formatAuthError(err, authMessages));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setSuccess(null);
    setInfo(null);
    setLoading(true);

    const oauthReturn =
      resolveLoginReturnPath(searchParams.get("next")) ?? DASHBOARD_PATH;

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getAuthCallbackUrl(oauthReturn),
          queryParams: {
            prompt: "select_account consent",
            access_type: "offline",
          },
        },
      });

      if (oauthError) throw oauthError;
    } catch (err) {
      setError(formatAuthError(err, authMessages));
      setLoading(false);
    }
  }

  if (info) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-10 sm:py-16">
        <div className="card-elevated w-full max-w-md rounded-3xl p-6 text-center sm:p-10">
          <Logo variant="form" />
          <h1 className="font-heading mt-6 text-2xl font-semibold text-foreground">{copy.successTitle}</h1>
          <p className="mt-2 text-sm text-brand-teal" role="status">
            {info}
          </p>
          <Button href="/login" className="mt-6" size="lg">
            {t.auth.login.submit}
          </Button>
          {showSignupDebug && signupDebug ? <SignupDebugPanel snapshot={signupDebug} /> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10 sm:py-16">
      <div className="w-full min-w-0 max-w-md">
        <Logo variant="form" />
        <h1 className="font-heading mt-6 text-center text-xl font-semibold text-foreground sm:mt-8 sm:text-2xl">
          {copy.title}
        </h1>
        <p className="mt-2 text-center text-sm text-muted sm:text-base">{copy.subtitle}</p>

        <div className="card-elevated mt-6 space-y-5 rounded-3xl p-5 sm:mt-8 sm:p-8">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            size="lg"
            disabled={loading}
            onClick={handleGoogle}
          >
            {t.auth.continueWithGoogle}
          </Button>

          <p className="text-center text-xs text-muted">{t.auth.orContinueWithEmail}</p>

          <form onSubmit={handleEmailAuth} className="space-y-5">
            {isSignup && (
              <div>
                <label htmlFor="name" className="text-sm font-medium text-foreground">
                  {t.auth.fullName}
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder={t.auth.namePlaceholder}
                  className="input-field mt-1"
                  disabled={loading}
                />
              </div>
            )}
            <div>
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                {t.auth.email}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder={t.auth.emailPlaceholder}
                className="input-field mt-1"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                {t.auth.password}
              </label>
              {isSignup ? (
                <>
                  <PasswordInput
                    id="password"
                    name="password"
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    containerClassName="mt-1"
                    disabled={loading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <p className="mt-2 text-xs text-muted">{t.auth.passwordPolicyHint}</p>
                  <PasswordPolicyChecklist password={password} rules={t.auth.passwordRules} />
                </>
              ) : (
                <>
                  <PasswordInput
                    id="password"
                    name="password"
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    containerClassName="mt-1"
                    disabled={loading}
                  />
                  <p className="mt-2 text-center sm:text-left">
                    <Link
                      href="/forgot-password"
                      className="text-sm font-semibold text-brand-pink hover:underline"
                    >
                      {t.auth.forgotPassword}
                    </Link>
                  </p>
                </>
              )}
            </div>
            {isSignup && <p className="text-xs text-muted">{t.auth.signup.terms}</p>}
            {error ? (
              <p className={STATUS_ALERT_ERROR_CLASS} role="alert">
                {error}
              </p>
            ) : null}
            {showSignupDebug && isSignup && signupDebug ? (
              <SignupDebugPanel snapshot={signupDebug} />
            ) : null}
            {success ? (
              <p className={STATUS_ALERT_SUCCESS_CLASS} role="status">
                {success}
              </p>
            ) : null}
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? t.auth.pleaseWait : copy.submit}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          {copy.switchPrompt}{" "}
          <Link href={isSignup ? "/login" : "/signup"} className="font-semibold text-brand-pink hover:underline">
            {copy.switchLink}
          </Link>
        </p>
      </div>
    </div>
  );
}
