"use client";

import { DeletePetConfirmModal } from "@/components/pets/DeletePetConfirmModal";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import { deletePetForOwner } from "@/lib/pet-delete";
import { createClient } from "@/lib/supabase";
import { useMemo, useState } from "react";

type DeletePetButtonProps = {
  petId: string;
  ownerId: string;
  onDeleted: () => void;
};

export function DeletePetButton({ petId, ownerId, onDeleted }: DeletePetButtonProps) {
  const { t } = useLanguage();
  const copy = t.account.petsPage;
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      await deletePetForOwner(supabase, ownerId, petId);
      setOpen(false);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.deletePetError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-brand-pink/30 text-brand-pink hover:border-brand-pink/50 hover:bg-brand-pink/5"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        {copy.deletePet}
      </Button>

      <DeletePetConfirmModal
        open={open}
        submitting={submitting}
        error={error}
        onClose={() => {
          if (submitting) return;
          setOpen(false);
          setError(null);
        }}
        onConfirm={() => void handleConfirm()}
      />
    </>
  );
}
