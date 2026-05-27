"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

type PetMascotCTAProps = {
  className?: string;
};

const RUN_VIDEO_SRC = "/animations/boston-terrier-run.webm";
const RUN_POSTER_SRC = "/animations/boston-terrier-run-poster.webp";

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

function RunningDogMedia() {
  return (
    <>
      <video
        className="pet-mascot-cta__dog-video"
        src={RUN_VIDEO_SRC}
        poster={RUN_POSTER_SRC}
        muted
        playsInline
        loop
        autoPlay
        preload="metadata"
        aria-hidden="true"
      />
      <img
        className="pet-mascot-cta__dog-poster"
        src={RUN_POSTER_SRC}
        alt=""
        width={480}
        height={320}
        decoding="async"
        aria-hidden="true"
      />
    </>
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
        <RunningDogMedia />
      </div>

      <Link href="/signup" className="pet-mascot-cta__signup-paw pointer-events-auto" aria-label="Sign up">
        <PawIcon />
      </Link>

      <style>{`
        .pet-mascot-cta {
          --pet-shadow: rgba(26, 26, 31, 0.14);
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
          width: clamp(5.5rem, 9vw, 7.25rem);
          max-width: 480px;
          opacity: 0;
          transform: translate3d(-12rem, 0.08rem, 0);
          will-change: transform, opacity;
        }

        .pet-mascot-cta__dog-video,
        .pet-mascot-cta__dog-poster {
          display: block;
          height: auto;
          width: 100%;
          object-fit: contain;
          object-position: left bottom;
          filter: drop-shadow(0 6px 10px var(--pet-shadow));
        }

        .pet-mascot-cta__dog-poster {
          display: none;
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

        .dark .pet-mascot-cta__dog-video,
        .dark .pet-mascot-cta__dog-poster {
          filter:
            drop-shadow(0 6px 12px rgba(0, 0, 0, 0.32))
            drop-shadow(0 0 8px rgba(247, 248, 250, 0.06));
        }

        .dark .pet-mascot-cta__signup-paw {
          color: rgba(195, 232, 210, 0.62);
          filter: drop-shadow(0 0 8px rgba(47, 107, 63, 0.22));
        }

        @keyframes pet-mascot-cross {
          0%,
          8% {
            opacity: 0;
            transform: translate3d(-12rem, 0.1rem, 0);
          }
          10%,
          34% {
            opacity: 1;
          }
          42% {
            opacity: 0.95;
            transform: translate3d(calc(100vw + 12rem), -0.08rem, 0);
          }
          43%,
          100% {
            opacity: 0;
            transform: translate3d(calc(100vw + 12rem), -0.08rem, 0);
          }
        }

        @media (prefers-reduced-motion: no-preference) {
          .pet-mascot-cta__runner {
            animation: pet-mascot-cross 31s linear 2.5s infinite both;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .pet-mascot-cta__runner {
            opacity: 1;
            animation: none;
            transform: translate3d(calc(100vw - clamp(8rem, 16vw, 12rem)), 0.08rem, 0);
          }

          .pet-mascot-cta__dog-video {
            display: none;
          }

          .pet-mascot-cta__dog-poster {
            display: block;
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
