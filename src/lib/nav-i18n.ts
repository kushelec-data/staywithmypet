import type { Dictionary } from "@/i18n";
import type { ProfileRow } from "@/lib/profile-utils";
import { resolveActiveMode } from "@/lib/profile-mode";

export const primaryNavConfig = [
  { href: "/find-pets", labelKey: "searchPets" },
  { href: "/find-care", labelKey: "findCare" },
  { href: "/how-it-works", labelKey: "howItWorks" },
  { href: "/pricing", labelKey: "pricing" },
  { href: "/faq", labelKey: "faq" },
  { href: "/articles", labelKey: "articles" },
  { href: "/about", labelKey: "about" },
  { href: "/contact", labelKey: "contact" },
] as const;

/** Center nav when logged in — marketing pages omitted. */
export const loggedInPrimaryNavConfig = primaryNavConfig.slice(0, 5);

export type NavbarLabelKey = (typeof primaryNavConfig)[number]["labelKey"];

export function getPrimaryNavLinks(t: Dictionary["navbar"], loggedIn = false) {
  const config = loggedIn ? loggedInPrimaryNavConfig : primaryNavConfig;
  return config.map((item) => ({
    href: item.href,
    label: t[item.labelKey],
  }));
}

export function requestsHrefForProfile(profile: ProfileRow | null): string {
  if (!profile) return "/requests";
  const mode = resolveActiveMode(profile.role, profile.active_mode);
  return mode === "pet_friend" ? "/requests?direction=outgoing" : "/requests?direction=incoming";
}

export function getUserMenuLinks(t: Dictionary["navbar"], profile: ProfileRow | null) {
  return [
    { href: "/dashboard", label: t.dashboard },
    { href: "/profile/edit", label: t.myProfile },
    { href: "/dashboard/bookings", label: t.bookings },
    { href: "/messages", label: t.messages },
    { href: requestsHrefForProfile(profile), label: t.requests },
  ] as const;
}

export function getAuthNavLinks(t: Dictionary["navbar"]) {
  return [
    { href: "/login", label: t.login },
    { href: "/signup", label: t.getStarted, emphasis: true as const },
  ];
}

/** Translate account sidebar labels where i18n keys exist. */
export function accountSidebarLabel(href: string, fallbackLabel: string, t: Dictionary["navbar"]): string {
  if (href === "/dashboard/calendar") return t.calendar;
  return fallbackLabel;
}
