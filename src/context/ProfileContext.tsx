"use client";

import { fetchUserProfile } from "@/lib/profile-load";
import { ensureUserProfile } from "@/lib/profile";
import {
  isProfileIncomplete,
  needsRoleOnboarding,
  profileDisplayLabel,
  type ProfileRow,
} from "@/lib/profile-utils";
import { DASHBOARD_REFRESH_EVENT } from "@/lib/dashboard-refresh";
import { createClient } from "@/lib/supabase";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/context/AuthContext";

export type RefreshProfileOptions = {
  /** Do not block UI with loading state (e.g. dashboard background refresh). */
  background?: boolean;
};

type ProfileContextValue = {
  profile: ProfileRow | null;
  loading: boolean;
  displayName: string;
  isIncomplete: boolean;
  needsRoleOnboarding: boolean;
  refreshProfile: (options?: RefreshProfileOptions) => Promise<ProfileRow | null>;
  setProfileRow: (row: ProfileRow) => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const loadedUserIdRef = useRef<string | null>(null);
  const profileRef = useRef<ProfileRow | null>(null);
  profileRef.current = profile;
  const userRef = useRef(user);
  userRef.current = user;

  const setProfileRow = useCallback((row: ProfileRow) => {
    setProfile(row);
    loadedUserIdRef.current = row.id;
    setLoading(false);
  }, []);

  const refreshProfile = useCallback(
    async (options?: RefreshProfileOptions): Promise<ProfileRow | null> => {
      const currentUser = userRef.current;
      const userId = currentUser?.id;
      if (!userId) {
        setProfile(null);
        setLoading(false);
        loadedUserIdRef.current = null;
        return null;
      }

      const isInitialForUser = loadedUserIdRef.current !== userId;
      const showLoading = !options?.background && (isInitialForUser || !profileRef.current);

      if (showLoading) {
        setLoading(true);
      }

      try {
        let row = await fetchUserProfile(supabase, userId);

        if (!row) {
          await ensureUserProfile(supabase, currentUser);
          row = await fetchUserProfile(supabase, userId);
        }

        setProfile(row);
        loadedUserIdRef.current = userId;
        return row;
      } catch (err) {
        console.error("[profile] refresh failed", err instanceof Error ? err.message : err);
        if (isInitialForUser) {
          setProfile(null);
        }
        return profileRef.current;
      } finally {
        setLoading(false);
      }
    },
    [user?.id, supabase],
  );

  useEffect(() => {
    if (authLoading) return;

    const userId = user?.id;
    if (!userId) {
      setProfile(null);
      setLoading(false);
      loadedUserIdRef.current = null;
      return;
    }

    if (loadedUserIdRef.current === userId) {
      return;
    }

    refreshProfile();
  }, [authLoading, user?.id, refreshProfile]);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    const onDashboardRefresh = () => {
      refreshProfile({ background: true });
    };

    window.addEventListener(DASHBOARD_REFRESH_EVENT, onDashboardRefresh);
    return () => window.removeEventListener(DASHBOARD_REFRESH_EVENT, onDashboardRefresh);
  }, [user?.id, refreshProfile]);

  const displayName = profile?.display_name?.trim()
    ? profile.display_name.trim()
    : profileDisplayLabel(null, user?.email);

  const isIncomplete = Boolean(
    user && profile?.role_chosen_at && isProfileIncomplete(profile, user.email),
  );
  const rolePending = Boolean(user) && needsRoleOnboarding(profile);

  const value = useMemo(
    () => ({
      profile,
      loading: authLoading || loading,
      displayName,
      isIncomplete,
      needsRoleOnboarding: rolePending,
      refreshProfile,
      setProfileRow,
    }),
    [profile, authLoading, loading, displayName, isIncomplete, rolePending, refreshProfile, setProfileRow],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfile must be used within ProfileProvider");
  }
  return ctx;
}
