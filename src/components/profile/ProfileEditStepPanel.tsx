"use client";

import { ACCOUNT_CARD_CLASS } from "@/lib/account-ui";
import type { ReactNode } from "react";

type ProfileEditStepPanelProps = {
  isEditing: boolean;
  error?: string | null;
  success?: string | null;
  editingModeTitle?: string;
  editingModeHint?: string;
  children: ReactNode;
  panelRef?: React.RefObject<HTMLDivElement | null>;
};

export function ProfileEditStepPanel({
  isEditing,
  error = null,
  success = null,
  editingModeTitle,
  editingModeHint,
  children,
  panelRef,
}: ProfileEditStepPanelProps) {
  const frozen = !isEditing;

  return (
    <div
      ref={panelRef}
      className={`scroll-mt-24 p-6 sm:p-7 ${ACCOUNT_CARD_CLASS} ${
        isEditing
          ? "profile-edit-panel--editing border-[#2E6B3F]/35 ring-2 ring-[#2E6B3F]/12"
          : "opacity-[0.92]"
      }`}
    >
      {isEditing && editingModeTitle ? (
        <div
          className="mb-4 rounded-xl border border-[#2E6B3F]/20 bg-[#DDEEDF]/70 px-3 py-2.5"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm font-semibold text-[#2E6B3F]">{editingModeTitle}</p>
          {editingModeHint ? (
            <p className="mt-0.5 text-xs text-[#5f6f63] dark:text-muted">{editingModeHint}</p>
          ) : null}
        </div>
      ) : null}

      {success ? (
        <p
          className="mb-4 rounded-xl border border-[#E5E2D8] bg-[#DDEEDF]/80 px-3 py-2 text-sm font-medium text-[#2E6B3F]"
          role="status"
        >
          {success}
        </p>
      ) : null}

      {error ? (
        <p
          className="mb-4 rounded-xl bg-brand-pink-muted/50 px-3 py-2 text-sm text-brand-pink"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div
        className={`space-y-5 ${
          frozen
            ? "pointer-events-none select-none [&_.profile-collapsible-toggle]:pointer-events-auto [&_.profile-collapsible-toggle]:cursor-pointer"
            : ""
        }`}
        aria-disabled={frozen}
      >
        {children}
      </div>
    </div>
  );
}
