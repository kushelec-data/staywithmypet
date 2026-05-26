"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

type PetMascotCTAProps = {
  className?: string;
};

function PawIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        d="M16.1 21.4c-2.9.4-5.2-2.6-5.7-6.1-.5-3.7 1.1-6.9 4-7.3 2.9-.4 5.1 2.5 5.7 6.1.5 3.7-1.2 6.9-4 7.3Zm15.8 0c-2.8-.4-4.5-3.6-4-7.3.6-3.6 2.8-6.5 5.7-6.1 2.9.4 4.5 3.6 4 7.3-.5 3.5-2.8 6.5-5.7 6.1Zm-7.9-4c-2.8 0-4.8-3-4.8-6.6S21.2 4 24 4s4.8 3.1 4.8 6.8-2 6.6-4.8 6.6Zm-.1 8.2c6.5 0 12.4 5.5 12.4 11.4 0 4.7-3.7 7-8.5 5.6-1.2-.4-2.5-.8-3.9-.8-1.5 0-2.8.4-4 .8-4.8 1.4-8.4-.9-8.4-5.6 0-5.9 5.9-11.4 12.4-11.4Z"
        fill="currentColor"
      />
    </svg>
  );
}

function RunningPuppy() {
  return (
    <svg className="pet-mascot-cta__dog-svg" viewBox="0 0 150 92" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="petMascotGoldenFur" x1="18" x2="120" y1="12" y2="78" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f8c277" />
          <stop offset="0.55" stopColor="#d98a36" />
          <stop offset="1" stopColor="#b96b22" />
        </linearGradient>
        <linearGradient id="petMascotCreamFur" x1="82" x2="142" y1="20" y2="66" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff7e9" />
          <stop offset="1" stopColor="#f0d4ae" />
        </linearGradient>
      </defs>
      <ellipse cx="70" cy="80" rx="50" ry="8" fill="#5f3d20" opacity="0.12" />
      <path
        className="pet-mascot-cta__tail"
        d="M27 45c-13-2-19-11-16-20 8 1 17 8 18 17"
        fill="none"
        stroke="#c87526"
        strokeLinecap="round"
        strokeWidth="10"
      />
      <path
        d="M33 49c4-18 20-29 43-27 18 1 34 10 40 24 4 10 0 20-10 24-15 6-44 6-62 1-11-3-15-11-11-22Z"
        fill="url(#petMascotGoldenFur)"
      />
      <path d="M98 34c4-12 16-19 29-16 15 4 20 18 13 31-5 9-16 13-29 9-11-3-17-12-13-24Z" fill="url(#petMascotCreamFur)" />
      <path d="M111 25c-1-13 8-17 18-11-1 12-8 19-17 20" fill="#b76424" />
      <path className="pet-mascot-cta__ear" d="M101 27c-10-9-23-7-27 3 6 11 18 13 28 5" fill="#9f551f" />
      <path d="M118 46c8 3 16 2 21-3-1 9-8 15-19 14-7-1-12-4-15-8 3-4 7-5 13-3Z" fill="#fff9ef" />
      <circle cx="124" cy="34" r="3.1" fill="#2b1a10" />
      <circle cx="125" cy="33" r="1" fill="#fff" opacity="0.8" />
      <path d="M139 39c4 1 6 3 4 5-2 2-5 1-8-1 1-2 2-3 4-4Z" fill="#2b1a10" />
      <path d="M102 51c-12 4-26 3-41-2" fill="none" stroke="#fff4df" strokeLinecap="round" strokeWidth="4" opacity="0.45" />
      <path className="pet-mascot-cta__leg pet-mascot-cta__leg--front" d="M100 66c5 9 12 12 22 11" fill="none" stroke="#b96b22" strokeLinecap="round" strokeWidth="9" />
      <path className="pet-mascot-cta__leg pet-mascot-cta__leg--front-alt" d="M92 67c-2 9-7 14-17 17" fill="none" stroke="#d68a38" strokeLinecap="round" strokeWidth="9" />
      <path className="pet-mascot-cta__leg pet-mascot-cta__leg--back" d="M53 68c-8 7-17 9-29 7" fill="none" stroke="#b96b22" strokeLinecap="round" strokeWidth="9" />
      <path className="pet-mascot-cta__leg pet-mascot-cta__leg--back-alt" d="M60 68c3 8 9 13 19 15" fill="none" stroke="#d68a38" strokeLinecap="round" strokeWidth="9" />
      <path d="M100 54c5 4 12 6 19 5" fill="none" stroke="#2f6b3f" strokeLinecap="round" strokeWidth="4" />
    </svg>
  );
}

