"use client";

import Link from "next/link";
import { STATUS_ALERT_ERROR_CLASS, STATUS_ALERT_SUCCESS_CLASS } from "@/lib/status-colors";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { PasswordPolicyChecklist } from "@/components/auth/PasswordPolicyChecklist";
import { useLanguage } from "@/context/LanguageContext";
import { completeAuthSession } from "@/lib/auth-flow";
import { formatAuthError, isEmailNotConfirmedError } from "@/lib/auth-messages";
import { normalizeFullName } from "@/lib/name-format";
import { DASHBOARD_PATH, resolveLoginReturnPath, resolvePostLoginPath } from "@/lib/auth-routing";
import { getAuthCallbackUrl, getAuthConfirmUrl } from "@/lib/auth";
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
import { TermsAcceptanceCheckbox } from "@/components/legal/TermsAcceptanceCheckbox";
import { CURRENT_TERMS_VERSION, SIGNUP_TERMS_COOKIE } from "@/lib/terms-acceptance";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type AuthFormProps = {
  mode: "login" | "signup";
};

export function AuthForm({ mode }: AuthFormProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const submitGenerationRef = useRef(0);
  const isSignup = mode === "signup";
  const copy = isSignup ? t.auth.signup : t.auth.login;

  const authMessages = useMemo(
    () => ({
      errorGeneric: t.auth.errorGeneric,
      invalidCredentials: t.auth.invalidCredentials,
      emailAlreadyRegistered: t.auth.emailAlreadyRegistered,
      emailNotConfirmed: t.auth.emailNotConfirmed,
      weakPassword: t.auth.weakPassword,
      oauthFailed: t.auth.oauthFailed,
      profileCreateFailed: t.auth.profileCreateFailed,
    }),
    [t],
  );

  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [signupDebug, setSignupDebug] = useState<SignupDebugSnapshot | null>(null);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const showSignupDebug = isSignupDebugEnabled();

  const isSubmitActive = useCallback(
    (generation: number) => mountedRef.current && generation === submitGenerationRef.current,
    [],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      submitGenerationRef.current += 1;
    };
  }, []);

  useEffect(() => {
    setLoading(false);
    if (!isSignup) {
      setTermsAccepted(false);
    }
  }, [pathname, mode, isSignup]);

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setLoading(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

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

  async function resendVerificationEmail(email: string) {
    setResendLoading(true);
    setResendSuccess(null);
    setResendError(null);

    try {
      const limit = checkRateLimit("auth_resend", email.toLowerCase() || "anonymous");
      if (!limit.ok) {
        setResendError(rateLimitMessage(limit.retryAfterSec));
        return;
      }

      const emailRedirectTo = getAuthConfirmUrl(DASHBOARD_PATH);
      const { error: resendErr } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo },
      });

      if (resendErr) throw resendErr;
      setResendSuccess(t.auth.verificationEmailSent);
    } catch (err) {
      const message = err instanceof Error ? err.message : t.auth.errorGeneric;
      setResendError(message || t.auth.errorGeneric);
    } finally {
      setResendLoading(false);
    }
  }

  async function goAfterAuth(message: string, generation: number) {
    if (!isSubmitActive(generation)) return;
    setSuccess(message);
    setLoading(false);

    const {
      data: { user: sessionUser },
    } = await supabase.auth.getUser();
    if (!isSubmitActive(generation)) return;

    let destination = DASHBOARD_PATH;
    if (sessionUser) {
      const profile = await fetchUserProfile(supabase, sessionUser.id);
      if (!isSubmitActive(generation)) return;
      if (profile && profile.id !== sessionUser.id) {
        await supabase.auth.signOut();
        setError(t.auth.profileSessionMismatch);
        return;
      }
      destination = resolvePostLoginPath(profile, searchParams.get("next"));
    }

    await new Promise((resolve) => setTimeout(resolve, 600));
    if (!isSubmitActive(generation)) return;
    router.push(destination);
    router.refresh();
  }

  async function handleEmailAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const generation = ++submitGenerationRef.current;

    setError(null);
    setSuccess(null);
    setInfo(null);
    setSignupDebug(null);
    setEmailNotConfirmed(false);
    setResendSuccess(null);
    setResendError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const name = normalizeFullName(isSignup ? fullName : String(form.get("name") ?? ""));
    if (isSignup && name !== fullName) {
      setFullName(name);
    }
    const passwordField = isSignup ? password : String(form.get("password") ?? "");

    try {
      const rateAction = isSignup ? "auth_signup" : "auth_login";
      const limit = checkRateLimit(rateAction, email.toLowerCase() || "anonymous");
      if (!limit.ok) {
        if (isSubmitActive(generation)) {
          setError(rateLimitMessage(limit.retryAfterSec));
        }
        return;
      }

      if (isSignup) {
        if (!termsAccepted) {
          if (isSubmitActive(generation)) setError(t.termsAcceptance.errors.acceptanceRequired);
          return;
        }
        if (!passwordMeetsPolicy(passwordField)) {
          if (isSubmitActive(generation)) setError(t.auth.weakPassword);
          return;
        }
        const emailRedirectTo = getAuthConfirmUrl(DASHBOARD_PATH);
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password: passwordField,
          options: {
            data: {
              display_name: name || undefined,
              terms_version_accepted: CURRENT_TERMS_VERSION,
            },
            emailRedirectTo,
          },
        });

        if (!isSubmitActive(generation)) return;

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
          if (!isSubmitActive(generation)) return;
          try {
            const { recordTermsAcceptanceAction } = await import("@/app/actions/terms-acceptance");
            await recordTermsAcceptanceAction({ context: "signup" });
          } catch {
            /* metadata sync on next session will backfill */
          }
          await goAfterAuth(t.auth.signupSuccess, generation);
          return;
        }

        if (data.user && !data.session) {
          setVerificationEmail(email);
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

      if (!isSubmitActive(generation)) return;

      if (signInError) throw signInError;

      await finishSession();
      if (!isSubmitActive(generation)) return;
      await goAfterAuth(t.auth.loginSuccess, generation);
    } catch (err) {
      if (!isSubmitActive(generation)) return;
      if (isSignup) {
        const message = err instanceof Error ? err.message : t.auth.errorGeneric;
        setError(message || t.auth.errorGeneric);
      } else if (isEmailNotConfirmedError(err)) {
        setVerificationEmail(email);
        setEmailNotConfirmed(true);
        setError(formatAuthError(err, authMessages));
      } else {
        setError(formatAuthError(err, authMessages));
      }
    } finally {
      if (isSubmitActive(generation)) {
        setLoading(false);
      }
    }
  }

  async function handleGoogle() {
    const generation = ++submitGenerationRef.current;
    setError(null);
    setSuccess(null);
    setInfo(null);
    setLoading(true);

    if (isSignup && !termsAccepted) {
      if (isSubmitActive(generation)) {
        setError(t.termsAcceptance.errors.acceptanceRequired);
        setLoading(false);
      }
      return;
    }

    const oauthReturn =
      resolveLoginReturnPath(searchParams.get("next")) ?? DASHBOARD_PATH;

    try {
      if (isSignup) {
        document.cookie = `${SIGNUP_TERMS_COOKIE}=${CURRENT_TERMS_VERSION}; path=/; max-age=600; SameSite=Lax`;
      }
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
      if (isSubmitActive(generation)) {
        setError(formatAuthError(err, authMessages));
      }
    } finally {
      if (isSubmitActive(generation)) {
        setLoading(false);
      }
    }
  }

  if (info) {
    return (
      <div className="px-4 py-10 sm:py-16">
        <div className="mx-auto w-full max-w-3xl">
          <div className="card-elevated rounded-3xl p-6 text-center sm:p-10">
            <Logo variant="form" />
            <h1 className="font-heading mt-6 text-2xl font-semibold text-foreground">{copy.successTitle}</h1>
            <p className="mt-2 text-sm text-brand-teal" role="status">
              {info}
            </p>
            {resendSuccess ? (
              <p className={`mt-3 ${STATUS_ALERT_SUCCESS_CLASS}`} role="status">
                {resendSuccess}
              </p>
            ) : null}
            {resendError ? (
              <p className={`mt-3 ${STATUS_ALERT_ERROR_CLASS}`} role="alert">
                {resendError}
              </p>
            ) : null}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                disabled={resendLoading || !verificationEmail}
                onClick={() => void resendVerificationEmail(verificationEmail)}
              >
                {resendLoading ? t.auth.pleaseWait : t.auth.resendVerificationEmail}
              </Button>
              <Button href="/login" size="lg">
                {t.auth.login.submit}
              </Button>
            </div>
            {showSignupDebug && signupDebug ? <SignupDebugPanel snapshot={signupDebug} /> : null}
          </div>
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
            disabled={loading || (isSignup && !termsAccepted)}
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
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onBlur={() => setFullName((current) => normalizeFullName(current))}
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
            {isSignup ? (
              <TermsAcceptanceCheckbox
                variant="signup"
                id="signup-terms"
                checked={termsAccepted}
                onCheckedChange={setTermsAccepted}
                disabled={loading}
              />
            ) : null}
            {error ? (
              <p className={STATUS_ALERT_ERROR_CLASS} role="alert">
                {error}
              </p>
            ) : null}
            {emailNotConfirmed && verificationEmail ? (
              <div className="space-y-3">
                {resendSuccess ? (
                  <p className={STATUS_ALERT_SUCCESS_CLASS} role="status">
                    {resendSuccess}
                  </p>
                ) : null}
                {resendError ? (
                  <p className={STATUS_ALERT_ERROR_CLASS} role="alert">
                    {resendError}
                  </p>
                ) : null}
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  size="lg"
                  disabled={resendLoading}
                  onClick={() => void resendVerificationEmail(verificationEmail)}
                >
                  {resendLoading ? t.auth.pleaseWait : t.auth.resendVerificationEmail}
                </Button>
              </div>
            ) : null}
            {showSignupDebug && isSignup && signupDebug ? (
              <SignupDebugPanel snapshot={signupDebug} />
            ) : null}
            {success ? (
              <p className={STATUS_ALERT_SUCCESS_CLASS} role="status">
                {success}
              </p>
            ) : null}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading || (isSignup && !termsAccepted)}
            >
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
