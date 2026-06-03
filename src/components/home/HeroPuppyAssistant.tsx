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
      className="hero-puppy__svg h-[108px] w-[96px] sm:h-[120px] sm:w-[108px]"
      aria-hidden
    >
      <defs>
        <linearGradient id="hero-puppy-fur-light" x1="30%" y1="0%" x2="70%" y2="100%">
          <stop offset="0%" stopColor="#fff8f2" />
          <stop offset="45%" stopColor="#f3e4d6" />
          <stop offset="100%" stopColor="#dcc4b0" />
        </linearGradient>
        <linearGradient id="hero-puppy-fur-shadow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c9a88e" />
          <stop offset="100%" stopColor="#a8846c" />
        </linearGradient>
        <linearGradient id="hero-puppy-belly" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#fff9f4" />
          <stop offset="100%" stopColor="#efe0d2" />
        </linearGradient>
        <radialGradient id="hero-puppy-cheek" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f5b4b8" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#f5b4b8" stopOpacity="0" />
        </radialGradient>
        <filter id="hero-puppy-soft-shadow" x="-20%" y="-10%" width="140%" height="130%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#1a1a1f" floodOpacity="0.14" />
        </filter>
      </defs>

      <ellipse cx="60" cy="124" rx="34" ry="5" fill="#1a1a1f" opacity="0.08" />

      <g className="hero-puppy__bounce" filter="url(#hero-puppy-soft-shadow)">
        <g className="hero-puppy__tail">
          <path
            d="M22 78 C8 72 4 58 10 44 C14 36 20 38 24 48 L28 76 Z"
            fill="url(#hero-puppy-fur-light)"
            stroke="url(#hero-puppy-fur-shadow)"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </g>

        <ellipse cx="58" cy="88" rx="30" ry="26" fill="url(#hero-puppy-fur-light)" />
        <ellipse cx="56" cy="92" rx="18" ry="14" fill="url(#hero-puppy-belly)" />

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
          </g>

          <ellipse cx="60" cy="52" rx="28" ry="26" fill="url(#hero-puppy-fur-light)" />
          <ellipse cx="60" cy="56" rx="22" ry="18" fill="url(#hero-puppy-belly)" />

          <circle cx="44" cy="58" r="7" fill="url(#hero-puppy-cheek)" />
          <circle cx="76" cy="58" r="7" fill="url(#hero-puppy-cheek)" />

          <ellipse cx="48" cy="50" rx="5" ry="6" fill="#2d2a32" />
          <ellipse cx="72" cy="50" rx="5" ry="6" fill="#2d2a32" />
          <circle cx="49" cy="48" r="1.8" fill="#fff" opacity="0.9" />
          <circle cx="73" cy="48" r="1.8" fill="#fff" opacity="0.9" />

          <ellipse cx="60" cy="62" rx="9" ry="7" fill="#3d3530" />
          <path d="M56 64 Q60 68 64 64" fill="none" stroke="#5c4a42" strokeWidth="1.5" strokeLinecap="round" />
        </g>

        <ellipse cx="42" cy="100" rx="9" ry="6" fill="url(#hero-puppy-fur-shadow)" opacity="0.5" />
        <ellipse cx="76" cy="100" rx="9" ry="6" fill="url(#hero-puppy-fur-shadow)" opacity="0.5" />
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
      className="hero-puppy-assistant pointer-events-none absolute bottom-3 right-2 z-10 flex flex-col items-end sm:bottom-5 sm:right-4 lg:bottom-6 lg:right-6"
    >
      <div className="hero-puppy-assistant__bubble pointer-events-auto relative mb-0 max-w-[10.5rem] rounded-2xl border border-border/70 bg-surface/95 px-3 py-2 shadow-lg backdrop-blur-sm sm:max-w-[11rem]">
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

      <HeroPuppySvg />

      <style>{`
        .hero-puppy__svg {
          display: block;
          overflow: visible;
        }

        .hero-puppy__tail {
          transform-origin: 24px 76px;
        }

        .hero-puppy__head {
          transform-origin: 60px 58px;
        }

        .hero-puppy__ear--left {
          transform-origin: 40px 38px;
        }

        .hero-puppy__ear--right {
          transform-origin: 80px 38px;
        }

        @media (prefers-reduced-motion: no-preference) {
          .hero-puppy-assistant__bubble {
            animation: hero-puppy-bubble-in 480ms cubic-bezier(0.22, 1, 0.36, 1) both;
          }

          .hero-puppy__bounce {
            animation: hero-puppy-bounce 2.8s ease-in-out infinite;
          }

          .hero-puppy__tail {
            animation: hero-puppy-tail 0.45s ease-in-out infinite alternate;
          }

          .hero-puppy__head {
            animation: hero-puppy-head 3.2s ease-in-out infinite;
          }

          .hero-puppy__ear--left {
            animation: hero-puppy-ear-left 2.4s ease-in-out infinite;
          }

          .hero-puppy__ear--right {
            animation: hero-puppy-ear-right 2.6s ease-in-out infinite;
          }
        }

        @keyframes hero-puppy-bubble-in {
          from {
            opacity: 0;
            transform: translate3d(0, 0.35rem, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes hero-puppy-bounce {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(0, -5px, 0);
          }
        }

        @keyframes hero-puppy-tail {
          from {
            transform: rotate(-14deg);
          }
          to {
            transform: rotate(18deg);
          }
        }

        @keyframes hero-puppy-head {
          0%,
          100% {
            transform: rotate(0deg) translate3d(0, 0, 0);
          }
          35% {
            transform: rotate(-2.5deg) translate3d(-1px, 0, 0);
          }
          65% {
            transform: rotate(2.5deg) translate3d(1px, 0, 0);
          }
        }

        @keyframes hero-puppy-ear-left {
          0%,
          100% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(-6deg);
          }
        }

        @keyframes hero-puppy-ear-right {
          0%,
          100% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(6deg);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-puppy-assistant__bubble,
          .hero-puppy__bounce,
          .hero-puppy__tail,
          .hero-puppy__head,
          .hero-puppy__ear--left,
          .hero-puppy__ear--right {
            animation: none;
          }
        }
      `}</style>
    </aside>
  );
}
