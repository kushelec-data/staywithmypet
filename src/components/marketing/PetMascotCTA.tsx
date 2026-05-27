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

function RunningBostonTerrier() {
  return (
    <svg className="pet-mascot-cta__dog-svg" viewBox="0 0 150 92" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="petMascotCoatBlack" x1="24" x2="108" y1="18" y2="72" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2a2a30" />
          <stop offset="1" stopColor="#141418" />
        </linearGradient>
        <linearGradient id="petMascotCoatWhite" x1="88" x2="138" y1="22" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fafbfc" />
          <stop offset="1" stopColor="#e8eaee" />
        </linearGradient>
      </defs>
      <ellipse cx="72" cy="81" rx="46" ry="7" fill="#1a1a1f" opacity="0.1" />
      <path
        className="pet-mascot-cta__tail"
        d="M30 48c-4-6-3-12 2-14 3 5 2 10-2 14"
        fill="#1c1c22"
        stroke="#1c1c22"
        strokeLinejoin="round"
        strokeWidth="1"
      />
      <path
        d="M36 52c2-14 18-24 40-22 14 1 28 8 34 20 3 7 1 15-7 19-12 6-38 7-55 2-9-3-13-10-12-19Z"
        fill="url(#petMascotCoatBlack)"
      />
      <path
        d="M48 58c10 5 24 6 36 2 8-3 12-9 10-16-2-8-10-14-22-15-12-1-22 5-26 14-2 5 0 11 2 15Z"
        fill="url(#petMascotCoatWhite)"
      />
      <path
        d="M94 36c3-10 14-16 28-13 12 3 18 14 13 26-4 9-13 14-24 12-9-2-15-9-17-18-1-4 0-5 0-7Z"
        fill="url(#petMascotCoatWhite)"
      />
      <path
        d="M108 30c8-2 16 0 20 6-6 2-12 1-16-2-2-2-3-3-4-4Z"
        fill="#1c1c22"
      />
      <path className="pet-mascot-cta__ear" d="M104 24c-6-8-14-9-18-2 4 7 11 9 18 4" fill="#1c1c22" />
      <path className="pet-mascot-cta__ear" d="M98 21c-5-6-12-5-14 1 3 5 9 6 14 2" fill="#24242c" opacity="0.85" />
      <path d="M118 44c7 2 14 1 18-4-1 7-7 12-16 11-6-1-10-3-12-6 2-2 6-2 10-1Z" fill="#f4f5f7" />
      <ellipse cx="123" cy="33" rx="4.2" ry="4.8" fill="#1c1c22" />
      <circle cx="124.5" cy="31.5" r="1.1" fill="#f7f8fa" opacity="0.85" />
      <ellipse cx="133" cy="38" rx="2.4" ry="2" fill="#2a2a30" />
      <path d="M140 40c3 1 5 3 3 5-2 2-5 0-7-2 1-2 2-2 4-3Z" fill="#1c1c22" />
      <path
        d="M105 50c-10 3-22 3-34 0"
        fill="none"
        stroke="#dce0e6"
        strokeLinecap="round"
        strokeWidth="3"
        opacity="0.55"
      />
      <path
        className="pet-mascot-cta__leg pet-mascot-cta__leg--front"
        d="M98 66c4 8 11 11 20 10"
        fill="none"
        stroke="#1c1c22"
        strokeLinecap="round"
        strokeWidth="7"
      />
      <path
        className="pet-mascot-cta__leg pet-mascot-cta__leg--front-alt"
        d="M90 67c-1 8-6 13-15 15"
        fill="none"
        stroke="#303038"
        strokeLinecap="round"
        strokeWidth="7"
      />
      <path
        className="pet-mascot-cta__leg pet-mascot-cta__leg--back"
        d="M52 68c-7 6-15 8-26 6"
        fill="none"
        stroke="#1c1c22"
        strokeLinecap="round"
        strokeWidth="7"
      />
      <path
        className="pet-mascot-cta__leg pet-mascot-cta__leg--back-alt"
        d="M58 68c2 7 8 12 17 14"
        fill="none"
        stroke="#303038"
        strokeLinecap="round"
        strokeWidth="7"
      />
      <ellipse cx="104" cy="66" rx="3.2" ry="2.4" fill="#f4f5f7" />
      <ellipse cx="78" cy="68" rx="3" ry="2.2" fill="#f4f5f7" />
      <path
        d="M99 53c6 3 13 4 20 3"
        fill="none"
        stroke="#265d32"
        strokeLinecap="round"
        strokeWidth="3.5"
        opacity="0.92"
      />
      <circle cx="108" cy="53" r="1.6" fill="#c3e8d2" opacity="0.9" />
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
        <RunningBostonTerrier />
      </div>

      <Link href="/signup" className="pet-mascot-cta__signup-paw pointer-events-auto" aria-label="Sign up">
        <PawIcon />
      </Link>

      <style>{`
        .pet-mascot-cta {
          --pet-ink: #2f2a24;
          --pet-shadow: rgba(26, 26, 31, 0.12);
          --pet-collar: #265d32;
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
          filter: drop-shadow(0 8px 12px var(--pet-shadow));
        }

        .pet-mascot-cta__paw-print {
          position: absolute;
          z-index: -1;
          color: rgba(38, 93, 50, 0.16);
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
          color: rgba(38, 93, 50, 0.28);
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
            drop-shadow(0 8px 14px rgba(0, 0, 0, 0.28))
            drop-shadow(0 0 10px rgba(247, 248, 250, 0.08));
        }

        .dark .pet-mascot-cta__copy {
          color: #e8eaee;
          text-shadow: 0 0 12px rgba(247, 248, 250, 0.14);
        }

        .dark .pet-mascot-cta__paw-print {
          color: rgba(195, 232, 210, 0.14);
        }

        .dark .pet-mascot-cta__signup-paw {
          color: rgba(195, 232, 210, 0.62);
          filter: drop-shadow(0 0 8px rgba(47, 107, 63, 0.22));
        }

        .dark .pet-mascot-cta__sparkle {
          display: block;
          color: rgba(195, 232, 210, 0.32);
          opacity: 0.55;
          text-shadow: 0 0 10px rgba(247, 248, 250, 0.18);
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
            transform-origin: 32px 48px;
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
            opacity: 1;
            animation: none;
            transform: translate3d(calc(100vw - clamp(9rem, 18vw, 14rem)), 0.1rem, 0);
          }

          .pet-mascot-cta__dog-svg,
          .pet-mascot-cta__tail,
          .pet-mascot-cta__leg,
          .pet-mascot-cta__paw-print,
          .pet-mascot-cta__sparkle {
            animation: none;
          }

          .pet-mascot-cta__sparkle {
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
