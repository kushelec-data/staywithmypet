"use client";

import type { ReactNode } from "react";

type ProfileEditStepPanelProps = {
  isEditing: boolean;
  error?: string | null;
  success?: string | null;
  children: ReactNode;
  panelRef?: React.RefObject<HTMLDivElement | null>;
};

export function ProfileEditStepPanel({
  isEditing,
  error = null,
  success = null,
  children,
  panelRef,
}: ProfileEditStepPanelProps) {
  const frozen = !isEditing;

  return (
    <div
      ref={panelRef}
      className={`card-elevated scroll-mt-24 rounded-2xl p-5 sm:p-6 ${
        frozen ? "opacity-[0.92]" : ""
      }`}
    >
      {success ? (
        <p
          className="mb-4 rounded-xl bg-mint/50 px-3 py-2 text-sm font-medium text-brand-teal"
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
        className={`space-y-5 ${frozen ? "pointer-events-none select-none" : ""}`}
        aria-disabled={frozen}
      >
        {children}
      </div>
    </div>
  );
}
