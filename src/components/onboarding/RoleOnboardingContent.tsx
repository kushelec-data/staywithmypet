"use client";

import { STATUS_ALERT_ERROR_CLASS } from "@/lib/status-colors";
import { RoleOnboardingIllustration } from "@/components/onboarding/RoleOnboardingIllustration";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useProfile } from "@/context/ProfileContext";
import { DASHBOARD_PATH } from "@/lib/auth-routing";
import { initialActiveModeForRole } from "@/lib/profile-mode";
import { saveUserRole, type ProfileRole } from "@/lib/profile-setup";
import { needsRoleOnboarding } from "@/lib/profile-utils";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

/** Roles offered during first-time onboarding (existing `both` profiles are unchanged). */
type OnboardingRole = Exclude<ProfileRole, "both">;

function isOnboardingRole(value: string | null | undefined): value is OnboardingRole {
  return value === "pet_parent" || value === "pet_friend";
}

function RoleOnboardingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:py-14">
      <div className="mb-6 flex justify-center lg:mb-8">
        <Logo className="h-10 w-auto" />
      </div>
      {children}
    </div>
  );
}

export function RoleOnboardingContent() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, refreshProfile, setProfileRow } = useProfile();
  const supabase = useMemo(() => createClient(), []);

  const [role, setRole] = useState<OnboardingRole>("pet_friend");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roleOptions: {
    value: OnboardingRole;
    label: string;
    description: string;
  }[] = [
    {
      value: "pet_parent",
      label: t.roles.petParent.label,
      description: t.onboarding.role.petParentDescription,
    },
    {
      value: "pet_friend",
      label: t.roles.petFriend.label,
      description: t.onboarding.role.petFriendDescription,
    },
  ];

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!profileLoading && profile && !needsRoleOnboarding(profile)) {
      router.replace(DASHBOARD_PATH);
    }
  }, [authLoading, user, profile, profileLoading, router]);

  useEffect(() => {
    if (!profile?.role || !needsRoleOnboarding(profile)) return;
    if (isOnboardingRole(profile.role)) {
      setRole(profile.role);
      return;
    }
    setRole(initialActiveModeForRole(profile.role));
  }, [profile]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError(null);
    try {
      const saved = await saveUserRole(supabase, user.id, role, {
        user,
        existingDisplayName: profile?.display_name,
      });
      setProfileRow(saved);
      const { sendWelcomeEmailsAction } = await import("@/app/actions/email-events");
      void sendWelcomeEmailsAction(role);
      await refreshProfile();
      router.push(DASHBOARD_PATH);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : t.onboarding.role.saveError;
      console.error("[profile] role onboarding failed", message);
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || profileLoading || !user) {
    return (
      <RoleOnboardingShell>
        <p className="text-center text-sm text-muted">{t.onboarding.role.loading}</p>
      </RoleOnboardingShell>
    );
  }

  if (!needsRoleOnboarding(profile)) {
    return (
      <RoleOnboardingShell>
        <p className="text-center text-sm text-muted">{t.onboarding.role.redirecting}</p>
      </RoleOnboardingShell>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:py-14">
      <div className="mb-6 flex justify-center lg:mb-8">
        <Logo className="h-10 w-auto" />
      </div>

      <div className="card-elevated overflow-hidden rounded-3xl">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(280px,42%)] lg:items-stretch">
          <div className="order-2 space-y-6 p-6 sm:p-8 lg:order-1">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-teal">
                {t.onboarding.role.eyebrow}
              </p>
              <h1 className="font-heading mt-2 text-2xl font-semibold text-foreground sm:text-3xl">
                {t.onboarding.role.title}
              </h1>
              <p className="mt-2 text-sm text-muted">{t.onboarding.role.subtitle}</p>
            </div>

            {error ? (
              <p
                className={STATUS_ALERT_ERROR_CLASS}
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-6">
              <fieldset>
                <legend className="sr-only">{t.onboarding.role.legend}</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {roleOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`cursor-pointer rounded-2xl border p-4 transition-colors ${
                        role === option.value
                          ? "border-brand-teal/40 bg-mint/40 ring-1 ring-brand-teal/20"
                          : "border-black/5 bg-surface hover:bg-mint/20"
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={option.value}
                        checked={role === option.value}
                        onChange={() => setRole(option.value)}
                        className="sr-only"
                      />
                      <span className="font-heading text-sm font-semibold text-foreground">
                        {option.label}
                      </span>
                      <p className="mt-1 text-xs text-muted">{option.description}</p>
                    </label>
                  ))}
                </div>
              </fieldset>

              <Button type="submit" variant="primary" disabled={saving} className="w-full sm:w-auto">
                {saving ? t.onboarding.role.saving : t.onboarding.role.continue}
              </Button>
            </form>
          </div>

          <div className="relative order-1 p-4 pb-0 sm:p-5 sm:pb-0 lg:order-2 lg:p-0">
            <RoleOnboardingIllustration />
          </div>
        </div>
      </div>
    </div>
  );
}
