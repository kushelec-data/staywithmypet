"use client";

import { AccountEmptyState } from "@/components/account/AccountEmptyState";
import { AccountLayout } from "@/components/account/AccountLayout";
import { ACCOUNT_ALERT_ERROR_CLASS } from "@/lib/account-ui";
import { OwnerCard } from "@/components/owners/OwnerCard";
import { PetCard } from "@/components/pets/PetCard";
import { useAuth } from "@/context/AuthContext";
import { useFavorites } from "@/context/FavoritesContext";
import { useLanguage } from "@/context/LanguageContext";
import { fetchSavedItems } from "@/lib/favorites";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Pet } from "@/lib/pets";
import type { SearchProfile } from "@/lib/search-profiles";

export function SavedPageContent() {
  const router = useRouter();
  const { t } = useLanguage();
  const s = t.saved;
  const { user, loading: authLoading } = useAuth();
  const { totalCount } = useFavorites();
  const supabase = useMemo(() => createClient(), []);
  const [savedPets, setSavedPets] = useState<Pet[]>([]);
  const [savedFriends, setSavedFriends] = useState<SearchProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    const userId = user.id;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const { pets, friends } = await fetchSavedItems(supabase, userId);
        if (!cancelled) {
          setSavedPets(pets);
          setSavedFriends(friends);
        }
      } catch (err) {
        if (!cancelled) {
          setSavedPets([]);
          setSavedFriends([]);
          setLoadError(err instanceof Error ? err.message : "Could not load saved items.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, supabase, router, totalCount]);

  const isEmpty = savedPets.length === 0 && savedFriends.length === 0;

  return (
    <AccountLayout title={s.pageTitle} description={s.pageDescription}>
      {loadError ? (
        <p className={`mb-4 ${ACCOUNT_ALERT_ERROR_CLASS}`} role="alert">
          {loadError}
        </p>
      ) : null}

      {loading ? (
        <p className="text-center text-muted">{s.loading}</p>
      ) : isEmpty ? (
        <AccountEmptyState
          icon="❤️"
          title={s.emptyTitle}
          description={s.emptyDescription}
          actions={[
            { href: "/find-pets", label: s.findPets },
            { href: "/find-care", label: s.findFriends, variant: "outline" },
          ]}
        />
      ) : (
        <div className="space-y-10">
          {savedPets.length > 0 ? (
            <section>
              <h2 className="font-heading mb-4 text-lg font-semibold text-foreground">{s.sectionPets}</h2>
              <div className="mx-auto grid max-w-md grid-cols-1 gap-4 sm:max-w-none sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
                {savedPets.map((pet) => (
                  <PetCard key={pet.id} pet={pet} />
                ))}
              </div>
            </section>
          ) : null}

          {savedFriends.length > 0 ? (
            <section>
              <h2 className="font-heading mb-4 text-lg font-semibold text-foreground">
                {s.sectionFriends}
              </h2>
              <div className="mx-auto grid max-w-md grid-cols-1 gap-4 sm:max-w-none sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
                {savedFriends.map((profile) => (
                  <OwnerCard key={profile.id} profile={profile} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </AccountLayout>
  );
}
