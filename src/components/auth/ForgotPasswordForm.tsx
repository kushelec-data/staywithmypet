"use client";

import { STATUS_ALERT_ERROR_CLASS } from "@/lib/status-colors";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { useLanguage } from "@/context/LanguageContext";
import { getAuthRedirectOrigin } from "@/lib/auth";
import { formatAuthError } from "@/lib/auth-messages";
import { createClient } from "@/lib/supabase";
import { useMemo, useState } from "react";

export function ForgotPasswordForm() {
  const { t } = useLanguage();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();

    try {
      const origin = getAuthRedirectOrigin();
      const redirectTo = `${origin}/auth/confirm?next=${encodeURIComponent("/reset-password")}`;
      if (process.env.NODE_ENV !== "production") {
        console.info("[auth:recovery:forgot-password]", { redirectTo });
      }
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (resetError) throw resetError;
      setDone(true);
    } catch (err) {
      setError(formatAuthError(err, authMessages));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
        <div className="card-elevated w-full max-w-md rounded-3xl p-10 text-center">
          <Logo variant="form" />
          <h1 className="font-heading mt-6 text-2xl font-semibold text-foreground">
            {t.auth.forgotPasswordPage.title}
          </h1>
          <p className="mt-3 text-sm text-brand-teal" role="status">
            {t.auth.forgotPasswordPage.success}
          </p>
          <Button href="/login" className="mt-6" size="lg">
            {t.auth.forgotPasswordPage.backToLogin}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <Logo variant="form" />
        <h1 className="font-heading mt-8 text-center text-2xl font-semibold text-foreground">
          {t.auth.forgotPasswordPage.title}
        </h1>
        <p className="mt-2 text-center text-muted">{t.auth.forgotPasswordPage.subtitle}</p>

        <div className="card-elevated mt-8 space-y-5 rounded-3xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="forgot-email" className="text-sm font-medium text-foreground">
                {t.auth.email}
              </label>
              <input
                id="forgot-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder={t.auth.emailPlaceholder}
                className="input-field mt-1"
                disabled={loading}
              />
            </div>
            {error ? (
              <p className={STATUS_ALERT_ERROR_CLASS} role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? t.auth.pleaseWait : t.auth.forgotPasswordPage.submit}
            </Button>
          </form>
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
