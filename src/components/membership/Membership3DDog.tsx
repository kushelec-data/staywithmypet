"use client";

import { MembershipFloatingDogIllustration } from "@/components/membership/MembershipFloatingDogIllustration";
import { shouldEnableMembership3DDog } from "@/lib/membership-dog-capabilities";
import dynamic from "next/dynamic";
import { Component, Suspense, useCallback, useEffect, useState, type ReactNode } from "react";

const Membership3DDogScene = dynamic(() => import("@/components/membership/Membership3DDogScene"), {
  ssr: false,
  loading: () => <Membership3DDogFallback />,
});

type Membership3DDogProps = {
  onIntroComplete?: () => void;
  className?: string;
};

function Membership3DDogFallback({ className = "" }: { className?: string }) {
  return (
    <div
      className={`membership-3d-dog-fallback flex h-[72px] w-[72px] items-end justify-center sm:h-[96px] sm:w-[96px] ${className}`}
      aria-hidden
    >
      <MembershipFloatingDogIllustration className="h-[52px] w-auto sm:h-[68px]" />
    </div>
  );
}

class Membership3DDogErrorBoundary extends Component<
  { onError: () => void; fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export function Membership3DDog({ onIntroComplete, className = "" }: Membership3DDogProps) {
  const [readyToLoad, setReadyToLoad] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setEnabled(shouldEnableMembership3DDog());
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const start = () => setReadyToLoad(true);
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = window.requestIdleCallback(start, { timeout: 2200 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = setTimeout(start, 600);
    return () => clearTimeout(timer);
  }, [enabled]);

  const handleLoadError = useCallback(() => setFailed(true), []);

  if (!enabled || failed) {
    return <Membership3DDogFallback className={className} />;
  }

  if (!readyToLoad) {
    return <Membership3DDogFallback className={className} />;
  }

  return (
    <Membership3DDogErrorBoundary
      onError={handleLoadError}
      fallback={<Membership3DDogFallback className={className} />}
    >
      <Suspense fallback={<Membership3DDogFallback className={className} />}>
        <Membership3DDogScene
          className={className}
          onIntroComplete={onIntroComplete}
        />
      </Suspense>
    </Membership3DDogErrorBoundary>
  );
}
