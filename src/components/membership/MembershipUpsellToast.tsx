"use client";

import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import type { MembershipRole } from "@/lib/membership";
import {
  membershipUpsellCopy,
  membershipUpsellHref,
  type MembershipUpsellVariant,
} from "@/lib/membership-upsell";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const AUTO_DISMISS_MS = 15_000;

type MembershipUpsellToastProps = {
  open: boolean;
  onClose: () => void;
  variant: MembershipUpsellVariant;
  /** Pet or caretaker name for contextual copy. */
  name?: string;
  role: MembershipRole;
  /** Close an overlay modal (e.g. availability calendar) before navigating. */
  onDismissModal?: () => void;
};

export function MembershipUpsellToast({
  open,
  onClose,
  variant,
  name,
  role,
  onDismissModal,
}: MembershipUpsellToastProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => onClose(), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const { title, body } = membershipUpsellCopy(variant, name, t.membershipUpsell);
  const upgradeHref = membershipUpsellHref(role);

  function handleUnlock() {
    onDismissModal?.();
    onClose();
    router.push(upgradeHref);
  }

  function handleMaybeLater() {
    onClose();
  }

  return createPortal(
    <div
      className="pointer-events-auto fixed inset-x-0 bottom-6 z-[99999] flex justify-center px-3 sm:inset-x-auto sm:right-6 sm:left-auto sm:justify-end sm:px-0"
      role="region"
      aria-live="polite"
      aria-label={title}
    >
      <div className="membership-upsell-toast w-full max-w-sm rounded-2xl border border-brand-teal/30 bg-[#fffaf2]/95 p-4 shadow-[0_14px_44px_rgba(15,60,55,0.14)] backdrop-blur-md dark:border-brand-teal/25 dark:bg-surface/95">
        <p className="font-mono text-[9px] leading-none text-muted/50">TOAST_V2_CLICKABLE</p>
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-heading text-sm font-bold leading-snug text-foreground">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{body}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button type="button" variant="primary" size="sm" onClick={handleUnlock}>
                {t.membershipUpsell.unlockCta}
              </Button>
              <button
                type="button"
                onClick={handleMaybeLater}
                className="rounded-full px-2 py-1 text-xs font-medium text-muted transition hover:bg-mint/50 hover:text-foreground"
              >
                {t.membershipUpsell.maybeLater}
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleMaybeLater}
            className="-mr-1 -mt-1 shrink-0 rounded-full p-1.5 text-muted transition hover:bg-mint/50 hover:text-foreground"
            aria-label={t.membershipUpsell.close}
          >
            <span aria-hidden>✕</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
