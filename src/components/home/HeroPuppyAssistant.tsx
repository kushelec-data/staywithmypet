"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useEffect, useState } from "react";

const AUTO_HIDE_MS = 8000;

function HeroPuppySvg() {
  return (
    <svg
      viewBox="0 0 120 132"
      className="hero-puppy__svg h-[88px] w-[80px] sm:h-[108px] sm:w-[96px]"
      aria-hidden
    >
      <defs>
        <linearGradient id="hero-puppy-fur-light" x1="30%" y1="0%" x2="70%" y2="100%">
          <stop offset="0%" stopColor="#fffaf5" />
          <stop offset="40%" stopColor="#f5e8da" />
          <stop offset="100%" stopColor="#d8bfa8" />
        </linearGradient>
        <linearGradient id="hero-puppy-fur-shadow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c4a48a" />
          <stop offset="100%" stopColor="#9a7a62" />
        </linearGradient>
        <linearGradient id="hero-puppy-belly" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#fffcf8" />
          <stop offset="100%" stopColor="#efe3d6" />
        </linearGradient>
        <linearGradient id="hero-puppy-snout" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#fffdfb" />
          <stop offset="100%" stopColor="#e8d4c4" />
        </linearGradient>
        <radialGradient id="hero-puppy-cheek" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f5b4b8" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#f5b4b8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hero-puppy-collar" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7eb89a" />
          <stop offset="50%" stopColor="#5a9a7a" />
          <stop offset="100%" stopColor="#7eb89a" />
        </linearGradient>
        <filter id="hero-puppy-soft-shadow" x="-20%" y="-10%" width="140%" height="130%">
          <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#1a1a1f" floodOpacity="0.16" />
        </filter>
      </defs>

      <g className="hero-puppy__walker">
        <ellipse
          className="hero-puppy__shadow"
          cx="60"
          cy="126"
          rx="30"
          ry="5"
          fill="#1a1a1f"
        />

        <g className="hero-puppy__character" filter="url(#hero-puppy-soft-shadow)">
          <g className="hero-puppy__tail">
            <path
              d="M22 78 C8 72 4 58 10 44 C14 36 20 38 24 48 L28 76 Z"
              fill="url(#hero-puppy-fur-light)"
              stroke="url(#hero-puppy-fur-shadow)"
              strokeWidth="1.1"
              strokeLinejoin="round"
            />
          </g>

          <g className="hero-puppy__body">
            <ellipse cx="58" cy="90" rx="31" ry="25" fill="url(#hero-puppy-fur-shadow)" opacity="0.35" />
            <ellipse cx="58" cy="88" rx="30" ry="26" fill="url(#hero-puppy-fur-light)" />
            <ellipse cx="56" cy="92" rx="18" ry="14" fill="url(#hero-puppy-belly)" />
            <path
              d="M38 74 Q60 68 82 74 L80 78 Q60 82 40 78 Z"
              fill="url(#hero-puppy-collar)"
              opacity="0.85"
            />
          </g>

          <g className="hero-puppy__legs">
            <g className="hero-puppy__leg hero-puppy__leg--bl">
              <path
                d="M44 94 Q38 100 34 106"
                fill="none"
                stroke="url(#hero-puppy-fur-shadow)"
                strokeWidth="5"
                strokeLinecap="round"
                opacity="0.55"
              />
              <ellipse cx="33" cy="107" rx="6" ry="4.5" fill="url(#hero-puppy-fur-shadow)" opacity="0.4" />
            </g>
            <g className="hero-puppy__leg hero-puppy__leg--br">
              <path
                d="M74 94 Q80 100 84 106"
                fill="none"
                stroke="url(#hero-puppy-fur-shadow)"
                strokeWidth="5"
                strokeLinecap="round"
                opacity="0.55"
              />
              <ellipse cx="85" cy="107" rx="6" ry="4.5" fill="url(#hero-puppy-fur-shadow)" opacity="0.4" />
            </g>
            <g className="hero-puppy__leg hero-puppy__leg--fl">
              <path
                d="M46 96 Q42 102 40 108"
                fill="none"
                stroke="url(#hero-puppy-fur-shadow)"
                strokeWidth="5.5"
                strokeLinecap="round"
                opacity="0.6"
              />
              <ellipse cx="39" cy="109" rx="7.5" ry="5.5" fill="url(#hero-puppy-fur-shadow)" opacity="0.5" />
            </g>
            <g className="hero-puppy__leg hero-puppy__leg--fr">
              <path
                d="M72 96 Q76 102 78 108"
                fill="none"
                stroke="url(#hero-puppy-fur-shadow)"
                strokeWidth="5.5"
                strokeLinecap="round"
                opacity="0.6"
              />
              <ellipse cx="79" cy="109" rx="7.5" ry="5.5" fill="url(#hero-puppy-fur-shadow)" opacity="0.5" />
            </g>
          </g>

          <g className="hero-puppy__head">
            <g className="hero-puppy__ear hero-puppy__ear--left">
              <path
                d="M34 42 C28 22 38 14 46 24 C48 30 42 38 36 44 Z"
                fill="url(#hero-puppy-fur-shadow)"
              />
              <path
                d="M36 40 C32 26 40 20 44 28 C45 32 41 38 38 42 Z"
                fill="url(#hero-puppy-fur-light)"
              />
              <path d="M38 38 C36 30 40 26 42 32 Z" fill="#e8cfc0" opacity="0.7" />
            </g>
            <g className="hero-puppy__ear hero-puppy__ear--right">
              <path
                d="M86 42 C92 22 82 14 74 24 C72 30 78 38 84 44 Z"
                fill="url(#hero-puppy-fur-shadow)"
              />
              <path
                d="M84 40 C88 26 80 20 76 28 C75 32 79 38 82 42 Z"
                fill="url(#hero-puppy-fur-light)"
              />
              <path d="M82 38 C84 30 80 26 78 32 Z" fill="#e8cfc0" opacity="0.7" />
            </g>

            <ellipse cx="60" cy="52" rx="28" ry="26" fill="url(#hero-puppy-fur-light)" />
            <ellipse cx="60" cy="56" rx="22" ry="18" fill="url(#hero-puppy-belly)" />

            <ellipse cx="60" cy="64" rx="11" ry="9" fill="url(#hero-puppy-snout)" />
            <ellipse cx="60" cy="63" rx="8" ry="5" fill="#fff" opacity="0.35" />

            <circle cx="44" cy="58" r="6.5" fill="url(#hero-puppy-cheek)" />
            <circle cx="76" cy="58" r="6.5" fill="url(#hero-puppy-cheek)" />

            <ellipse cx="48" cy="50" rx="4.5" ry="5.5" fill="#2d2a32" />
            <ellipse cx="72" cy="50" rx="4.5" ry="5.5" fill="#2d2a32" />
            <circle cx="49" cy="48" r="1.6" fill="#fff" opacity="0.92" />
            <circle cx="73" cy="48" r="1.6" fill="#fff" opacity="0.92" />

            <ellipse cx="60" cy="66" rx="4" ry="3" fill="#4a3d36" opacity="0.85" />
            <path
              d="M57 67 Q60 70 63 67"
              fill="none"
              stroke="#5c4a42"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </g>
        </g>
      </g>
    </svg>
  );
}

export function HeroPuppyAssistant() {
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
      className="hero-puppy-assistant pointer-events-none absolute bottom-2 right-1 z-20 flex flex-col items-end sm:bottom-5 sm:right-4 lg:bottom-6 lg:right-6"
    >
      <div className="hero-puppy-assistant__bubble pointer-events-auto relative mb-1 max-w-[10.5rem] rounded-2xl border border-border/70 bg-surface/95 px-3 py-2.5 shadow-lg backdrop-blur-sm sm:max-w-[11rem]">
        <button
          type="button"
          onClick={dismiss}
          className="absolute -right-1.5 -top-1.5 flex h-7 w-7 items-center justify-center rounded-full border border-border/80 bg-surface text-muted shadow-sm transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal"
          aria-label={copy.dismiss}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
        <p className="m-0 pr-5 text-xs font-semibold leading-snug text-foreground">{copy.message}</p>
        <Link
          href="/signup"
          className="mt-1.5 inline-block text-xs font-semibold text-brand-teal transition-colors hover:text-brand-teal/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal"
        >
          {copy.signUp}
        </Link>
      </div>

      <div className="hero-puppy-assistant__walk-track pointer-events-none" aria-hidden>
        <HeroPuppySvg />
      </div>
    </aside>
  );
}
