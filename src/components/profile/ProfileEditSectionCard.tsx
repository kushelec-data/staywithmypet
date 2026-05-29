"use client";

import { Button } from "@/components/ui/Button";
import { ACCOUNT_CARD_CLASS } from "@/lib/account-ui";
import { Check, Pencil } from "lucide-react";
import type { ReactNode } from "react";

type ProfileEditSectionCardProps = {
  id: string;
  title: string;
  description: string;
  isEditing: boolean;
  saving?: boolean;
  error?: string | null;
  success?: string | null;
  editingModeTitle?: string;
  editingModeHint?: string;
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
  editingModeTitle,
  editingModeHint,
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
      className={`${ACCOUNT_CARD_CLASS} scroll-mt-24 p-6 sm:p-8 ${
        isEditing
          ? "profile-edit-panel--editing border-[#2E6B3F]/35 ring-2 ring-[#2E6B3F]/12"
          : frozen
            ? "opacity-[0.92]"
            : ""
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
            className="border-[#E5E2D8] bg-[#F8F6F1] font-semibold text-foreground shadow-sm hover:bg-[#F8F6F1] hover:border-[#2E6B3F]/25"
          >
            <Pencil className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
            {editLabel}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={frozen || saving}
            onClick={onSave}
            className="min-w-[9rem] bg-[#2E6B3F] shadow-md shadow-[#2E6B3F]/25 hover:bg-[#255A34]"
          >
            <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
            {saving ? savingLabel : saveLabel}
          </Button>
        </div>
      </div>

      {isEditing && editingModeTitle ? (
        <div
          className="mt-4 rounded-xl border border-[#2E6B3F]/20 bg-[#DDEEDF]/70 px-3 py-2.5"
          role="status"
        >
          <p className="text-sm font-semibold text-[#2E6B3F]">{editingModeTitle}</p>
          {editingModeHint ? (
            <p className="mt-0.5 text-xs text-[#5f6f63] dark:text-muted">{editingModeHint}</p>
          ) : null}
        </div>
      ) : null}

      {success ? (
        <p
          className="mt-4 rounded-xl border border-[#E5E2D8] bg-[#DDEEDF]/80 px-3 py-2 text-sm font-medium text-[#2E6B3F]"
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
