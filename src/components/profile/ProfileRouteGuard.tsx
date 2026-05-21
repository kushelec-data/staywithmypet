"use client";

import { useRequireCompleteProfile } from "@/hooks/useRequireCompleteProfile";

export function ProfileRouteGuard({ children }: { children: React.ReactNode }) {
  const { ready } = useRequireCompleteProfile();

  if (!ready) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-16 text-center text-muted sm:px-6">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
