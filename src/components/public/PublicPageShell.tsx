import Link from "next/link";
import type { ReactNode } from "react";
import { PUBLIC_PROFILE_MAX } from "@/lib/public-layout";

type PublicPageShellProps = {
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
};

export function PublicPageShell({
  children,
  backHref = "/find-pets",
  backLabel = "Back to search pets",
  className = "",
}: PublicPageShellProps) {
  return (
    <div className={`bg-mesh min-h-screen py-5 sm:py-6 ${className}`}>
      <div className={PUBLIC_PROFILE_MAX}>
        {backHref ? (
          <Link
            href={backHref}
            className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-teal hover:text-brand-pink"
          >
            <span aria-hidden>←</span> {backLabel}
          </Link>
        ) : null}
        {children}
      </div>
    </div>
  );
}
