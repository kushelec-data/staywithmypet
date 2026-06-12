"use client";

import { useLanguage } from "@/context/LanguageContext";

export function CommonLoadingFallback({ className }: { className?: string }) {
  const { t } = useLanguage();
  return (
    <div className={className ?? "mx-auto w-full max-w-7xl px-4 py-16 text-center text-muted sm:px-6"}>
      {t.common.loading}
    </div>
  );
}

export function MessagesLoadingFallback() {
  const { t } = useLanguage();
  return (
    <p className="px-4 py-12 text-center text-sm text-muted">{t.messages.loadingThread}</p>
  );
}

export function MapLoadingFallback({ className }: { className?: string }) {
  const { t } = useLanguage();
  return (
    <div
      className={
        className ??
        "flex min-h-[320px] h-[50vh] items-center justify-center rounded-3xl border border-black/[0.06] bg-mint/20 text-sm text-muted lg:h-[calc(100vh-160px)] lg:min-h-[520px]"
      }
      aria-busy="true"
    >
      {t.search.loadingMap}
    </div>
  );
}
