"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { NotificationsBell } from "@/components/notifications/NotificationsBell";
import { NavbarSavedLink } from "@/components/navbar/NavbarSavedLink";
import { NavbarUserMenu } from "@/components/navbar/NavbarUserMenu";
import { MobileNavDrawer } from "@/components/navbar/MobileNavDrawer";
import { mobileNavRowClass, mobileNavSectionClass } from "@/components/navbar/mobile-nav-styles";
import { getAuthNavLinks, getPrimaryNavLinksForUser } from "@/lib/nav-i18n";
import { sidebarModeControlForProfile } from "@/lib/profile-mode";
import { useActiveModeSwitch } from "@/hooks/useActiveModeSwitch";
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

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const { user, loading, signOut } = useAuth();
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const { switchingMode, modeError, handleModeSwitch } = useActiveModeSwitch({
    onSuccess: () => setOpen(false),
  });
  const modeControl = sidebarModeControlForProfile(profile, t.account);

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

  function closeDrawer() {
    setOpen(false);
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
              ref={menuTriggerRef}
              type="button"
              className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-border bg-mint/50 transition-colors active:bg-mint lg:hidden"
              aria-expanded={open}
              aria-controls="mobile-nav-drawer"
              aria-label={open ? t.common.closeMenu : t.common.openMenu}
              onClick={() => setOpen((value) => !value)}
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
      </div>

      <MobileNavDrawer
        open={open}
        onClose={closeDrawer}
        ariaLabel={t.common.openMenu}
        closeLabel={t.common.closeMenu}
        returnFocusRef={menuTriggerRef}
        headerStart={
          <Link
            href="/"
            onClick={closeDrawer}
            className="inline-flex min-w-0 items-center"
            aria-label="StayWithMyPet home"
          >
            <img src={LOGO_SRC} alt="StayWithMyPet" className={LOGO_CLASS} width={200} height={52} />
          </Link>
        }
        headerEnd={<LanguageSwitcher />}
      >
        <nav id="mobile-nav-drawer" aria-label="Mobile navigation" className="min-w-0 max-w-full pb-4">
          <section className={mobileNavSectionClass()} aria-label={t.navbar.findPets}>
            <ul className="min-w-0 max-w-full space-y-0.5">
              {centerNavLinks.map((link) => {
                const active = linkActive(link.href);
                return (
                  <li key={link.href} className="min-w-0 max-w-full">
                    <Link
                      href={link.href}
                      onClick={closeDrawer}
                      aria-current={active ? "page" : undefined}
                      className={mobileNavRowClass(active, tealNavActive(link.href))}
                    >
                      <span className="min-w-0 flex-1 truncate">{link.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          {isLoggedIn ? (
            <>
              <section className={`${mobileNavSectionClass()} border-t border-border pt-2 md:hidden`} aria-label={t.notifications.bellLabel}>
                <ul className="min-w-0 max-w-full space-y-0.5">
                  <li className="min-w-0 max-w-full">
                    <NotificationsBell
                      variant="menu-row"
                      onNavigate={closeDrawer}
                    />
                  </li>
                  <li className="min-w-0 max-w-full">
                    <NavbarSavedLink variant="menu-row" onNavigate={closeDrawer} />
                  </li>
                </ul>
              </section>

              <section className={`${mobileNavSectionClass()} border-t border-border pt-2 md:hidden`} aria-label={t.navbar.accountMenu}>
                <NavbarUserMenu
                  variant="mobile"
                  onLogout={handleLogout}
                  loggingOut={loggingOut}
                  onNavigate={closeDrawer}
                  modeControl={modeControl}
                  switchingMode={switchingMode}
                  modeError={modeError}
                  onModeSwitch={handleModeSwitch}
                />
              </section>
            </>
          ) : (
            <section className={`${mobileNavSectionClass()} border-t border-border pt-2`}>
              <ul className="min-w-0 max-w-full space-y-0.5">
                {authNavLinks.map((link) => {
                  const active = linkActive(link.href);
                  const emphasis = "emphasis" in link && link.emphasis;
                  return (
                    <li key={link.href} className="min-w-0 max-w-full">
                      <Link
                        href={link.href}
                        onClick={closeDrawer}
                        aria-current={active ? "page" : undefined}
                        className={
                          emphasis
                            ? "flex min-h-[48px] w-full min-w-0 max-w-full items-center rounded-xl bg-brand-teal px-4 py-2.5 text-base font-semibold text-white"
                            : mobileNavRowClass(active, tealNavActive(link.href))
                        }
                      >
                        <span className="min-w-0 flex-1 truncate">{link.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </nav>
      </MobileNavDrawer>
    </header>
  );
}
