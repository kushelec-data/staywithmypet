"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useEffect, useState } from "react";

const PUPPY_IMAGE_SRC = "/animations/puppy-welcome-fallback.webp";
const AUTO_HIDE_MS = 8000;

type PetMascotCTAProps = {
  className?: string;
};

export function PetMascotCTA({ className = "" }: PetMascotCTAProps) {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const copy = t.hero.puppyWelcome;

  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (loading || user || dismissed) return;
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), AUTO_HIDE_MS);
    return () => window.clearTimeout(timer);
  }, [loading, user, dismissed]);

  if (loading || user || dismissed || !visible) {
    return null;
  }

  const dismiss = () => {
    setDismissed(true);
    setVisible(false);
  };

  return (
    <aside
      aria-label={copy.ariaLabel}
      className={`pet-assistant pointer-events-none fixed bottom-6 right-4 z-30 hidden md:flex md:flex-col md:items-end ${className}`}
    >
      <div className="pet-assistant__bubble pointer-events-auto relative mb-1.5 max-w-[11rem] rounded-2xl border border-border/70 bg-surface/92 px-3 py-2 shadow-lg backdrop-blur-sm">
        <button
          type="button"
          onClick={dismiss}
          className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border border-border/80 bg-surface text-muted shadow-sm transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal"
          aria-label={copy.dismiss}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
        <p className="m-0 pr-4 text-xs font-semibold leading-snug text-foreground">{copy.message}</p>
        <Link
          href="/signup"
          className="mt-1.5 inline-block text-xs font-semibold text-brand-teal transition-colors hover:text-brand-teal/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal"
        >
          {copy.signUp}
        </Link>
      </div>

      <img
        className="pet-assistant__puppy h-auto max-h-[140px] w-auto max-w-[140px] object-contain object-bottom"
        src={PUPPY_IMAGE_SRC}
        alt=""
        width={200}
        height={140}
        decoding="async"
        aria-hidden
      />

      <style>{`
        .pet-assistant__puppy {
          filter: drop-shadow(0 6px 12px rgba(26, 26, 31, 0.14));
        }

        .dark .pet-assistant__puppy {
          filter:
            drop-shadow(0 8px 16px rgba(0, 0, 0, 0.32))
            drop-shadow(0 0 8px rgba(247, 248, 250, 0.05));
        }

        @media (prefers-reduced-motion: no-preference) {
          .pet-assistant__bubble {
            animation: pet-assistant-in 480ms cubic-bezier(0.22, 1, 0.36, 1) both;
          }

          .pet-assistant__puppy {
            animation: pet-assistant-float 4.5s ease-in-out infinite;
          }
        }

        @keyframes pet-assistant-in {
          from {
            opacity: 0;
            transform: translate3d(0, 0.4rem, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes pet-assistant-float {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(0, -0.2rem, 0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .pet-assistant__bubble,
          .pet-assistant__puppy {
            animation: none;
          }
        }
      `}</style>
    </aside>
  );
}
