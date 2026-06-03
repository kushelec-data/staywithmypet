"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { isProfileOwnedByUser } from "@/lib/profile-session-guard";
import { DASHBOARD_REFRESH_EVENT } from "@/lib/dashboard-refresh";
import { fetchDashboardSnapshot, type DashboardSnapshot } from "@/lib/dashboard-data";
import { resolveActiveMode } from "@/lib/profile-mode";
import type { ProfileRow } from "@/lib/profile-utils";
import { createClient } from "@/lib/supabase";

const PROFILE_LOAD_TIMEOUT_MS = 8_000;

const emptySnapshot: DashboardSnapshot = {
  petsOwned: 0,
  petPhotosCount: 0,
  favoritesCount: 0,
  careRequestsActive: 0,
  careRequestsIncoming: 0,
  careRequestsAwaitingReply: 0,
  reviewsCount: 0,
  reviewsAvg: 0,
  completedBookingsCount: 0,
  membership: "Demo",
  latestPets: [],
  petIntros: [],
  pendingReviewBooking: null,
};

function ratingOpts(profile: ProfileRow | null) {
  return {
    rating_avg: profile?.rating_avg,
    rating_count: profile?.rating_count,
  };
}

export function useDashboardData() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const supabase = useMemo(() => createClient(), []);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(emptySnapshot);
  const [statsLoading, setStatsLoading] = useState(false);
  const [profileTimedOut, setProfileTimedOut] = useState(false);
  const statsLoadedForRef = useRef<string | null>(null);

  function statsCacheKey(userId: string, p: ProfileRow | null): string {
    if (!p) return userId;
    return `${userId}:${resolveActiveMode(p.role, p.active_mode)}`;
  }
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const loadSnapshot = useCallback(async () => {
    const userId = user?.id;
    if (!userId) return;

    const profile = profileRef.current;
    if (profile && !isProfileOwnedByUser(profile.id, userId)) {
      return;
    }

    setStatsLoading(true);
    try {
      const activeMode = profile
        ? resolveActiveMode(profile.role, profile.active_mode)
        : "pet_parent";
      const data = await fetchDashboardSnapshot(
        supabase,
        userId,
        ratingOpts(profile),
        activeMode,
      );
      setSnapshot(data);
    } finally {
      statsLoadedForRef.current = statsCacheKey(userId, profileRef.current);
      setStatsLoading(false);
    }
  }, [user?.id, supabase]);

  useEffect(() => {
    setProfileTimedOut(false);
    if (!user?.id) {
      setSnapshot(emptySnapshot);
      statsLoadedForRef.current = null;
      return;
    }

    setSnapshot(emptySnapshot);
    statsLoadedForRef.current = null;

    const timer = window.setTimeout(() => {
      setProfileTimedOut(true);
    }, PROFILE_LOAD_TIMEOUT_MS);

    return () => window.clearTimeout(timer);
  }, [user?.id]);

  useEffect(() => {
    if (authLoading || !user?.id) return;
    if (profileLoading && !profile) return;
    const cacheKey = statsCacheKey(user.id, profile);
    if (statsLoadedForRef.current === cacheKey) return;

    loadSnapshot();
  }, [authLoading, user?.id, profileLoading, profile?.id, profile?.active_mode, loadSnapshot]);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    const onRefresh = () => {
      statsLoadedForRef.current = null;
      loadSnapshot();
    };

    window.addEventListener(DASHBOARD_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(DASHBOARD_REFRESH_EVENT, onRefresh);
  }, [user?.id, profile?.active_mode, loadSnapshot]);

  const profileReady = Boolean(profile) || profileTimedOut;
  const waitingForProfile = profileLoading && !profile && !profileTimedOut;

  return {
    snapshot,
    statsLoading,
    profileReady,
    waitingForProfile,
    loading: authLoading || waitingForProfile,
    loadSnapshot,
  };
}
