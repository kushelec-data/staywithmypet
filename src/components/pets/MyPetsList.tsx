"use client";

import { STATUS_ALERT_ERROR_CLASS } from "@/lib/status-colors";
import { ACCOUNT_ALERT_SUCCESS_CLASS } from "@/lib/account-ui";
import { PetIntroCard } from "@/components/pets/PetIntroCard";
import { PetManageActions } from "@/components/pets/PetManageActions";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import { fetchOwnerPetIntros } from "@/lib/pet-intro";
import { createClient } from "@/lib/supabase";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PetIntroDisplay } from "@/lib/pet-intro";

type MyPetsListProps = {
  userId: string;
};

export function MyPetsList({ userId }: MyPetsListProps) {
  const { t } = useLanguage();
  const petsT = t.account.petsPage;
  const supabase = useMemo(() => createClient(), []);
  const [pets, setPets] = useState<PetIntroDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchOwnerPetIntros(supabase, userId, { activeOnly: true });
      setPets(rows);
    } catch (err) {
      setPets([]);
      setError(err instanceof Error ? err.message : petsT.loadError);
    } finally {
      setLoading(false);
    }
  }, [supabase, userId, petsT.loadError]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-muted">{petsT.loadingPets}</p>;
  }

  if (error) {
    return (
      <p className={STATUS_ALERT_ERROR_CLASS} role="alert">
        {error}
      </p>
    );
  }

  if (pets.length === 0) {
    return (
      <div className="account-card flex flex-col items-center gap-4 border border-dashed border-[#E5E2D8] px-6 py-12 text-center">
        {successMessage ? (
          <p className={ACCOUNT_ALERT_SUCCESS_CLASS} role="status">
            {successMessage}
          </p>
        ) : null}
        <p className="text-sm text-muted">{petsT.empty}</p>
        <Button href="/pets/new" size="sm">
          {petsT.addYourPet}
        </Button>
      </div>
    );
  }

  return (
    <>
      {successMessage ? (
        <p className={`mb-4 ${ACCOUNT_ALERT_SUCCESS_CLASS}`} role="status">
          {successMessage}
        </p>
      ) : null}
      <ul className="space-y-4">
        {pets.map((pet) => (
          <li key={pet.id} className="space-y-0">
            <PetIntroCard pet={pet} variant="list" />
            <PetManageActions
              petId={pet.id}
              ownerId={userId}
              onDeleted={() => {
                setPets((current) => current.filter((item) => item.id !== pet.id));
                setSuccessMessage(petsT.deletePetSuccess);
              }}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
