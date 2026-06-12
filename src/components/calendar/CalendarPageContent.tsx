"use client";

import { DashboardCalendarView } from "@/components/calendar/DashboardCalendarView";
import { AccountCard } from "@/components/account/AccountCard";
import { AccountLayout } from "@/components/account/AccountLayout";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useProfile } from "@/context/ProfileContext";
import { fetchUserPets, type UserPetRow } from "@/lib/pet-data";
import { normalizeAvailabilityDates } from "@/lib/pet-availability";
import { resolvedAvailability } from "@/lib/profile-details";
import { resolveActiveMode } from "@/lib/profile-mode";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export function CalendarPageContent() {
  const router = useRouter();
  const { t } = useLanguage();
  const copy = t.dashboardCalendar;
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const supabase = useMemo(() => createClient(), []);

  const [pets, setPets] = useState<UserPetRow[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [loadingPets, setLoadingPets] = useState(false);
  const [petsError, setPetsError] = useState<string | null>(null);

  const activeMode = profile ? resolveActiveMode(profile.role, profile.active_mode) : null;

  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!user) {
      router.replace("/login?next=/dashboard/calendar");
      return;
    }
    if (activeMode !== "pet_parent") return;

    let cancelled = false;
    setLoadingPets(true);
    setPetsError(null);

    void fetchUserPets(supabase, user.id)
      .then((rows) => {
        if (cancelled) return;
        setPets(rows);
        setSelectedPetId((prev) => {
          if (prev && rows.some((p) => p.id === prev)) return prev;
          return rows[0]?.id ?? null;
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setPets([]);
        setSelectedPetId(null);
        setPetsError(err instanceof Error ? err.message : copy.loadPetsError);
      })
      .finally(() => {
        if (!cancelled) setLoadingPets(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, profileLoading, user, activeMode, supabase, router]);

  const selectedPet = useMemo(
    () => pets.find((p) => p.id === selectedPetId) ?? null,
    [pets, selectedPetId],
  );

  const friendAvailabilityDates = useMemo(() => {
    if (!profile?.details) return [];
    return normalizeAvailabilityDates(resolvedAvailability(profile.details).selected_dates);
  }, [profile?.details]);

  const parentAvailabilityDates = useMemo(
    () => normalizeAvailabilityDates(selectedPet?.availabilityDates ?? []),
    [selectedPet?.availabilityDates],
  );

  return (
    <AccountLayout title={copy.pageTitle} description={copy.pageDescription}>
      {activeMode === "pet_parent" ? (
        <div className="space-y-4">
          {loadingPets ? (
            <p className="text-sm text-muted">{copy.loadingPets}</p>
          ) : petsError ? (
            <p className="rounded-xl border border-brand-pink/30 bg-brand-pink/10 px-4 py-3 text-sm text-brand-pink" role="alert">
              {petsError}
            </p>
          ) : pets.length === 0 ? (
            <AccountCard className="border border-dashed border-[#E5E2D8] p-6 text-center">
              <p className="font-heading font-semibold text-foreground">{copy.noPetsTitle}</p>
              <p className="mt-2 text-sm text-muted">{copy.noPetsDescription}</p>
              <Button href="/pets/new" size="sm" className="mt-4">
                {copy.addPet}
              </Button>
            </AccountCard>
          ) : (
            <>
              {pets.length > 1 ? (
                <div className="flex flex-wrap items-center gap-3">
                  <label htmlFor="calendar-pet-select" className="text-sm font-medium text-foreground">
                    {copy.selectPet}
                  </label>
                  <select
                    id="calendar-pet-select"
                    value={selectedPetId ?? ""}
                    onChange={(e) => setSelectedPetId(e.target.value || null)}
                    className="input-field max-w-xs"
                  >
                    {pets.map((pet) => (
                      <option key={pet.id} value={pet.id}>
                        {pet.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : selectedPet ? (
                <p className="text-sm font-medium text-foreground">{selectedPet.name}</p>
              ) : null}

              {selectedPet ? (
                <>
                  {parentAvailabilityDates.length === 0 ? (
                    <p className="text-sm text-muted">{copy.noAvailabilityDates}</p>
                  ) : null}
                  <DashboardCalendarView
                    key={selectedPet.id}
                    availabilityDates={parentAvailabilityDates}
                    petId={selectedPet.id}
                    viewRole="pet-parent"
                    editHref={`/pets/${selectedPet.id}/edit`}
                    editLabel={copy.editPetAvailability}
                  />
                </>
              ) : null}
            </>
          )}
        </div>
      ) : activeMode === "pet_friend" && user ? (
        <div className="space-y-4">
          {friendAvailabilityDates.length === 0 ? (
            <p className="text-sm text-muted">{copy.noAvailabilityDates}</p>
          ) : null}
          <DashboardCalendarView
            key={user.id}
            availabilityDates={friendAvailabilityDates}
            petFriendId={user.id}
            viewRole="pet-friend"
            editHref="/profile/edit?step=availability"
            editLabel={copy.editMyAvailability}
          />
        </div>
      ) : (
        <p className="text-sm text-muted">{copy.pageDescription}</p>
      )}
    </AccountLayout>
  );
}
