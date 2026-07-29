"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { mobileNavRowClass } from "@/components/navbar/mobile-nav-styles";

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "h-5 w-5"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
      />
    </svg>
  );
}

type NavbarSavedLinkProps = {
  variant?: "icon" | "menu-row";
  onNavigate?: () => void;
};

export function NavbarSavedLink({ variant = "icon", onNavigate }: NavbarSavedLinkProps) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const active = pathname === "/saved";
  const isMenuRow = variant === "menu-row";

  if (isMenuRow) {
    return (
      <Link
        href="/saved"
        onClick={onNavigate}
        className={mobileNavRowClass(active)}
        aria-current={active ? "page" : undefined}
      >
        <HeartIcon className="h-5 w-5 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{t.navbar.saved}</span>
      </Link>
    );
  }

  return (
    <Link
      href="/saved"
      className={`relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors duration-150 ${
        active
          ? "border-brand-teal/25 bg-mint/40 text-brand-teal shadow-sm"
          : "border-border bg-surface text-muted hover:bg-mint/30 hover:text-foreground/80"
      }`}
      aria-current={active ? "page" : undefined}
      aria-label={t.navbar.saved}
    >
      <HeartIcon />
    </Link>
  );
}
