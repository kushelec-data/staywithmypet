"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function QuizStage({ stageKey, children }: { stageKey: string; children: ReactNode }) {
  const keyRef = useRef(stageKey);
  const kidsRef = useRef(children);
  const incomingRef = useRef(children);
  const [leaving, setLeaving] = useState<ReactNode>(null);
  const [reduced, setReduced] = useState(false);

  incomingRef.current = children;

  useEffect(() => {
    setReduced(prefersReducedMotion());
  }, []);

  useLayoutEffect(() => {
    if (keyRef.current === stageKey) {
      kidsRef.current = incomingRef.current;
      return;
    }
    setLeaving(kidsRef.current);
    keyRef.current = stageKey;
    kidsRef.current = incomingRef.current;
    const timeout = window.setTimeout(() => setLeaving(null), reduced ? 320 : 420);
    return () => window.clearTimeout(timeout);
  }, [stageKey, reduced]);

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden touch-pan-y">
      {leaving ? (
        <div className={`pointer-events-none absolute inset-0 overflow-hidden ${reduced ? "quiz-stage-leave-fade" : "quiz-stage-leave"}`}>
          {leaving}
        </div>
      ) : null}
      <div key={stageKey} className={`h-full ${reduced ? "quiz-stage-enter-fade" : "quiz-stage-enter"}`}>
        {children}
      </div>
    </div>
  );
}
