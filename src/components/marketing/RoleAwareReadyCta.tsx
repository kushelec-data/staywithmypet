"use client";

import { CtaBanner } from "@/components/ui/CtaBanner";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { useLanguage } from "@/context/LanguageContext";
import { resolveActiveMode } from "@/lib/profile-mode";

type RoleAwareReadyCtaProps = {
  withPageShell?: boolean;
  className?: string;
};

export function RoleAwareReadyCta({ withPageShell = true, className }: RoleAwareReadyCtaProps) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { t } = useLanguage();

  if (authLoading || (user && profileLoading)) {
    return null;
  }

  if (!user) {
    const guest = t.readyCta.guest;
    return (
      <CtaBanner
        heading={guest.title}
        subtext={guest.description}
        primaryLabel={guest.primaryLabel}
        primaryHref={guest.primaryHref}
        secondaryLabel={guest.secondaryLabel}
        secondaryHref={guest.secondaryHref}
        withPageShell={withPageShell}
        className={className}
      />
    );
  }

  if (!profile) {
    return null;
  }

  const mode = resolveActiveMode(profile.role, profile.active_mode);

  if (mode === "pet_friend") {
    const copy = t.readyCta.petFriend;
    return (
      <CtaBanner
        heading={copy.title}
        subtext={copy.subtitle}
        primaryLabel={copy.primaryLabel}
        primaryHref={copy.primaryHref}
        withPageShell={withPageShell}
        className={className}
      />
    );
  }

  const copy = t.readyCta.petParent;
  return (
    <CtaBanner
      heading={copy.title}
      subtext={copy.subtitle}
      primaryLabel={copy.primaryLabel}
      primaryHref={copy.primaryHref}
      withPageShell={withPageShell}
      className={className}
    />
  );
}
