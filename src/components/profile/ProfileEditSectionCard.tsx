"use client";

import { Button } from "@/components/ui/Button";
import type { ReactNode } from "react";

type ProfileEditSectionCardProps = {
  id: string;
  title: string;
  description: string;
  isEditing: boolean;
  saving?: boolean;
  error?: string | null;
  success?: string | null;
  onEdit: () => void;
  onSave: () => void;
  saveLabel: string;
  editLabel: string;
  savingLabel: string;
  children: ReactNode;
};

export function ProfileEditSectionCard({
  id,
  title,
  description,
  isEditing,
  saving = false,
  error = null,
  success = null,
  onEdit,
  onSave,
  saveLabel,
  editLabel,
  savingLabel,
  children,
}: ProfileEditSectionCardProps) {
  const frozen = !isEditing;

  return (
    <section
      id={id}
      className={`card-elevated scroll-mt-24 rounded-3xl p-6 sm:p-8 ${
        frozen ? "opacity-[0.92]" : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-lg font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onEdit}
            disabled={!frozen || saving}
          >
            {editLabel}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={frozen || saving}
            onClick={onSave}
          >
            {saving ? savingLabel : saveLabel}
          </Button>
        </div>
      </div>

      {success ? (
        <p
          className="mt-4 rounded-xl bg-mint/50 px-3 py-2 text-sm font-medium text-brand-teal"
          role="status"
        >
          {success}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-xl bg-brand-pink-muted/50 px-3 py-2 text-sm text-brand-pink" role="alert">
          {error}
        </p>
      ) : null}

      <div
        className={`mt-5 space-y-5 ${frozen ? "pointer-events-none select-none" : ""}`}
        aria-disabled={frozen}
      >
        {children}
      </div>

    </section>
  );
}
