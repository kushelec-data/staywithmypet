"use client";

import { RoleModeGuardModal } from "@/components/role-mode/RoleModeGuardModal";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useProfile } from "@/context/ProfileContext";
import { DASHBOARD_PATH } from "@/lib/auth-routing";
import {
  isSearchBlockedForProfile,
  requiredActiveModeForSearchPage,
  type RoleModeSearchPage,
} from "@/lib/role-mode-search";
import { performActiveModeSwitch } from "@/lib/switch-active-mode";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type RoleModeSearchGuardProps = {
  page: RoleModeSearchPage;
  children: React.ReactNode;
};

export function RoleModeSearchGuard({ page, children }: RoleModeSearchGuardProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, setProfileRow, refreshProfile } = useProfile();
  const supabase = useMemo(() => createClient(), []);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blocked = useMemo(() => {
    if (authLoading || profileLoading || !user || !profile) return false;
    return isSearchBlockedForProfile(profile, page);
  }, [authLoading, profileLoading, user, profile, page]);

  const targetMode = requiredActiveModeForSearchPage(page);

  async function handleSwitch() {
    if (!user || !profile || switching) return;
    setSwitching(true);
    setError(null);
    try {
      const result = await performActiveModeSwitch({
        supabase,
        user,
        profile,
        targetMode,
        setProfileRow,
        refreshProfile,
      });
      if (!result.ok) {
        setError(
          result.code === "unsupported_mode"
            ? t.account.completeSetupBeforeSwitchingRoles
            : result.message,
        );
        return;
      }
      router.push(DASHBOARD_PATH);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.account.couldNotSwitchMode);
    } finally {
      setSwitching(false);
    }
  }

  function handleCancel() {
    router.push(profile ? DASHBOARD_PATH : "/");
  }

  return (
    <>
      <div
        className={blocked ? "pointer-events-none select-none opacity-40" : undefined}
        aria-hidden={blocked ? true : undefined}
      >
        {children}
      </div>
      <RoleModeGuardModal
        open={blocked}
        page={page}
        switching={switching}
        error={error}
        onSwitch={handleSwitch}
        onCancel={handleCancel}
      />
    </>
  );
}
