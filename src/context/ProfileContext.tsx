"use client";

import { useAuth } from "@/context/AuthContext";
import { DASHBOARD_REFRESH_EVENT } from "@/lib/dashboard-refresh";
import { fetchUserProfile } from "@/lib/profile-load";
import { ensureUserProfile } from "@/lib/profile";
import {
  assertProfileMatchesUser,
  clearProfileClientStorage,
  isProfileOwnedByUser,
  PROFILE_SESSION_MISMATCH_PARAM,
} from "@/lib/profile-session-guard";
import {
  isProfileIncomplete,
  needsRoleOnboarding,
  profileDisplayLabel,
  type ProfileRow,
} from "@/lib/profile-utils";
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

export type RefreshProfileOptions = {
  /** Do not block UI with loading state (e.g. dashboard background refresh). */
  background?: boolean;
};

type ProfileContextValue = {
  profile: ProfileRow | null;
  loading: boolean;
  /** True once the current auth user has finished an initial profile load attempt. */
  profileResolved: boolean;
  displayName: string;
  isIncomplete: boolean;
  needsRoleOnboarding: boolean;
  sessionError: string | null;
  refreshProfile: (options?: RefreshProfileOptions) => Promise<ProfileRow | null>;
  setProfileRow: (row: ProfileRow) => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, signOut } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileResolved, setProfileResolved] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const loadedUserIdRef = useRef<string | null>(null);
  const profileRef = useRef<ProfileRow | null>(null);
  profileRef.current = profile;
  const userRef = useRef(user);
  userRef.current = user;
  const signingOutRef = useRef(false);

  const resetForUser = useCallback((userId: string | null) => {
    setProfile(null);
    loadedUserIdRef.current = null;
    setProfileResolved(userId === null);
    if (userId === null) {
      setLoading(false);
    }
  }, []);

  const handleSessionMismatch = useCallback(async () => {
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    setSessionError("profile_session_mismatch");
    resetForUser(null);
    clearProfileClientStorage();
    try {
      await signOut();
    } finally {
      signingOutRef.current = false;
      if (typeof window !== "undefined") {
        const path = `/login?error=${PROFILE_SESSION_MISMATCH_PARAM}`;
        if (window.location.pathname !== "/login") {
          window.location.replace(path);
        }
      }
    }
  }, [resetForUser, signOut]);

  const applyProfileRow = useCallback((row: ProfileRow | null, userId: string) => {
    if (row && !isProfileOwnedByUser(row.id, userId)) {
      void handleSessionMismatch();
      return false;
    }
    setProfile(row);
    loadedUserIdRef.current = userId;
    setSessionError(null);
    return true;
  }, [handleSessionMismatch]);

  const setProfileRow = useCallback(
    (row: ProfileRow) => {
      const userId = userRef.current?.id;
      if (!userId) return;
      if (!isProfileOwnedByUser(row.id, userId)) {
        void handleSessionMismatch();
        return;
      }
      setProfile(row);
      loadedUserIdRef.current = userId;
      setSessionError(null);
      setLoading(false);
      setProfileResolved(true);
    },
    [handleSessionMismatch],
  );

  const refreshProfile = useCallback(
    async (options?: RefreshProfileOptions): Promise<ProfileRow | null> => {
      const currentUser = userRef.current;
      const userId = currentUser?.id;
      if (!userId) {
        resetForUser(null);
        return null;
      }

      const cached = profileRef.current;
      if (cached && !isProfileOwnedByUser(cached.id, userId)) {
        resetForUser(userId);
      }

      const isInitialForUser = loadedUserIdRef.current !== userId;
      const showLoading =
        !options?.background && (isInitialForUser || !profileRef.current);

      if (showLoading) {
        setLoading(true);
      }

      try {
        let row = await fetchUserProfile(supabase, userId);

        if (row) {
          assertProfileMatchesUser(row.id, userId);
        }

        if (!row) {
          await ensureUserProfile(supabase, currentUser);
          row = await fetchUserProfile(supabase, userId);
          if (row) {
            assertProfileMatchesUser(row.id, userId);
          }
        }

        if (row && !applyProfileRow(row, userId)) {
          return null;
        }

        if (!row) {
          setProfile(null);
          loadedUserIdRef.current = userId;
        }

        return row;
      } catch (err) {
        console.error("[profile] refresh failed", err instanceof Error ? err.message : err);
        if (err instanceof Error && err.message === "Profile session mismatch") {
          await handleSessionMismatch();
          return null;
        }
        if (isInitialForUser) {
          setProfile(null);
          loadedUserIdRef.current = userId;
        }
        return null;
      } finally {
        setProfileResolved(true);
        setLoading(false);
      }
    },
    [applyProfileRow, handleSessionMismatch, resetForUser, supabase],
  );

  useEffect(() => {
    if (authLoading) return;

    const userId = user?.id ?? null;

    if (!userId) {
      resetForUser(null);
      clearProfileClientStorage();
      return;
    }

    const cached = profileRef.current;
    if (cached && !isProfileOwnedByUser(cached.id, userId)) {
      resetForUser(userId);
      setLoading(true);
      setProfileResolved(false);
      void refreshProfile();
      return;
    }

    if (profileRef.current && userId && !isProfileOwnedByUser(profileRef.current.id, userId)) {
      resetForUser(userId);
      setLoading(true);
      setProfileResolved(false);
      void refreshProfile();
      return;
    }

    if (loadedUserIdRef.current === userId && profileRef.current?.id === userId) {
      setProfileResolved(true);
      setLoading(false);
      return;
    }

    if (loadedUserIdRef.current !== userId) {
      resetForUser(userId);
      setLoading(true);
      setProfileResolved(false);
    }

    void refreshProfile();
  }, [authLoading, user?.id, refreshProfile, resetForUser]);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    const onDashboardRefresh = () => {
      void refreshProfile({ background: true });
    };

    window.addEventListener(DASHBOARD_REFRESH_EVENT, onDashboardRefresh);
    return () => window.removeEventListener(DASHBOARD_REFRESH_EVENT, onDashboardRefresh);
  }, [user?.id, refreshProfile]);

  const userId = user?.id ?? null;
  const profileMismatch = Boolean(
    profile && userId && !isProfileOwnedByUser(profile.id, userId),
  );
  const ownedProfile =
    profile && userId && isProfileOwnedByUser(profile.id, userId) ? profile : null;

  const displayName = ownedProfile?.display_name?.trim()
    ? ownedProfile.display_name.trim()
    : profileDisplayLabel(null, user?.email);

  const isIncomplete = Boolean(
    user && ownedProfile?.role_chosen_at && isProfileIncomplete(ownedProfile, user.email),
  );
  const rolePending = Boolean(user) && needsRoleOnboarding(ownedProfile);

  const value = useMemo(
    () => ({
      profile: ownedProfile,
      loading: authLoading || loading || profileMismatch,
      profileResolved: profileResolved && !profileMismatch,
      displayName,
      isIncomplete,
      needsRoleOnboarding: rolePending,
      sessionError,
      refreshProfile,
      setProfileRow,
    }),
    [
      ownedProfile,
      authLoading,
      loading,
      profileMismatch,
      profileResolved,
      displayName,
      isIncomplete,
      rolePending,
      sessionError,
      refreshProfile,
      setProfileRow,
    ],
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