export function PetMascotCTA({ className = "" }: PetMascotCTAProps) {
  const { user, loading } = useAuth();

  if (loading || user) {
    return null;
  }

  return (
    <aside aria-label="Join StayWithMyPet" className={`pet-mascot-cta pointer-events-none hidden md:block ${className}`}>
      <div className="pet-mascot-cta__runner" aria-hidden="true">
        <span className="pet-mascot-cta__copy">Let’s go!</span>
        <span className="pet-mascot-cta__sparkle pet-mascot-cta__sparkle--one">✦</span>
        <span className="pet-mascot-cta__sparkle pet-mascot-cta__sparkle--two">✧</span>
        <span className="pet-mascot-cta__paw-print pet-mascot-cta__paw-print--one">
          <PawIcon />
        </span>
        <span className="pet-mascot-cta__paw-print pet-mascot-cta__paw-print--two">
          <PawIcon />
        </span>
        <span className="pet-mascot-cta__paw-print pet-mascot-cta__paw-print--three">
          <PawIcon />
        </span>
        <RunningPuppy />
      </div>

      <Link href="/signup" className="pet-mascot-cta__signup-paw pointer-events-auto" aria-label="Sign up">
        <PawIcon />
      </Link>

      <style>{`
        .pet-mascot-cta {
          --pet-gold: #f5b453;
          --pet-gold-deep: #c77723;
          --pet-ink: #2f2a24;
          position: fixed;
          right: 0;
          bottom: clamp(4.25rem, 9vh, 6.5rem);
          left: 0;
          z-index: 40;
          height: 0;
          overflow: visible;
        }

        .pet-mascot-cta__runner {
          position: absolute;
          bottom: 0;
          left: 0;
          width: clamp(6.5rem, 11vw, 8.5rem);
          opacity: 0;
          transform: translate3d(-12rem, 0.1rem, 0);
          will-change: transform, opacity;
        }

        .pet-mascot-cta__dog-svg {
          display: block;
          height: auto;
          width: 100%;
          overflow: visible;
          filter: drop-shadow(0 10px 10px rgba(95, 61, 32, 0.13));
        }

        .pet-mascot-cta__paw-print {
          position: absolute;
          z-index: -1;
          color: rgba(199, 119, 35, 0.2);
          opacity: 0.7;
        }

        .pet-mascot-cta__paw-print svg {
          display: block;
          height: 0.58rem;
          width: 0.58rem;
          transform: rotate(-16deg);
        }

        .pet-mascot-cta__paw-print--one {
          bottom: 0.9rem;
          left: -0.65rem;
        }

        .pet-mascot-cta__paw-print--two {
          bottom: 1.55rem;
          left: -1.85rem;
        }

        .pet-mascot-cta__paw-print--three {
          bottom: 0.95rem;
          left: -3rem;
          opacity: 0.42;
        }

        .pet-mascot-cta__copy {
          position: absolute;
          top: -0.45rem;
          left: 62%;
          z-index: 2;
          margin: 0;
          color: var(--pet-ink);
          font-family: var(--font-poppins), system-ui, sans-serif;
          font-size: clamp(0.76rem, 1.2vw, 0.92rem);
          font-weight: 600;
          letter-spacing: -0.03em;
          text-shadow: 0 1px 0 rgba(255, 255, 255, 0.75);
          transform: rotate(-5deg);
          white-space: nowrap;
          pointer-events: none;
        }

        .pet-mascot-cta__signup-paw {
          position: absolute;
          right: clamp(1.25rem, 4vw, 3rem);
          bottom: 0.2rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 1.65rem;
          width: 1.65rem;
          border-radius: 999px;
          color: rgba(239, 125, 131, 0.72);
          opacity: 0.68;
          transition:
            opacity 180ms ease,
            transform 180ms ease,
            filter 180ms ease;
        }

        .pet-mascot-cta__signup-paw:focus-visible {
          outline: 2px solid var(--brand-teal);
          outline-offset: 4px;
        }

        .pet-mascot-cta__signup-paw:hover {
          opacity: 1;
          transform: translateY(-1px) scale(1.06);
          filter: drop-shadow(0 0 10px rgba(239, 125, 131, 0.32));
        }

        .pet-mascot-cta__signup-paw svg {
          height: 100%;
          width: 100%;
        }

        .pet-mascot-cta__sparkle {
          position: absolute;
          z-index: 1;
          display: none;
          color: rgba(245, 180, 83, 0.56);
          font-size: 0.82rem;
          line-height: 1;
          opacity: 0;
          pointer-events: none;
        }

        .pet-mascot-cta__sparkle--one {
          top: 0.45rem;
          right: 0.55rem;
        }

        .pet-mascot-cta__sparkle--two {
          top: 1.35rem;
          right: -0.25rem;
          font-size: 0.68rem;
        }

        .dark .pet-mascot-cta__dog-svg {
          filter:
            drop-shadow(0 10px 10px rgba(0, 0, 0, 0.22))
            drop-shadow(0 0 14px rgba(245, 180, 83, 0.12));
        }

        .dark .pet-mascot-cta__copy {
          color: #f9e4bd;
          text-shadow: 0 0 18px rgba(245, 180, 83, 0.24);
        }

        .dark .pet-mascot-cta__paw-print {
          color: rgba(250, 202, 112, 0.2);
        }

        .dark .pet-mascot-cta__signup-paw {
          color: rgba(245, 180, 83, 0.68);
          filter: drop-shadow(0 0 8px rgba(245, 180, 83, 0.2));
        }

        .dark .pet-mascot-cta__sparkle {
          display: block;
          opacity: 0.72;
          text-shadow: 0 0 14px rgba(245, 180, 83, 0.72);
        }

        @keyframes pet-mascot-cross {
          0%,
          8% {
            opacity: 0;
            transform: translate3d(-12rem, 0.14rem, 0);
          }
          10%,
          34% {
            opacity: 1;
          }
          42% {
            opacity: 0.95;
            transform: translate3d(calc(100vw + 12rem), -0.1rem, 0);
          }
          43%,
          100% {
            opacity: 0;
            transform: translate3d(calc(100vw + 12rem), -0.1rem, 0);
          }
        }

        @keyframes pet-mascot-breathe {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(-0.28rem);
          }
        }

        @keyframes pet-mascot-tail {
          0%,
          100% {
            transform: rotate(-8deg);
          }
          50% {
            transform: rotate(11deg);
          }
        }

        @keyframes pet-mascot-legs {
          0%,
          100% {
            transform: translate(0, 0) rotate(0deg);
          }
          50% {
            transform: translate(0.1rem, -0.08rem) rotate(7deg);
          }
        }

        @keyframes pet-mascot-paw-fade {
          0%,
          100% {
            opacity: 0.28;
          }
          50% {
            opacity: 0.7;
          }
        }

        @keyframes pet-mascot-twinkle {
          0%,
          100% {
            opacity: 0.64;
            transform: scale(0.92);
          }
          50% {
            opacity: 1;
            transform: scale(1.08);
          }
        }

        @media (prefers-reduced-motion: no-preference) {
          .pet-mascot-cta__runner {
            animation: pet-mascot-cross 31s linear 2.5s infinite both;
          }

          .pet-mascot-cta__dog-svg {
            animation: pet-mascot-breathe 520ms ease-in-out infinite alternate;
          }

          .pet-mascot-cta__tail {
            transform-origin: 29px 44px;
            animation: pet-mascot-tail 520ms ease-in-out infinite;
          }

          .pet-mascot-cta__leg {
            transform-box: fill-box;
            transform-origin: center;
            animation: pet-mascot-legs 420ms ease-in-out infinite;
          }

          .pet-mascot-cta__leg--front-alt,
          .pet-mascot-cta__leg--back {
            animation-delay: 210ms;
          }

          .pet-mascot-cta__paw-print {
            animation: pet-mascot-paw-fade 820ms ease-in-out infinite;
          }

          .pet-mascot-cta__sparkle {
            animation: pet-mascot-twinkle 3.2s ease-in-out infinite;
          }

          .pet-mascot-cta__sparkle--two {
            animation-delay: 1.1s;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .pet-mascot-cta__runner {
            display: none;
          }
        }

        @media (max-width: 767px) {
          .pet-mascot-cta {
            display: none;
          }
        }
      `}</style>
    </aside>
  );
}
