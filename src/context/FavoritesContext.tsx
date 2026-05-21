"use client";

import {
  fetchUserFavoriteIds,
  isFavoriteSaved,
  toggleFavorite,
  type FavoriteTarget,
  type UserFavoriteIds,
} from "@/lib/favorites";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type FavoritesContextValue = {
  loading: boolean;
  toggling: boolean;
  totalCount: number;
  isSaved: (target: FavoriteTarget) => boolean;
  toggle: (target: FavoriteTarget) => Promise<boolean>;
  refresh: () => Promise<void>;
};

const emptyIds: UserFavoriteIds = { petIds: new Set(), friendIds: new Set() };

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [ids, setIds] = useState<UserFavoriteIds>(emptyIds);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setIds(emptyIds);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const next = await fetchUserFavoriteIds(supabase, user.id);
      setIds(next);
    } catch {
      setIds(emptyIds);
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [authLoading, refresh]);

  const toggle = useCallback(
    async (target: FavoriteTarget): Promise<boolean> => {
      if (!user) return false;

      const currentlySaved = isFavoriteSaved(ids, target);
      setToggling(true);
      try {
        await toggleFavorite(supabase, user.id, target, currentlySaved);

        setIds((prev) => {
          const petIds = new Set(prev.petIds);
          const friendIds = new Set(prev.friendIds);
          if (target.type === "pet") {
            if (currentlySaved) petIds.delete(target.id);
            else petIds.add(target.id);
          } else if (currentlySaved) {
            friendIds.delete(target.id);
          } else {
            friendIds.add(target.id);
          }
          return { petIds, friendIds };
        });

        return !currentlySaved;
      } finally {
        setToggling(false);
      }
    },
    [user, supabase, ids],
  );

  const value = useMemo(
    () => ({
      loading: authLoading || loading,
      toggling,
      totalCount: ids.petIds.size + ids.friendIds.size,
      isSaved: (target: FavoriteTarget) => isFavoriteSaved(ids, target),
      toggle,
      refresh,
    }),
    [authLoading, loading, toggling, ids, toggle, refresh],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites must be used within FavoritesProvider");
  }
  return ctx;
}
