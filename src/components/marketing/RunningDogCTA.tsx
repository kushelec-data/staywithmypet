"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export function RunningDogCTA() {
  const { user, loading } = useAuth();

  if (loading || user) {
    return null;
  }

  return (
    <aside
      aria-label="Create an account"
      className="pointer-events-none fixed inset-x-0 bottom-3 z-40 h-28 overflow-hidden px-3 sm:bottom-5 sm:h-32"
    >
      <div className="running-dog-cta__runner pointer-events-none absolute bottom-0 flex items-end gap-2 sm:gap-3">
        <div className="running-dog-cta__dog relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-brand-teal/15 bg-cream text-4xl shadow-lg shadow-brand-teal/10 ring-4 ring-white/70 dark:bg-surface dark:ring-white/10 sm:h-16 sm:w-16 sm:text-5xl">
          <span className="running-dog-cta__paw running-dog-cta__paw--one" aria-hidden>
            •
          </span>
          <span className="running-dog-cta__paw running-dog-cta__paw--two" aria-hidden>
            •
          </span>
          <span aria-hidden>🐕</span>
        </div>

        <div className="pointer-events-none max-w-[min(19rem,calc(100vw-5rem))] rounded-3xl border border-brand-teal/15 bg-surface/95 p-3 shadow-xl shadow-brand-teal/10 backdrop-blur-md dark:bg-card/95 sm:p-4">
          <p className="text-sm font-semibold leading-snug text-foreground sm:text-base">
            Woof! Come meet pets near you <span aria-hidden>🐾</span>
          </p>
          <Link
            href="/signup"
            className="pointer-events-auto mt-2 inline-flex min-h-9 items-center justify-center rounded-full bg-brand-teal px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-teal/20 transition hover:bg-brand-teal-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal"
          >
            Create account
          </Link>
        </div>
      </div>

      <style>{`
        .running-dog-cta__runner {
          left: 50%;
          transform: translateX(-50%);
        }

        .running-dog-cta__paw {
          position: absolute;
          bottom: 0.15rem;
          display: none;
          color: var(--brand-teal);
          font-size: 1rem;
          line-height: 1;
          opacity: 0.35;
        }

        .running-dog-cta__paw--one {
          left: -0.65rem;
        }

        .running-dog-cta__paw--two {
          left: -1.35rem;
          bottom: 0.8rem;
        }

        @keyframes running-dog-cta-cross {
          from {
            transform: translate3d(calc(-100% - 2rem), 0, 0);
          }

          to {
            transform: translate3d(calc(100vw + 2rem), 0, 0);
          }
        }

        @keyframes running-dog-cta-bob {
          from {
            transform: translateY(0);
          }

          to {
            transform: translateY(-0.25rem);
          }
        }

        @keyframes running-dog-cta-paw {
          0% {
            opacity: 0;
            transform: translate3d(0.6rem, 0.15rem, 0) scale(0.8);
          }

          35% {
            opacity: 0.4;
          }

          100% {
            opacity: 0;
            transform: translate3d(-0.55rem, 0, 0) scale(1);
          }
        }

        @media (prefers-reduced-motion: no-preference) {
          .running-dog-cta__runner {
            left: 0;
            animation: running-dog-cta-cross 18s linear infinite;
            will-change: transform;
          }

          .running-dog-cta__dog {
            animation: running-dog-cta-bob 420ms ease-in-out infinite alternate;
          }

          .running-dog-cta__paw {
            display: block;
            animation: running-dog-cta-paw 850ms ease-out infinite;
          }

          .running-dog-cta__paw--two {
            animation-delay: 260ms;
          }
        }
      `}</style>
    </aside>
  );
}
