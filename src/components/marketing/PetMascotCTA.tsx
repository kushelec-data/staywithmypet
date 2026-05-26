"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

type PetMascotCTAProps = {
  variant?: "home" | "pricing";
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

function SittingPuppy() {
  return (
    <svg className="pet-mascot-cta__sit-svg" viewBox="0 0 132 122" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="petMascotNightFur" x1="20" x2="105" y1="18" y2="112" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffd59a" />
          <stop offset="0.55" stopColor="#d68a35" />
          <stop offset="1" stopColor="#a9581c" />
        </linearGradient>
      </defs>
      <ellipse cx="67" cy="109" rx="43" ry="8" fill="#020a16" opacity="0.35" />
      <path d="M37 82c-4 16 5 27 27 27 24 0 36-12 32-29-3-17-17-30-34-30-14 0-21 12-25 32Z" fill="url(#petMascotNightFur)" />
      <path d="M45 58c0-22 13-37 32-38 20-1 35 14 35 33 0 18-14 32-33 32-20 0-34-11-34-27Z" fill="#f3b766" />
      <path d="M52 39c-11-10-22-9-28 1 4 14 16 18 28 10" fill="#9f5522" />
      <path d="M93 31c5-14 16-17 26-8-1 13-9 21-22 21" fill="#b76424" />
      <path d="M71 58c11 4 24 2 34-7 0 16-11 26-27 26-12 0-21-5-26-13 5-6 12-8 19-6Z" fill="#fff5e6" />
      <circle cx="84" cy="45" r="3" fill="#1f160d" />
      <circle cx="85" cy="44" r="1" fill="#fff" />
      <path d="M99 50c4 0 6 2 5 4-1 3-5 3-9 0 0-2 2-4 4-4Z" fill="#1f160d" />
      <path d="M71 61c1 6 6 9 13 9" fill="none" stroke="#8f4d1e" strokeLinecap="round" strokeWidth="3" opacity="0.55" />
      <path d="M36 83c-12-3-18-13-15-25 11 2 20 12 21 24" fill="none" stroke="#c87526" strokeLinecap="round" strokeWidth="9" />
      <path d="M55 88c-10 8-16 14-21 20" fill="none" stroke="#b76424" strokeLinecap="round" strokeWidth="8" />
      <path d="M86 88c10 8 17 14 22 20" fill="none" stroke="#b76424" strokeLinecap="round" strokeWidth="8" />
    </svg>
  );
}

export function PetMascotCTA({ variant = "home", className = "" }: PetMascotCTAProps) {
  const { user, loading } = useAuth();

  if (loading || user) {
    return null;
  }

  const lightText = variant === "pricing" ? "Meet friends 🐾" : "Let’s go!";

  return (
    <aside aria-label="Join StayWithMyPet" className={`pet-mascot-cta pointer-events-none relative z-10 ${className}`}>
      <div className="pet-mascot-cta__stage pet-mascot-cta__stage--light">
        <svg className="pet-mascot-cta__path pet-mascot-cta__path--light" viewBox="0 0 900 120" preserveAspectRatio="none" aria-hidden="true">
          <path d="M36 78 C 152 48, 248 86, 342 64 S 520 34, 560 68 C 588 94, 526 96, 544 60 C 572 10, 650 58, 864 38" />
        </svg>

        <div className="pet-mascot-cta__runner" aria-hidden="true">
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

        <p className="pet-mascot-cta__copy pet-mascot-cta__copy--light">{lightText}</p>

        <Link href="/signup" className="pet-mascot-cta__paw-button pet-mascot-cta__paw-button--light pointer-events-auto" aria-label="Sign up">
          <PawIcon />
        </Link>
      </div>

      <div className="pet-mascot-cta__stage pet-mascot-cta__stage--dark">
        <span className="pet-mascot-cta__night-glow" aria-hidden="true" />
        <span className="pet-mascot-cta__star pet-mascot-cta__star--one" aria-hidden="true">
          ✦
        </span>
        <span className="pet-mascot-cta__star pet-mascot-cta__star--two" aria-hidden="true">
          ✧
        </span>

        <div className="pet-mascot-cta__sitter" aria-hidden="true">
          <SittingPuppy />
        </div>

        <svg className="pet-mascot-cta__path pet-mascot-cta__path--dark" viewBox="0 0 900 120" preserveAspectRatio="none" aria-hidden="true">
          <path d="M178 72 C 282 34, 370 90, 446 62 C 500 42, 510 82, 468 80 C 438 78, 448 34, 510 48 C 594 66, 660 58, 774 42" />
        </svg>

        <p className="pet-mascot-cta__copy pet-mascot-cta__copy--dark">Join our pack 🐾</p>

        <Link href="/signup" className="pet-mascot-cta__paw-button pet-mascot-cta__paw-button--dark pointer-events-auto" aria-label="Sign up">
          <PawIcon />
        </Link>
      </div>

      <style>{`
        .pet-mascot-cta {
          --pet-gold: #f5b453;
          --pet-gold-deep: #c77723;
          --pet-ink: #2f2a24;
          --pet-night: #06152b;
          --pet-night-soft: #0b2442;
        }

        .pet-mascot-cta__stage {
          position: relative;
          min-height: clamp(7rem, 15vw, 10rem);
          overflow: hidden;
          border-radius: clamp(1.35rem, 3vw, 2.25rem);
          isolation: isolate;
        }

        .pet-mascot-cta__stage--light {
          display: block;
          border: 1px solid rgba(111, 73, 35, 0.08);
          background:
            radial-gradient(circle at 8% 28%, rgba(255, 232, 194, 0.72), transparent 26%),
            radial-gradient(circle at 88% 54%, rgba(255, 218, 202, 0.68), transparent 18%),
            linear-gradient(180deg, rgba(255, 253, 247, 0.96), rgba(250, 246, 240, 0.9));
          box-shadow: 0 18px 55px rgba(95, 61, 32, 0.08);
        }

        .pet-mascot-cta__stage--dark {
          display: none;
          border: 1px solid rgba(251, 204, 120, 0.14);
          background:
            radial-gradient(circle at 84% 45%, rgba(245, 180, 83, 0.24), transparent 16%),
            radial-gradient(circle at 24% 110%, rgba(31, 91, 132, 0.36), transparent 38%),
            linear-gradient(135deg, var(--pet-night), var(--pet-night-soft) 54%, #071326);
          box-shadow: 0 22px 60px rgba(2, 10, 22, 0.34);
        }

        .dark .pet-mascot-cta__stage--light {
          display: none;
        }

        .dark .pet-mascot-cta__stage--dark {
          display: block;
        }

        .pet-mascot-cta__path {
          position: absolute;
          inset: auto 7% 20% 7%;
          z-index: 1;
          height: 56%;
          width: 86%;
          overflow: visible;
          fill: none;
          pointer-events: none;
        }

        .pet-mascot-cta__path path {
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 4 11;
          stroke-width: 2.1;
        }

        .pet-mascot-cta__path--light path {
          stroke: rgba(89, 71, 52, 0.34);
        }

        .pet-mascot-cta__path--dark {
          inset: auto 10% 24% 13%;
          height: 58%;
          width: 76%;
        }

        .pet-mascot-cta__path--dark path {
          stroke: rgba(250, 202, 112, 0.72);
          stroke-width: 2;
        }

        .pet-mascot-cta__runner {
          position: absolute;
          bottom: 0.92rem;
          left: 17%;
          z-index: 2;
          width: clamp(7.4rem, 18vw, 10.6rem);
          transform: translateZ(0);
        }

        .pet-mascot-cta__dog-svg,
        .pet-mascot-cta__sit-svg {
          display: block;
          height: auto;
          width: 100%;
          overflow: visible;
          filter: drop-shadow(0 12px 12px rgba(95, 61, 32, 0.14));
        }

        .pet-mascot-cta__paw-print {
          position: absolute;
          color: rgba(199, 119, 35, 0.32);
        }

        .pet-mascot-cta__paw-print svg {
          display: block;
          height: 0.8rem;
          width: 0.8rem;
          transform: rotate(-16deg);
        }

        .pet-mascot-cta__paw-print--one {
          bottom: 1.2rem;
          left: -1.05rem;
        }

        .pet-mascot-cta__paw-print--two {
          bottom: 2.1rem;
          left: -2.4rem;
        }

        .pet-mascot-cta__paw-print--three {
          bottom: 1.35rem;
          left: -3.7rem;
        }

        .pet-mascot-cta__copy {
          position: absolute;
          z-index: 3;
          margin: 0;
          color: var(--pet-ink);
          font-family: var(--font-poppins), system-ui, sans-serif;
          font-size: clamp(0.86rem, 2.2vw, 1.12rem);
          font-weight: 600;
          letter-spacing: -0.03em;
          text-shadow: 0 1px 0 rgba(255, 255, 255, 0.75);
          transform: rotate(-5deg);
          pointer-events: none;
        }

        .pet-mascot-cta__copy--light {
          left: clamp(9rem, 34vw, 25rem);
          top: 18%;
        }

        .pet-mascot-cta__copy--dark {
          right: clamp(5.8rem, 13vw, 9.5rem);
          top: 28%;
          color: #f9e4bd;
          text-shadow: 0 0 24px rgba(245, 180, 83, 0.28);
        }

        .pet-mascot-cta__paw-button {
          position: absolute;
          z-index: 5;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          transition:
            transform 180ms ease,
            box-shadow 180ms ease;
        }

        .pet-mascot-cta__paw-button:focus-visible {
          outline: 2px solid var(--brand-teal);
          outline-offset: 4px;
        }

        .pet-mascot-cta__paw-button:hover {
          transform: translateY(-1px) scale(1.03);
        }

        .pet-mascot-cta__paw-button svg {
          height: 45%;
          width: 45%;
        }

        .pet-mascot-cta__paw-button--light {
          right: clamp(1rem, 5vw, 3rem);
          top: 50%;
          height: clamp(3.2rem, 8vw, 4.4rem);
          width: clamp(3.2rem, 8vw, 4.4rem);
          color: #ef7d83;
          background: rgba(255, 255, 255, 0.88);
          box-shadow:
            0 14px 36px rgba(239, 125, 131, 0.24),
            0 0 0 9px rgba(255, 235, 230, 0.78);
          transform: translateY(-50%);
        }

        .pet-mascot-cta__paw-button--light:hover {
          transform: translateY(calc(-50% - 1px)) scale(1.03);
        }

        .pet-mascot-cta__paw-button--dark {
          right: clamp(1rem, 5vw, 3.2rem);
          top: 50%;
          height: clamp(3.1rem, 8vw, 4.5rem);
          width: clamp(3.1rem, 8vw, 4.5rem);
          color: #16120c;
          background: radial-gradient(circle at 34% 28%, #ffe7a6, #f5b453 68%, #d88b2d);
          box-shadow:
            0 0 30px rgba(245, 180, 83, 0.68),
            0 0 0 9px rgba(245, 180, 83, 0.12);
          transform: translateY(-50%);
        }

        .pet-mascot-cta__paw-button--dark:hover {
          transform: translateY(calc(-50% - 1px)) scale(1.03);
        }

        .pet-mascot-cta__sitter {
          position: absolute;
          bottom: 0.6rem;
          left: clamp(1rem, 7vw, 4rem);
          z-index: 2;
          width: clamp(5.6rem, 13vw, 8.2rem);
        }

        .pet-mascot-cta__night-glow {
          position: absolute;
          right: clamp(1.4rem, 6vw, 4.8rem);
          top: 50%;
          z-index: 0;
          height: 6rem;
          width: 6rem;
          border-radius: 999px;
          background: rgba(245, 180, 83, 0.2);
          filter: blur(24px);
          transform: translateY(-50%);
        }

        .pet-mascot-cta__star {
          position: absolute;
          z-index: 3;
          color: #ffd978;
          text-shadow: 0 0 18px rgba(245, 180, 83, 0.9);
          pointer-events: none;
        }

        .pet-mascot-cta__star--one {
          left: clamp(6rem, 19vw, 13rem);
          top: 19%;
          font-size: clamp(1.1rem, 2.4vw, 1.55rem);
        }

        .pet-mascot-cta__star--two {
          right: clamp(1.1rem, 3.5vw, 2.4rem);
          top: 18%;
          font-size: 0.92rem;
          opacity: 0.72;
        }

        @keyframes pet-mascot-run {
          from {
            left: -8.5rem;
          }
          to {
            left: calc(100% + 2.5rem);
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

        @keyframes pet-mascot-path {
          to {
            stroke-dashoffset: -120;
          }
        }

        @keyframes pet-mascot-pulse {
          0%,
          100% {
            box-shadow:
              0 14px 36px rgba(239, 125, 131, 0.24),
              0 0 0 8px rgba(255, 235, 230, 0.74);
          }
          50% {
            box-shadow:
              0 18px 42px rgba(239, 125, 131, 0.3),
              0 0 0 14px rgba(255, 235, 230, 0.5);
          }
        }

        @keyframes pet-mascot-night-pulse {
          0%,
          100% {
            box-shadow:
              0 0 30px rgba(245, 180, 83, 0.62),
              0 0 0 9px rgba(245, 180, 83, 0.12);
            filter: brightness(1);
          }
          50% {
            box-shadow:
              0 0 42px rgba(245, 180, 83, 0.84),
              0 0 0 14px rgba(245, 180, 83, 0.08);
            filter: brightness(1.06);
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
            animation: pet-mascot-run 11.5s linear infinite;
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

          .pet-mascot-cta__path path {
            animation: pet-mascot-path 8s linear infinite;
          }

          .pet-mascot-cta__paw-button--light {
            animation: pet-mascot-pulse 2.8s ease-in-out infinite;
          }

          .pet-mascot-cta__paw-button--dark {
            animation: pet-mascot-night-pulse 3.4s ease-in-out infinite;
          }

          .pet-mascot-cta__star {
            animation: pet-mascot-twinkle 3.2s ease-in-out infinite;
          }

          .pet-mascot-cta__star--two {
            animation-delay: 1.1s;
          }
        }

        @media (max-width: 640px) {
          .pet-mascot-cta__stage {
            min-height: 7.2rem;
          }

          .pet-mascot-cta__path--light {
            inset: auto 11% 14% 8%;
            width: 76%;
          }

          .pet-mascot-cta__runner {
            bottom: 0.72rem;
            width: 7.2rem;
          }

          .pet-mascot-cta__copy--light {
            left: 42%;
            top: 13%;
          }

          .pet-mascot-cta__copy--dark {
            right: 5.4rem;
            top: 18%;
            max-width: 7rem;
          }

          .pet-mascot-cta__sitter {
            left: 0.6rem;
            width: 5.5rem;
          }

          .pet-mascot-cta__path--dark {
            inset: auto 13% 16% 20%;
            width: 63%;
          }

          .pet-mascot-cta__star--one {
            left: 5.1rem;
            top: 17%;
          }
        }
      `}</style>
    </aside>
  );
}
