"use client";

import { PasswordPolicyChecklist } from "@/components/auth/PasswordPolicyChecklist";
import { AccountCard } from "@/components/account/AccountCard";
import { AccountLayout } from "@/components/account/AccountLayout";
import { ACCOUNT_ALERT_SUCCESS_CLASS, ACCOUNT_CARD_CLASS } from "@/lib/account-ui";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { passwordMeetsPolicy } from "@/lib/password-policy";
import { createClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { useMemo, useState } from "react";

function hasEmailPasswordIdentity(user: User): boolean {
  return user.identities?.some((i) => i.provider === "email") ?? false;
}

function googleOnlySocialUser(user: User): boolean {
  if (hasEmailPasswordIdentity(user)) return false;
  if (user.app_metadata?.provider === "google") return true;
  return user.identities?.some((i) => i.provider === "google") ?? false;
}

function formatProviderDisplay(provider: string) {
  const map: Record<string, string> = {
    google: "Google",
    github: "GitHub",
    apple: "Apple",
    facebook: "Facebook",
    twitter: "Twitter",
    discord: "Discord",
    twitch: "Twitch",
    slack: "Slack",
    linkedin: "LinkedIn",
    azure: "Microsoft",
    kakao: "Kakao",
    notion: "Notion",
    spotify: "Spotify",
    workos: "WorkOS",
  };
  if (map[provider]) return map[provider];
  return provider.slice(0, 1).toUpperCase() + provider.slice(1).toLowerCase();
}

export function ChangePasswordPageContent() {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!user?.email || !hasEmailPasswordIdentity(user)) return;

    const email = user.email;

    if (!passwordMeetsPolicy(newPassword)) {
      setError(t.auth.weakPassword);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t.auth.changePasswordPage.mismatch);
      return;
    }

    setSubmitting(true);
    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (verifyError) {
        setError(t.auth.changePasswordPage.errorUpdateFailed);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        setError(t.auth.changePasswordPage.errorUpdateFailed);
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(t.auth.changePasswordPage.success);
    } catch {
      setError(t.auth.changePasswordPage.errorUpdateFailed);
    } finally {
      setSubmitting(false);
    }
  }

  const copy = t.auth.changePasswordPage;

  return (
    <AccountLayout
      title="Change password"
      description="Manage how you sign in to StayWithMyPet."
      hideCompleteProfileBanner
    >
      {loading ? (
        <p className="text-sm text-muted">Loading account…</p>
      ) : !user ? (
        <p className="text-sm text-muted">You need to be signed in to change your password.</p>
      ) : !hasEmailPasswordIdentity(user) ? (
        <AccountCard className="max-w-lg p-6 sm:p-8">
          <p className="text-sm leading-relaxed text-foreground">
            {googleOnlySocialUser(user)
              ? copy.googleOnlyMessage
              : copy.oauthManaged.replace(
                  "{provider}",
                  formatProviderDisplay(
                    (user.app_metadata?.provider as string | undefined) ??
                      user.identities?.find((i) => i.provider !== "email")?.provider ??
                      "OAuth",
                  ),
                )}
          </p>
          {googleOnlySocialUser(user) ? (
            <Button
              href="https://myaccount.google.com/security"
              variant="outline"
              size="sm"
              className="mt-5"
            >
              Open Google account security
            </Button>
          ) : null}
        </AccountCard>
      ) : (
        <form
          onSubmit={handleSubmit}
          className={`${ACCOUNT_CARD_CLASS} max-w-lg space-y-5 p-6 sm:p-8`}
        >
          <div>
            <label htmlFor="user_current_password" className="text-sm font-medium text-foreground">
              {copy.currentPasswordLabel}
            </label>
            <PasswordInput
              id="user_current_password"
              name="user_current_password"
              autoComplete="current-password"
              placeholder={copy.currentPasswordPlaceholder}
              containerClassName="mt-1"
              disabled={submitting}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="user_new_password" className="text-sm font-medium text-foreground">
              {copy.newPasswordLabel}
            </label>
            <PasswordInput
              id="user_new_password"
              name="user_new_password"
              autoComplete="new-password"
              placeholder={copy.newPasswordPlaceholder}
              containerClassName="mt-1"
              disabled={submitting}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <p className="mt-2 text-xs text-muted">{t.auth.passwordPolicyHint}</p>
            <PasswordPolicyChecklist password={newPassword} rules={t.auth.passwordRules} />
          </div>
          <div>
            <label htmlFor="user_confirm_password" className="text-sm font-medium text-foreground">
              {copy.confirmPasswordLabel}
            </label>
            <PasswordInput
              id="user_confirm_password"
              name="user_confirm_password"
              autoComplete="new-password"
              placeholder={copy.confirmPasswordPlaceholder}
              containerClassName="mt-1"
              disabled={submitting}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          {error ? (
            <p className="rounded-xl bg-brand-pink-muted/50 px-3 py-2 text-sm text-brand-pink" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className={ACCOUNT_ALERT_SUCCESS_CLASS} role="status">
              {success}
            </p>
          ) : null}
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? t.auth.pleaseWait : copy.submit}
          </Button>
        </form>
      )}
    </AccountLayout>
  );
}
