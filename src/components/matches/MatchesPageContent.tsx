"use client";

import { AccountEmptyState } from "@/components/account/AccountEmptyState";
import { AccountLayout } from "@/components/account/AccountLayout";
import { ACCOUNT_ALERT_ERROR_CLASS, ACCOUNT_CARD_CLASS } from "@/lib/account-ui";
import { AppImage } from "@/components/ui/AppImage";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { createClient } from "@/lib/supabase";
import {
  dismissMatchSuggestion,
  fetchOwnMatchSuggestions,
  markMatchSuggestionClicked,
  markMatchSuggestionsViewed,
  matchSuggestionPhoto,
  type MatchSuggestionRow,
} from "@/lib/match-suggestions";
import { locationAreaKey, titleCaseArea } from "@/lib/matchmaking/location";
import { petWeightCategoryShortLabel } from "@/lib/pet-weight";
import { formatPetTypeLabel } from "@/lib/pet-type-options";
import { track } from "@/lib/google-analytics";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function areaLabel(row: {
  city?: string | null;
  public_location?: string | null;
  location?: string | null;
}): string | null {
  const key = locationAreaKey(row);
  return key ? titleCaseArea(key) : null;
}

export function MatchesPageContent() {
  const router = useRouter();
  const { t } = useLanguage();
  const copy = t.matches;
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<MatchSuggestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setError(null);
      try {
        const data = await fetchOwnMatchSuggestions(supabase, userId);
        if (cancelled) return;
        setRows(data);
        const unread = data.filter((row) => !row.viewed_at).map((row) => row.id);
        if (unread.length) {
          await markMatchSuggestionsViewed(supabase, userId, unread);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : copy.loadError);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, supabase, router, copy.loadError]);

  async function onDismiss(id: string) {
    if (!user) return;
    setRows((current) => current.filter((row) => row.id !== id));
    try {
      await dismissMatchSuggestion(supabase, user.id, id);
    } catch {
      /* keep optimistic hide */
    }
  }

  async function onOpen(row: MatchSuggestionRow, href: string) {
    if (!user) return;
    try {
      await markMatchSuggestionClicked(supabase, user.id, row.id);
      track("match_clicked", { match_id: row.id, pet_id: row.pet_id });
    } catch {
      /* analytics best-effort */
    }
    router.push(href);
  }

  const parentRows = user ? rows.filter((row) => row.pet_parent_id === user.id) : [];
  const friendRows = user ? rows.filter((row) => row.pet_friend_id === user.id) : [];

  return (
    <AccountLayout title={copy.pageTitle} description={copy.pageDescription}>
      {error ? (
        <p className={`mb-4 ${ACCOUNT_ALERT_ERROR_CLASS}`} role="alert">
          {error}
        </p>
      ) : null}
      {loading ? (
        <p className="text-center text-muted">{copy.loading}</p>
      ) : rows.length === 0 ? (
        <AccountEmptyState icon="✨" title={copy.emptyTitle} description={copy.emptyDescription} />
      ) : (
        <div className="space-y-8">
          {parentRows.length > 0 ? (
            <section className="space-y-4">
              {parentRows.map((row) => {
                const petName = row.pet?.name?.trim() || copy.yourPet;
                const photo = matchSuggestionPhoto(row, user!.id);
                const location = areaLabel(row.friend ?? {});
                const href = `/users/${row.pet_friend_id}`;
                return (
                  <article key={row.id} className={`${ACCOUNT_CARD_CLASS} p-4 sm:p-5`}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#2E6B3F]">
                      {copy.forPet.replace("{name}", petName)}
                    </p>
                    <div className="mt-3 flex gap-4">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#E8E4DC]">
                        <AppImage
                          src={photo ?? ""}
                          alt={row.friend?.display_name ?? ""}
                          className="object-cover"
                          sizes="80px"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h2 className="text-lg font-semibold text-foreground">
                            {row.friend?.display_name ?? copy.petFriend}
                          </h2>
                          <span className="rounded-full bg-mint/40 px-2.5 py-0.5 text-sm font-semibold text-[#2E6B3F]">
                            {Math.round(row.score)}% {copy.matchLabel}
                          </span>
                        </div>
                        {location ? <p className="mt-1 text-sm text-muted">{location}</p> : null}
                        <p className="mt-2 text-xs font-semibold text-foreground">{copy.goodFit}</p>
                        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-muted">
                          {row.reasons.slice(0, 3).map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => void onOpen(row, href)}>
                            {copy.viewProfile}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => void onDismiss(row.id)}>
                            {copy.notInterested}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          ) : null}

          {friendRows.length > 0 ? (
            <section className="space-y-4">
              <h2 className="text-base font-semibold text-foreground">{copy.petsYouMayEnjoy}</h2>
              {friendRows.map((row) => {
                const photo = matchSuggestionPhoto(row, user!.id);
                const location = areaLabel({
                  city: row.parent?.city,
                  public_location: row.parent?.public_location,
                  location: row.pet?.location || row.parent?.location,
                });
                const species = formatPetTypeLabel(row.pet?.species);
                const size = petWeightCategoryShortLabel(row.pet?.size_label);
                const href = `/pet/${row.pet_id}`;
                return (
                  <article key={row.id} className={`${ACCOUNT_CARD_CLASS} p-4 sm:p-5`}>
                    <div className="flex gap-4">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#E8E4DC]">
                        <AppImage
                          src={photo ?? ""}
                          alt={row.pet?.name ?? ""}
                          className="object-cover"
                          sizes="80px"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h3 className="text-lg font-semibold text-foreground">
                            {row.pet?.name ?? copy.petFallback}
                          </h3>
                          <span className="rounded-full bg-mint/40 px-2.5 py-0.5 text-sm font-semibold text-[#2E6B3F]">
                            {Math.round(row.score)}% {copy.matchLabel}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted">
                          {[species, size, location].filter(Boolean).join(" · ")}
                        </p>
                        <p className="mt-2 text-xs font-semibold text-foreground">{copy.goodFit}</p>
                        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-muted">
                          {row.reasons.slice(0, 3).map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => void onOpen(row, href)}>
                            {copy.viewPet}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => void onDismiss(row.id)}>
                            {copy.notInterested}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          ) : null}
        </div>
      )}
    </AccountLayout>
  );
}
