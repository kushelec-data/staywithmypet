"use client";

import { STATUS_ALERT_ERROR_CLASS, STATUS_ALERT_WARNING_CLASS } from "@/lib/status-colors";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { PasswordPolicyChecklist } from "@/components/auth/PasswordPolicyChecklist";
import { useLanguage } from "@/context/LanguageContext";
import { signOut } from "@/lib/auth";
import { formatAuthError } from "@/lib/auth-messages";
import {
  buildAuthConfirmPath,
  parseAuthHash,
  PASSWORD_RESET_PATH,
} from "@/lib/auth-recovery";
import {
  captureRecoveryUrlDebug,
  isRecoveryDebugEnabled,
  logRecoveryExchangeDev,
  logRecoveryUrlDebug,
} from "@/lib/auth-recovery-dev";
import { passwordMeetsPolicy } from "@/lib/password-policy";
import { createClient } from "@/lib/supabase";
import { useEffect, useMemo, useRef, useState } from "react";

function RecoveryDebugPanel({ snapshot }: { snapshot: NonNullable<ReturnType<typeof captureRecoveryUrlDebug>> }) {
  return (
    <aside className={`mt-4 p-4 text-left text-xs ${STATUS_ALERT_WARNING_CLASS} rounded-2xl`}>
      <p className="font-semibold uppercase tracking-wide text-status-warning-text">Recovery debug (dev/test)</p>
      <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all font-mono text-status-warning-text">
        {JSON.stringify(snapshot, null, 2)}
      </pre>
    </aside>
  );
}

export function ResetPasswordForm() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const handledRef = useRef(false);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [debugSnapshot, setDebugSnapshot] = useState<ReturnType<typeof captureRecoveryUrlDebug>>(null);

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

  const notReadyMessage = t.auth.resetPasswordPage.notReady;
  const showRecoveryDebug = isRecoveryDebugEnabled();

  useEffect(() => {
    if (handledRef.current) return;
    let cancelled = false;

    async function init() {
      setError(null);

      if (showRecoveryDebug) {
        logRecoveryUrlDebug("reset-password-init");
        setDebugSnapshot(captureRecoveryUrlDebug());
      }

      const recoveryError = searchParams.get("recovery_error");
      if (recoveryError) {
        if (cancelled) return;
        setSessionReady(false);
        setError(decodeURIComponent(recoveryError));
        setInitializing(false);
        return;
      }

      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");

      if (code || (tokenHash && type)) {
        handledRef.current = true;
        const confirmPath = buildAuthConfirmPath({
          code,
          token_hash: tokenHash,
          type,
          next: PASSWORD_RESET_PATH,
        });
        if (showRecoveryDebug) {
          console.info("[auth:recovery:redirect-to-confirm]", { confirmPath, code: Boolean(code), tokenHash: Boolean(tokenHash), type });
        }
        window.location.replace(confirmPath);
        return;
      }

      const hashParams =
        typeof window !== "undefined" ? parseAuthHash(window.location.hash) : {};
      const accessToken = hashParams.access_token;
      const refreshToken = hashParams.refresh_token;
      const hashType = hashParams.type ?? null;

      if (accessToken && refreshToken) {
        handledRef.current = true;
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        logRecoveryExchangeDev("setSession", {
          method: "setSession",
          error: setSessionError?.message ?? null,
        });

        if (showRecoveryDebug) {
          console.info("[auth:recovery:hash]", {
            recoveryType: hashType,
            hasAccessToken: true,
            hasRefreshToken: true,
          });
        }

        window.history.replaceState(null, "", PASSWORD_RESET_PATH);

        if (setSessionError) {
          if (cancelled) return;
          setSessionReady(false);
          setError(setSessionError.message || notReadyMessage);
          setInitializing(false);
          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      let active = session;
      if (!active) {
        await new Promise((r) => setTimeout(r, 350));
        const second = await supabase.auth.getSession();
        active = second.data.session;
      }

      if (cancelled) return;

      if (active) {
        setSessionReady(true);
        setError(null);
      } else {
        setSessionReady(false);
        setError(notReadyMessage);
      }
      setInitializing(false);
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [searchParams, supabase, notReadyMessage, showRecoveryDebug]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!passwordMeetsPolicy(password)) {
      setError(t.auth.weakPassword);
      return;
    }
    if (password !== confirm) {
      setError(t.auth.resetPasswordPage.mismatch);
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      await signOut();
      router.push("/login?passwordReset=1");
      router.refresh();
    } catch (err) {
      setError(formatAuthError(err, authMessages));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <Logo variant="form" />
        <h1 className="font-heading mt-8 text-center text-2xl font-semibold text-foreground">
          {t.auth.resetPasswordPage.title}
        </h1>
        <p className="mt-2 text-center text-muted">{t.auth.resetPasswordPage.subtitle}</p>

        <div className="card-elevated mt-8 space-y-5 rounded-3xl p-8">
          {initializing ? (
            <p className="text-center text-sm text-muted">{t.auth.pleaseWait}</p>
          ) : !sessionReady ? (
            <>
              <p className="text-center text-sm text-brand-pink" role="alert">
                {error ?? notReadyMessage}
              </p>
              {showRecoveryDebug && debugSnapshot ? (
                <RecoveryDebugPanel snapshot={debugSnapshot} />
              ) : null}
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="new-password" className="text-sm font-medium text-foreground">
                  {t.auth.password}
                </label>
                <PasswordInput
                  id="new-password"
                  name="new_password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  containerClassName="mt-1"
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="mt-2 text-xs text-muted">{t.auth.passwordPolicyHint}</p>
                <PasswordPolicyChecklist password={password} rules={t.auth.passwordRules} />
              </div>
              <div>
                <label htmlFor="confirm-password" className="text-sm font-medium text-foreground">
                  {t.auth.resetPasswordPage.confirmLabel}
                </label>
                <PasswordInput
                  id="confirm-password"
                  name="confirm_password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  containerClassName="mt-1"
                  disabled={loading}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              {error ? (
                <p className={STATUS_ALERT_ERROR_CLASS} role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? t.auth.pleaseWait : t.auth.resetPasswordPage.submit}
              </Button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/login" className="font-semibold text-brand-pink hover:underline">
            {t.auth.forgotPasswordPage.backToLogin}
          </Link>
        </p>
      </div>
    </div>
  );
}
