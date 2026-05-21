"use client";

import { PetIntroCard } from "@/components/pets/PetIntroCard";
import { PetManageActions } from "@/components/pets/PetManageActions";
import { Button } from "@/components/ui/Button";
import { fetchOwnerPetIntros } from "@/lib/pet-intro";
import { createClient } from "@/lib/supabase";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PetIntroDisplay } from "@/lib/pet-intro";

type MyPetsListProps = {
  userId: string;
};

export function MyPetsList({ userId }: MyPetsListProps) {
  const supabase = useMemo(() => createClient(), []);
  const [pets, setPets] = useState<PetIntroDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchOwnerPetIntros(supabase, userId);
      setPets(rows);
    } catch (err) {
      setPets([]);
      setError(err instanceof Error ? err.message : "Could not load your pets.");
    } finally {
      setLoading(false);
    }
  }, [supabase, userId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-muted">Loading your pets…</p>;
  }

  if (error) {
    return (
      <p className="rounded-xl bg-brand-pink-muted/50 px-3 py-2 text-sm text-brand-pink" role="alert">
        {error}
      </p>
    );
  }

  if (pets.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-black/10 bg-mint/20 px-6 py-12 text-center">
        <p className="text-sm text-muted">No pets added yet</p>
        <Button href="/pets/new" size="sm">
          Add your pet
        </Button>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {pets.map((pet) => (
        <li key={pet.id} className="space-y-0">
          <PetIntroCard pet={pet} variant="list" />
          <PetManageActions petId={pet.id} />
        </li>
      ))}
    </ul>
  );
}
