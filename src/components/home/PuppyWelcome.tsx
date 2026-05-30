"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useCallback, useEffect, useRef, useState } from "react";

const VIDEO_SRC = "/animations/puppy-welcome.webm";
const FALLBACK_SRC = "/animations/puppy-welcome-fallback.webp";
const ENTER_MS = 900;
const DISPLAY_MS = 7200;
const EXIT_MS = 650;

type Phase = "idle" | "enter" | "show" | "exit" | "done";

export function PuppyWelcome() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const copy = t.hero.puppyWelcome;

  const [phase, setPhase] = useState<Phase>("idle");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [posterOnly, setPosterOnly] = useState(false);
  const [replaySeed, setReplaySeed] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    for (const id of timersRef.current) window.clearTimeout(id);
    timersRef.current = [];
  }, []);

  const runSequence = useCallback(() => {
    clearTimers();
    setPosterOnly(false);

    if (reducedMotion) {
      setPhase("show");
      timersRef.current.push(window.setTimeout(() => setPhase("done"), 5000));
      return;
    }

    setPhase("enter");
    timersRef.current.push(
      window.setTimeout(() => setPhase("show"), ENTER_MS),
      window.setTimeout(() => setPhase("exit"), DISPLAY_MS),
      window.setTimeout(() => setPhase("done"), DISPLAY_MS + EXIT_MS),
    );
  }, [clearTimers, reducedMotion]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (loading || user) return;
    runSequence();
    return clearTimers;
  }, [loading, user, replaySeed, runSequence, clearTimers]);

  useEffect(() => {
    if (posterOnly || reducedMotion || phase === "done" || phase === "idle") return;
    const video = videoRef.current;
    if (!video) return;
    void video.play().catch(() => setPosterOnly(true));
  }, [phase, posterOnly, reducedMotion, replaySeed]);

  if (loading || user) return null;

  const visible = phase !== "done";
  const bubbleVisible = phase === "show" || phase === "exit" || (reducedMotion && phase !== "done" && phase !== "idle");

  return (
    <>
      {visible ? (
        <aside
          className={`puppy-welcome pointer-events-none absolute bottom-3 right-2 z-20 hidden md:block lg:bottom-5 lg:right-4 xl:right-8 ${
            phase === "enter" ? "puppy-welcome--enter" : ""
          } ${phase === "show" ? "puppy-welcome--show" : ""} ${phase === "exit" ? "puppy-welcome--exit" : ""}`}
          aria-label={copy.ariaLabel}
        >
          <div className="puppy-welcome__inner">
            <div
              className={`puppy-welcome__bubble pointer-events-auto ${bubbleVisible ? "puppy-welcome__bubble--visible" : ""}`}
              role="status"
              aria-live="polite"
            >
              <p className="puppy-welcome__message">{copy.message}</p>
              <div className="puppy-welcome__actions">
                <Link href="/signup" className="puppy-welcome__link puppy-welcome__link--primary">
                  {copy.signUp}
                </Link>
                <span className="puppy-welcome__sep" aria-hidden>
                  ·
                </span>
                <Link href="/login" className="puppy-welcome__link">
                  {copy.logIn}
                </Link>
              </div>
              <span className="puppy-welcome__hint" aria-hidden>
                {copy.hint}
                <svg className="puppy-welcome__arrow" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M6 18L18 6M14 6h4v4"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>

            <div className="puppy-welcome__media" aria-hidden>
              {!posterOnly && !reducedMotion ? (
                <video
                  ref={videoRef}
                  key={replaySeed}
                  className="puppy-welcome__video"
                  src={VIDEO_SRC}
                  poster={FALLBACK_SRC}
                  muted
                  playsInline
                  autoPlay
                  preload="metadata"
                  loop={false}
                  onError={() => setPosterOnly(true)}
                />
              ) : null}
              <img
                className={`puppy-welcome__poster ${posterOnly || reducedMotion ? "puppy-welcome__poster--visible" : ""}`}
                src={FALLBACK_SRC}
                alt=""
                width={280}
                height={210}
                decoding="async"
              />
            </div>
          </div>
        </aside>
      ) : (
        <button
          type="button"
          className="puppy-welcome-replay pointer-events-auto absolute bottom-3 right-3 z-20 hidden items-center gap-1.5 rounded-full border border-border/80 bg-surface/90 px-3 py-1.5 text-xs font-medium text-muted shadow-sm backdrop-blur-sm transition-colors hover:border-brand-teal/30 hover:text-brand-teal md:inline-flex lg:bottom-5 lg:right-4"
          onClick={() => setReplaySeed((n) => n + 1)}
          aria-label={copy.replayLabel}
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          {copy.replay}
        </button>
      )}

      <style>{`
        .puppy-welcome {
          --puppy-shadow: rgba(26, 26, 31, 0.16);
          width: min(17rem, 34vw);
          opacity: 0;
          transform: translate3d(2.5rem, 2rem, 0) scale(0.94);
          transition:
            opacity ${EXIT_MS}ms ease,
            transform ${EXIT_MS}ms ease;
        }

        .puppy-welcome--enter {
          animation: puppy-welcome-enter ${ENTER_MS}ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .puppy-welcome--show {
          opacity: 1;
          transform: translate3d(0, 0, 0) scale(1);
        }

        .puppy-welcome--exit {
          opacity: 0;
          transform: translate3d(1.25rem, 1.5rem, 0) scale(0.96);
        }

        .puppy-welcome__inner {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.35rem;
        }

        .puppy-welcome__bubble {
          position: relative;
          max-width: 13.5rem;
          border-radius: 1rem;
          border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
          background: color-mix(in srgb, var(--surface) 88%, transparent);
          padding: 0.65rem 0.8rem;
          box-shadow:
            0 10px 28px rgba(0, 0, 0, 0.08),
            0 2px 8px rgba(0, 0, 0, 0.04);
          backdrop-filter: blur(10px);
          opacity: 0;
          transform: translateY(0.35rem);
          transition:
            opacity 420ms ease 120ms,
            transform 420ms cubic-bezier(0.22, 1, 0.36, 1) 120ms;
        }

        .puppy-welcome__bubble--visible {
          opacity: 1;
          transform: translateY(0);
        }

        .puppy-welcome__bubble::after {
          content: "";
          position: absolute;
          right: 1.35rem;
          bottom: -0.45rem;
          width: 0.75rem;
          height: 0.75rem;
          rotate: 45deg;
          border-right: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
          border-bottom: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
          background: color-mix(in srgb, var(--surface) 88%, transparent);
        }

        .puppy-welcome__message {
          margin: 0;
          font-size: 0.8125rem;
          line-height: 1.45;
          font-weight: 600;
          color: var(--foreground);
        }

        .puppy-welcome__actions {
          margin-top: 0.45rem;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.35rem;
        }

        .puppy-welcome__link {
          font-size: 0.75rem;
          font-weight: 600;
          color: color-mix(in srgb, var(--foreground) 72%, transparent);
          text-decoration: none;
          transition: color 160ms ease;
        }

        .puppy-welcome__link:hover {
          color: var(--brand-teal);
        }

        .puppy-welcome__link--primary {
          color: var(--brand-teal);
        }

        .puppy-welcome__sep {
          color: color-mix(in srgb, var(--muted) 80%, transparent);
          font-size: 0.75rem;
        }

        .puppy-welcome__hint {
          display: inline-flex;
          align-items: center;
          gap: 0.2rem;
          margin-top: 0.35rem;
          font-size: 0.625rem;
          font-weight: 500;
          letter-spacing: 0.02em;
          color: color-mix(in srgb, var(--muted) 90%, transparent);
        }

        .puppy-welcome__arrow {
          width: 0.75rem;
          height: 0.75rem;
          opacity: 0.75;
        }

        .puppy-welcome__media {
          position: relative;
          width: clamp(7.5rem, 14vw, 10.5rem);
          aspect-ratio: 4 / 3;
        }

        .puppy-welcome__video,
        .puppy-welcome__poster {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: right bottom;
          filter: drop-shadow(0 10px 18px var(--puppy-shadow));
        }

        .puppy-welcome__poster {
          opacity: 0;
          transition: opacity 240ms ease;
        }

        .puppy-welcome__poster--visible {
          opacity: 1;
        }

        .dark .puppy-welcome__video,
        .dark .puppy-welcome__poster {
          filter:
            drop-shadow(0 10px 20px rgba(0, 0, 0, 0.35))
            drop-shadow(0 0 10px rgba(247, 248, 250, 0.05));
        }

        .dark .puppy-welcome {
          --puppy-shadow: rgba(0, 0, 0, 0.42);
        }

        @keyframes puppy-welcome-enter {
          from {
            opacity: 0;
            transform: translate3d(2.75rem, 2.25rem, 0) scale(0.92);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .puppy-welcome {
            animation: none !important;
            opacity: 1;
            transform: none;
          }

          .puppy-welcome__bubble {
            transition: none;
            opacity: 1;
            transform: none;
          }

          .puppy-welcome__video {
            display: none;
          }

          .puppy-welcome__poster {
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
