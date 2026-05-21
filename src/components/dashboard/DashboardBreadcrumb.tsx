"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DASHBOARD_PATH } from "@/lib/auth-routing";
import type { DashboardBreadcrumbParent } from "@/lib/dashboard-breadcrumb";

export type DashboardBreadcrumbProps = {
  title: string;
  parent?: DashboardBreadcrumbParent;
  backHref?: string;
  className?: string;
};

export function DashboardBreadcrumb({
  title,
  parent,
  backHref = DASHBOARD_PATH,
  className = "",
}: DashboardBreadcrumbProps) {
  const router = useRouter();

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(backHref);
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={`sticky top-[4.25rem] z-20 -mx-1 mb-4 border-b border-black/5 bg-background/95 pb-3 pt-0.5 backdrop-blur-md sm:static sm:mx-0 sm:mb-5 sm:border-0 sm:bg-transparent sm:pb-0 sm:pt-0 sm:backdrop-blur-none ${className}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-mint/50 hover:text-brand-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal"
          aria-label="Go back"
        >
          <span aria-hidden className="text-base leading-none">
            ←
          </span>
        </button>

        <ol className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-muted">
          <li className="shrink-0">
            <Link
              href={DASHBOARD_PATH}
              className="font-medium transition-colors hover:text-brand-teal"
            >
              Dashboard
            </Link>
          </li>

          {parent ? (
            <>
              <li aria-hidden className="shrink-0 text-muted/50">
                /
              </li>
              <li className="min-w-0 truncate">
                {parent.href ? (
                  <Link href={parent.href} className="transition-colors hover:text-brand-teal">
                    {parent.label}
                  </Link>
                ) : (
                  <span>{parent.label}</span>
                )}
              </li>
            </>
          ) : null}

          <li aria-hidden className="shrink-0 text-muted/50">
            /
          </li>
          <li className="min-w-0 truncate font-medium text-foreground" aria-current="page">
            {title}
          </li>
        </ol>
      </div>
    </nav>
  );
}
