"use client";

import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import {
  activeModeToMembershipRole,
  membershipPageTitle,
  membershipRoleTitle,
  type MembershipRole,
} from "@/lib/membership";
import type { ProfileActiveMode } from "@/lib/profile-mode";
import Link from "next/link";
import { useEffect, useRef } from "react";

type UpgradeMembershipModalProps = {
  open: boolean;
  /** Role that needs upgrade (defaults from activeMode). */
  role?: MembershipRole;
  activeMode?: ProfileActiveMode;
  /** Override default body copy. */
  message?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  onClose: () => void;
};

export function UpgradeMembershipModal({
  open,
  role,
  activeMode = "pet_parent",
  message,
  primaryLabel,
  secondaryLabel,
  onClose,
}: UpgradeMembershipModalProps) {
  const { t } = useLanguage();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const membershipRole = role ?? activeModeToMembershipRole(activeMode);
  const roleLabel = membershipRoleTitle(membershipRole);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="w-[min(100%,28rem)] max-w-lg rounded-3xl border border-black/10 bg-surface p-0 shadow-xl backdrop:bg-black/40"
      onClose={onClose}
    >
      <div className="flex flex-col px-5 py-5 sm:px-6 sm:py-6">
        <h2 className="font-heading text-lg font-bold text-foreground">
          Upgrade {roleLabel} membership
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {message ??
            `Messaging, care requests, and bookings in ${roleLabel} mode need an active membership for that role. You can still browse profiles, save favourites, and switch modes anytime.`}
        </p>
        {!message ? (
          <p className="mt-2 text-sm text-muted">{t.pricing.subtitle}</p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            {secondaryLabel ?? "Close"}
          </Button>
          <Button href="/membership" variant="primary" onClick={onClose}>
            {primaryLabel ?? `View ${membershipPageTitle(activeMode)}`}
          </Button>
        </div>
        <p className="mt-3 text-center text-xs text-muted">
          <Link href="/membership" className="text-brand-teal hover:underline" onClick={onClose}>
            Membership &amp; pricing
          </Link>
        </p>
      </div>
    </dialog>
  );
}
