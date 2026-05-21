"use client";

import { useFavorites } from "@/context/FavoritesContext";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import type { FavoriteTarget } from "@/lib/favorites";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type FavoriteButtonProps = {
  target: FavoriteTarget;
  className?: string;
  /** 36×36 white circle for pet search cards */
  compact?: boolean;
};

export function FavoriteButton({ target, className = "", compact = false }: FavoriteButtonProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isSaved, toggle, toggling, loading: favoritesLoading } = useFavorites();
  const [hint, setHint] = useState<string | null>(null);

  const saved = user ? isSaved(target) : false;
  const busy = authLoading || favoritesLoading || toggling;

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (authLoading) return;

    if (!user) {
      setHint(t.favorites.loginRequired);
      router.push("/login");
      return;
    }

    setHint(null);
    try {
      await toggle(target);
    } catch {
      setHint(t.favorites.saveError);
    }
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className={`flex items-center justify-center rounded-full bg-surface shadow-md shadow-black/10 ring-1 ring-border transition-transform duration-200 hover:scale-105 active:scale-95 disabled:opacity-60 ${
          compact ? "h-9 w-9" : "h-8 w-8 backdrop-blur-sm sm:h-9 sm:w-9"
        }`}
        aria-pressed={saved}
        aria-busy={busy}
        aria-label={saved ? "Remove from saved" : "Save"}
      >
        <svg
          className={`h-4 w-4 transition-colors duration-200 ${saved ? "fill-brand-pink text-brand-pink" : "fill-none text-foreground/55"}`}
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          />
        </svg>
      </button>
      {hint ? (
        <div
          role="status"
          className="absolute right-0 top-full z-30 mt-2 w-48 rounded-xl border border-black/5 bg-surface p-3 text-left text-xs text-foreground shadow-lg"
        >
          <p>{hint}</p>
          {!user ? (
            <Link href="/login" className="mt-2 inline-block font-semibold text-brand-teal hover:text-brand-pink">
              {t.navbar.login}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
