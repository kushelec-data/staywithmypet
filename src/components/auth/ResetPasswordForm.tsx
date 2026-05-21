"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { PasswordPolicyChecklist } from "@/components/auth/PasswordPolicyChecklist";
import { useLanguage } from "@/context/LanguageContext";
import { signOut } from "@/lib/auth";
import { formatAuthError } from "@/lib/auth-messages";
import { passwordMeetsPolicy } from "@/lib/password-policy";
import { createClient } from "@/lib/supabase";
import { useEffect, useMemo, useState } from "react";

export function ResetPasswordForm() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

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

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setError(null);
      const code = searchParams.get("code");

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (exchangeError) {
          setSessionReady(false);
          setError(notReadyMessage);
          setInitializing(false);
          return;
        }
        router.replace("/reset-password");
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
  }, [searchParams, supabase, router, notReadyMessage]);

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
            <p className="text-center text-sm text-brand-pink" role="alert">
              {error ?? notReadyMessage}
            </p>
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
                <p className="rounded-xl bg-brand-pink-muted/50 px-3 py-2 text-sm text-brand-pink" role="alert">
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
