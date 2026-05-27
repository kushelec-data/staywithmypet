"use client";

import { RoleModeGuardModal } from "@/components/role-mode/RoleModeGuardModal";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { resolveActiveMode } from "@/lib/profile-mode";
import {
  isSearchBlockedForProfile,
  requiredActiveModeForSearchPage,
  searchHrefForActiveMode,
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
      await performActiveModeSwitch({
        supabase,
        user,
        profile,
        targetMode,
        setProfileRow,
        refreshProfile,
      });
      router.push(searchHrefForActiveMode(targetMode));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not switch mode.");
    } finally {
      setSwitching(false);
    }
  }

  function handleCancel() {
    if (!profile) {
      router.push("/");
      return;
    }
    const mode = resolveActiveMode(profile.role, profile.active_mode);
    router.push(searchHrefForActiveMode(mode));
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
