"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { useLanguage } from "@/context/LanguageContext";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { NotificationsBell } from "@/components/notifications/NotificationsBell";
import { NavbarSavedLink } from "@/components/navbar/NavbarSavedLink";
import { NavbarUserMenu } from "@/components/navbar/NavbarUserMenu";
import { getAuthNavLinks, getPrimaryNavLinksForUser } from "@/lib/nav-i18n";
import { PAGE_CONTAINER } from "@/lib/layout";

const LOGO_SRC = "/logo.png";
const LOGO_CLASS =
  "h-auto max-h-[44px] w-auto max-w-[8.5rem] object-contain object-left sm:max-h-[52px] sm:max-w-[9.5rem]";

const PRICING_PATH = "/pricing";
const MEMBERSHIP_PATH = "/membership";
const HOW_IT_WORKS_PATH = "/how-it-works";

function isHowItWorksHref(href: string): boolean {
  return href === HOW_IT_WORKS_PATH || href.startsWith(`${HOW_IT_WORKS_PATH}#`);
}

function isPricingHref(href: string): boolean {
  return (
    href === PRICING_PATH ||
    href.startsWith(`${PRICING_PATH}/`) ||
    href.startsWith(`${PRICING_PATH}#`) ||
    href === MEMBERSHIP_PATH ||
    href.startsWith(`${MEMBERSHIP_PATH}/`) ||
    href.startsWith(`${MEMBERSHIP_PATH}#`)
  );
}

function isPricingPathActive(pathname: string): boolean {
  return (
    pathname === PRICING_PATH ||
    pathname.startsWith(`${PRICING_PATH}/`) ||
    pathname === MEMBERSHIP_PATH ||
    pathname.startsWith(`${MEMBERSHIP_PATH}/`)
  );
}

function isNavLinkActive(pathname: string, href: string): boolean {
  if (isPricingHref(href)) {
    return isPricingPathActive(pathname);
  }
  if (href.includes("#")) {
    return pathname === href.split("#")[0];
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navLinkClass(active: boolean, tealActive = false) {
  return `whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition-all duration-200 ${
    active
      ? tealActive
        ? "bg-mint/60 text-brand-teal shadow-sm ring-1 ring-brand-teal/15"
        : "bg-brand-pink-muted text-brand-pink shadow-sm ring-1 ring-brand-pink/20"
      : "text-foreground/85 hover:bg-mint/50 hover:text-foreground"
  }`;
}

function guestLinkClass(active: boolean, tealActive = false) {
  return `rounded-full px-3.5 py-2.5 text-sm font-medium transition-colors ${
    active
      ? tealActive
        ? "bg-mint/60 text-brand-teal"
        : "bg-brand-pink-muted text-brand-pink"
      : "text-foreground/85 hover:bg-mint/50"
  }`;
}

function mobileNavLinkClass(active: boolean, tealActive = false) {
  return `block min-h-[44px] rounded-xl px-4 py-3 text-base font-medium leading-snug ${
    active
      ? tealActive
        ? "bg-mint/60 text-brand-teal"
        : "bg-brand-pink-muted text-brand-pink"
      : "text-muted active:bg-mint/40"
  }`;
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const { user, loading, signOut } = useAuth();
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isLoggedIn = !!user && !loading;
  const centerNavLinks = useMemo(
    () => getPrimaryNavLinksForUser(t.navbar, profile, isLoggedIn),
    [t, profile, isLoggedIn],
  );
  const authNavLinks = useMemo(() => getAuthNavLinks(t.navbar), [t]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await signOut();
      setOpen(false);
      router.push("/");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const linkActive = (href: string) => isNavLinkActive(pathname, href);
  const tealNavActive = (href: string) =>
    pathname === HOW_IT_WORKS_PATH && linkActive(href) && isHowItWorksHref(href);

  return (
    <header className="sticky top-0 z-50 min-w-0 border-b border-border bg-background">
      <div className={`${PAGE_CONTAINER} min-w-0`}>
        <nav
          className="grid h-16 min-w-0 grid-cols-[auto_1fr_auto] items-center gap-2 sm:h-[72px] sm:gap-4"
          aria-label="Main navigation"
        >
          <Link href="/" className="inline-flex shrink-0 items-center" aria-label="StayWithMyPet home">
            <img src={LOGO_SRC} alt="StayWithMyPet" className={LOGO_CLASS} width={200} height={52} />
          </Link>

          <ul className="hidden min-w-0 items-center justify-center gap-0.5 lg:flex">
            {centerNavLinks.map((link) => (
              <li key={link.href} className="shrink-0">
                <Link href={link.href} className={navLinkClass(linkActive(link.href))}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex min-w-0 shrink-0 items-center justify-end gap-1.5 sm:gap-2">
            <ThemeToggle className="hidden sm:block" />
            <LanguageSwitcher className="hidden sm:inline-flex" />

            {isLoggedIn ? (
              <div className="hidden items-center gap-2 md:flex">
                <NotificationsBell />
                <NavbarSavedLink />
                <NavbarUserMenu onLogout={handleLogout} loggingOut={loggingOut} />
              </div>
            ) : (
              <ul className="hidden items-center gap-2 md:flex">
                {authNavLinks.map((link) => (
                  <li key={link.href} className="shrink-0">
                    {"emphasis" in link && link.emphasis ? (
                      <Link
                        href={link.href}
                        className="btn-interactive rounded-full bg-brand-teal px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-teal/20 hover:bg-brand-teal-hover"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <Link href={link.href} className={guestLinkClass(linkActive(link.href))}>
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-border bg-mint/50 transition-colors active:bg-mint lg:hidden"
              aria-expanded={open}
              aria-label={open ? t.common.closeMenu : t.common.openMenu}
              onClick={() => setOpen((v) => !v)}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                {open ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
                )}
              </svg>
            </button>
          </div>
        </nav>

        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-out lg:hidden ${
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className="max-h-[min(75dvh,28rem)] overflow-y-auto overscroll-y-contain border-t border-border py-2 [-webkit-overflow-scrolling:touch]">
              <ul className="space-y-0.5">
                {centerNavLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={mobileNavLinkClass(linkActive(link.href), tealNavActive(link.href))}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>

              {isLoggedIn ? (
                <>
                  <div className="my-2 flex items-center gap-2 px-4 md:hidden">
                    <NotificationsBell />
                    <NavbarSavedLink />
                  </div>
                  <div className="px-1 md:hidden">
                    <NavbarUserMenu
                      variant="mobile"
                      onLogout={handleLogout}
                      loggingOut={loggingOut}
                      onNavigate={() => setOpen(false)}
                    />
                  </div>
                </>
              ) : (
                <ul className="mt-1 space-y-0.5 border-t border-border pt-2">
                  {authNavLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className={`block min-h-[44px] rounded-xl px-4 py-3 text-base font-medium leading-snug ${
                          "emphasis" in link && link.emphasis
                            ? "bg-brand-teal text-white"
                            : linkActive(link.href)
                              ? tealNavActive(link.href)
                                ? "bg-mint/60 text-brand-teal"
                                : "bg-brand-pink-muted text-brand-pink"
                              : "text-muted active:bg-mint/40"
                        }`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-border px-4 py-3 sm:hidden">
                <ThemeToggle />
                <LanguageSwitcher />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
