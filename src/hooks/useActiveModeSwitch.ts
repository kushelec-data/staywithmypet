"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { useLanguage } from "@/context/LanguageContext";
import { createClient } from "@/lib/supabase";
import { performActiveModeSwitch } from "@/lib/switch-active-mode";
import { resolveActiveMode, type ProfileActiveMode } from "@/lib/profile-mode";
import { DASHBOARD_PATH } from "@/lib/auth-routing";

type UseActiveModeSwitchOptions = {
  onSuccess?: () => void;
};

export function useActiveModeSwitch(options?: UseActiveModeSwitchOptions) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { profile, refreshProfile, setProfileRow } = useProfile();
  const supabase = useMemo(() => createClient(), []);
  const [switchingMode, setSwitchingMode] = useState<string | null>(null);
  const [modeError, setModeError] = useState<string | null>(null);

  const isMembershipRoute =
    pathname === "/membership" || pathname.startsWith("/membership/");

  async function handleModeSwitch(targetMode: ProfileActiveMode) {
    if (!user || switchingMode) return;
    if (!profile) {
      setModeError(t.account.profileStillLoading);
      return;
    }
    if (resolveActiveMode(profile.role, profile.active_mode) === targetMode) return;

    setSwitchingMode(targetMode);
    setModeError(null);
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
        const message =
          result.code === "unsupported_mode"
            ? t.account.completeSetupBeforeSwitchingRoles
            : result.message;
        setModeError(message);
        return;
      }
      options?.onSuccess?.();
      if (isMembershipRoute) {
        router.refresh();
      } else {
        router.push(DASHBOARD_PATH);
        router.refresh();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t.account.couldNotSwitchMode;
      setModeError(message);
    } finally {
      setSwitchingMode(null);
    }
  }

  return { switchingMode, modeError, handleModeSwitch, setModeError };
}
