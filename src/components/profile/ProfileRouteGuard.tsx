"use client";

import { useLanguage } from "@/context/LanguageContext";
import { useRequireCompleteProfile } from "@/hooks/useRequireCompleteProfile";

export function ProfileRouteGuard({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const { ready } = useRequireCompleteProfile();

  if (!ready) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-16 text-center text-muted sm:px-6">
        {t.common.loading}
      </div>
    );
  }

  return <>{children}</>;
}
