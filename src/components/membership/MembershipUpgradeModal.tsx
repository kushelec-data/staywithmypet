"use client";

import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import { playMembershipUpgradeModalSound } from "@/lib/membership-upgrade-modal-sound";
import type { MembershipRole } from "@/lib/membership";
import { buildMembershipPagePath } from "@/lib/membership-return";
import { WELCOME_OFFER_CODE } from "@/lib/new-member-promotion";
import { Check, Copy, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type MembershipUpgradeModalProps = {
  open: boolean;
  role: MembershipRole;
  returnTo: string;
  onClose: () => void;
};

export function MembershipUpgradeModal({
  open,
  role,
  returnTo,
  onClose,
}: MembershipUpgradeModalProps) {
  const { t } = useLanguage();
  const copy = t.membershipUpgradeModal;
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyBouncing, setCopyBouncing] = useState(false);
  const copiedTimerRef = useRef<number | null>(null);
  const copyBounceTimerRef = useRef<number | null>(null);
  const playedSoundRef = useRef(false);

  const membershipHref = buildMembershipPagePath({ role, returnTo });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      playedSoundRef.current = false;
      setCopied(false);
      setCopyBouncing(false);
      return;
    }

    if (!playedSoundRef.current) {
      playedSoundRef.current = true;
      playMembershipUpgradeModalSound();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
      if (copyBounceTimerRef.current) window.clearTimeout(copyBounceTimerRef.current);
    };
  }, []);

  const handleContinueBrowsing = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(WELCOME_OFFER_CODE);
    } catch {
      /* fallback for older browsers */
      try {
        const textarea = document.createElement("textarea");
        textarea.value = WELCOME_OFFER_CODE;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch {
        return;
      }
    }

    setCopied(true);
    setCopyBouncing(true);
    if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
    if (copyBounceTimerRef.current) window.clearTimeout(copyBounceTimerRef.current);
    copiedTimerRef.current = window.setTimeout(() => setCopied(false), 2000);
    copyBounceTimerRef.current = window.setTimeout(() => setCopyBouncing(false), 320);
  }, []);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-end justify-center p-4 sm:items-center sm:p-6">
      <button
        type="button"
        className="membership-upgrade-backdrop absolute inset-0 bg-foreground/25 backdrop-blur-sm"
        aria-label={copy.closeBackdrop}
        onClick={onClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="membership-upgrade-modal-panel relative w-full max-w-[520px] overflow-hidden rounded-[24px] border border-white/60 bg-[#FAFAF8] shadow-[0_24px_80px_rgba(15,60,55,0.18)]"
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-black/5 hover:text-foreground"
          aria-label={copy.close}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>

        <div className="px-6 pb-6 pt-8 sm:px-8 sm:pb-8 sm:pt-9">
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50 px-3.5 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-amber-900">
              <span aria-hidden>✨</span>
              {copy.badge}
            </span>
          </div>

          <h2
            id={titleId}
            className="mt-5 text-center font-heading text-[1.65rem] font-bold leading-tight tracking-tight text-foreground sm:text-[1.85rem]"
          >
            {copy.headline}
          </h2>

          <p id={descriptionId} className="mt-3 text-center text-sm leading-relaxed text-muted sm:text-[0.95rem]">
            {copy.subtext}
            <span className="mt-1 block">{copy.checkoutHint}</span>
          </p>

          <div className="mt-6 rounded-2xl border border-black/[0.06] bg-white px-5 py-5 shadow-[0_8px_30px_rgba(15,60,55,0.08)]">
            <p className="text-center font-mono text-2xl font-bold tracking-[0.22em] text-foreground sm:text-[1.65rem]">
              {WELCOME_OFFER_CODE}
            </p>
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => void handleCopyCode()}
                className={`membership-upgrade-btn-lift inline-flex min-h-[40px] items-center gap-2 rounded-full border border-[#E5E2D8] bg-[#F8F6F1] px-5 text-sm font-semibold text-foreground transition hover:border-brand-teal/30 hover:bg-mint/40 ${copyBouncing ? "membership-copy-bounce" : ""}`}
                aria-label={copied ? copy.copied : copy.copyCode}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-brand-teal" aria-hidden />
                    {copy.copied}
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" aria-hidden />
                    {copy.copy}
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <Button
              href={membershipHref}
              variant="primary"
              size="lg"
              className="membership-upgrade-btn-lift w-full justify-center rounded-full"
            >
              {copy.viewPlans}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="membership-upgrade-btn-lift w-full justify-center rounded-full border-[#E5E2D8] bg-white hover:bg-white"
              onClick={handleContinueBrowsing}
            >
              {copy.continueBrowsing}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
