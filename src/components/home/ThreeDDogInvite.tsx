"use client";

import { useEffect, useMemo, useState } from "react";

type ThreeDDogInviteProps = {
  className?: string;
};

const DOG_POSTER_SRC = "/animations/boston-terrier-run-poster.webp";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function ThreeDDogInvite({ className = "" }: ThreeDDogInviteProps) {
  const [reduce, setReduce] = useState(true);

  useEffect(() => {
    setReduce(prefersReducedMotion());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduce(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const runnerClass = useMemo(() => {
    return reduce ? "swmp-3d-dog__runner swmp-3d-dog__runner--reduced" : "swmp-3d-dog__runner";
  }, [reduce]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none hidden md:block ${className}`}
    >
      <div className="swmp-3d-dog">
        <div className={runnerClass}>
          <img
            src={DOG_POSTER_SRC}
            alt=""
            width={480}
            height={320}
            decoding="async"
            className="swmp-3d-dog__img"
          />
          <div className="swmp-3d-dog__bubble">
            <span className="swmp-3d-dog__bubble-text">Invite me for the weekend 🐾</span>
          </div>
        </div>

        <div className="swmp-3d-dog__cta">
          Create your profile and meet pets nearby
        </div>
      </div>

      <style>{`
        .swmp-3d-dog {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 0;
          z-index: 10;
          overflow: visible;
        }

        .swmp-3d-dog__runner {
          --dog-shadow: rgba(26, 26, 31, 0.14);
          position: absolute;
          bottom: 0.35rem;
          left: 0;
          width: clamp(6.5rem, 10vw, 9rem);
          opacity: 0;
          transform: translate3d(-14rem, 0, 0);
          will-change: transform, opacity;
        }

        .swmp-3d-dog__img {
          display: block;
          width: 100%;
          height: auto;
          object-fit: contain;
          object-position: left bottom;
          filter: drop-shadow(0 10px 18px var(--dog-shadow));
        }

        .dark .swmp-3d-dog__img {
          filter:
            drop-shadow(0 12px 22px rgba(0,0,0,0.32))
            drop-shadow(0 0 10px rgba(247,248,250,0.06));
        }

        .swmp-3d-dog__bubble {
          position: absolute;
          left: 68%;
          bottom: 72%;
          transform: translateX(-50%);
          opacity: 0;
          will-change: opacity, transform;
          animation: swmp-dog-bubble 18s ease-in-out infinite both;
        }

        .swmp-3d-dog__bubble-text {
          display: inline-flex;
          max-width: 14rem;
          padding: 0.5rem 0.75rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 600;
          line-height: 1.1;
          color: rgba(28, 25, 23, 0.88);
          background: rgba(255, 255, 255, 0.82);
          border: 1px solid rgba(0,0,0,0.06);
          box-shadow: 0 10px 26px rgba(0,0,0,0.10);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        .dark .swmp-3d-dog__bubble-text {
          color: rgba(247, 248, 250, 0.88);
          background: rgba(17, 24, 39, 0.65);
          border-color: rgba(255,255,255,0.08);
          box-shadow: 0 12px 30px rgba(0,0,0,0.30);
        }

        .swmp-3d-dog__cta {
          position: absolute;
          right: clamp(1rem, 4vw, 2.5rem);
          bottom: 0.75rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: rgba(28, 25, 23, 0.62);
          text-shadow: 0 1px 0 rgba(255,255,255,0.65);
        }

        .dark .swmp-3d-dog__cta {
          color: rgba(247, 248, 250, 0.62);
          text-shadow: 0 1px 0 rgba(0,0,0,0.4);
        }

        @keyframes swmp-dog-run-inout {
          0%,
          8% {
            opacity: 0;
            transform: translate3d(-14rem, 0, 0);
          }
          12% {
            opacity: 1;
            transform: translate3d(2rem, 0, 0);
          }
          34% {
            opacity: 1;
            transform: translate3d(2rem, 0, 0);
          }
          44% {
            opacity: 0.95;
            transform: translate3d(calc(100vw + 14rem), 0, 0);
          }
          45%,
          100% {
            opacity: 0;
            transform: translate3d(calc(100vw + 14rem), 0, 0);
          }
        }

        @keyframes swmp-dog-bubble {
          0%,
          16% {
            opacity: 0;
            transform: translateX(-50%) translateY(6px);
          }
          18%,
          32% {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
          36%,
          100% {
            opacity: 0;
            transform: translateX(-50%) translateY(-2px);
          }
        }

        @media (prefers-reduced-motion: no-preference) {
          .swmp-3d-dog__runner {
            animation: swmp-dog-run-inout 18s ease-in-out 1.2s infinite both;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .swmp-3d-dog__runner--reduced {
            opacity: 1;
            transform: translate3d(calc(100vw - clamp(10rem, 18vw, 14rem)), 0, 0);
          }
          .swmp-3d-dog__bubble {
            animation: none;
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        @media (max-width: 900px) {
          .swmp-3d-dog__cta {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

