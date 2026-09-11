"use client";

import { useEffect, useState } from "react";

type Particle = {
  id: number;
  emoji: string;
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
  rotation: number;
  drift: number;
};

export type ReactionBurstEvent = {
  id: number;
  emoji: string;
  x: number;
  y: number;
};

function spawnParticles(emoji: string, origin: { x: number; y: number }): Particle[] {
  const count = 38 + Math.floor(Math.random() * 10);
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    emoji,
    left: origin.x + (Math.random() - 0.5) * 128,
    top: origin.y + (Math.random() - 0.5) * 28,
    size: 14 + Math.random() * 18,
    duration: 1.55 + Math.random() * 0.9,
    delay: Math.random() * 0.16,
    rotation: (Math.random() - 0.5) * 80,
    drift: (Math.random() - 0.5) * 150,
  }));
}

export function ReactionBurst({ burst }: { burst: ReactionBurstEvent | null }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!burst) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setParticles([]);
      return;
    }
    setParticles(spawnParticles(burst.emoji, { x: burst.x, y: burst.y }));
    const timeout = window.setTimeout(() => setParticles([]), 2600);
    return () => window.clearTimeout(timeout);
  }, [burst]);

  if (!particles.length) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden" aria-hidden>
      {particles.map((particle) => (
        <span
          key={`${burst?.id ?? 0}-${particle.id}`}
          className="quiz-reaction-particle absolute"
          style={{
            left: particle.left,
            top: particle.top,
            fontSize: particle.size,
            animationDuration: `${particle.duration}s`,
            animationDelay: `${particle.delay}s`,
            ["--quiz-rot" as string]: `${particle.rotation}deg`,
            ["--quiz-drift" as string]: `${particle.drift}px`,
          }}
        >
          {particle.emoji}
        </span>
      ))}
    </div>
  );
}
