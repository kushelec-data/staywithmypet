import type { Dictionary } from "@/i18n";
import type { ProfileRow } from "@/lib/profile-utils";
import { resolveActiveMode } from "@/lib/profile-mode";

export const primaryNavConfig = [
  { href: "/find-care", labelKey: "findCare" },
  { href: "/find-pets", labelKey: "findPets" },
  { href: "/how-it-works", labelKey: "howItWorks" },
  { href: "/pricing", labelKey: "pricing" },
  { href: "/faq", labelKey: "faq" },
  { href: "/articles", labelKey: "articles" },
  { href: "/about", labelKey: "about" },
] as const;

/** Center nav when logged in — hide marketing/info pages (How It Works, Pricing, FAQ). */
export const loggedInPrimaryNavConfig = primaryNavConfig.filter(
  (item) =>
    item.labelKey !== "howItWorks" &&
    item.labelKey !== "pricing" &&
    item.labelKey !== "faq",
  // Articles stays visible for logged-in users.
);

export type NavbarLabelKey = (typeof primaryNavConfig)[number]["labelKey"];

export function getPrimaryNavLinks(t: Dictionary["navbar"], loggedIn = false) {
  const config = loggedIn ? loggedInPrimaryNavConfig : primaryNavConfig;
  return config.map((item) => ({
    href: loggedIn && item.labelKey === "pricing" ? "/membership" : item.href,
    label: t[item.labelKey],
  }));
}

/** Logged-in center nav: one search link based on active_mode. */
export function getPrimaryNavLinksForUser(
  t: Dictionary["navbar"],
  profile: ProfileRow | null,
  loggedIn: boolean,
) {
  const links = getPrimaryNavLinks(t, loggedIn);
  if (!loggedIn || !profile) return links;

  const mode = resolveActiveMode(profile.role, profile.active_mode);
  const searchLink =
    mode === "pet_friend"
      ? { href: "/find-pets" as const, label: t.findPets }
      : { href: "/find-care" as const, label: t.findPetFriends };

  const withoutSearch = links.filter(
    (item) => item.href !== "/find-pets" && item.href !== "/find-care",
  );
  return [searchLink, ...withoutSearch];
}

export function requestsHrefForProfile(profile: ProfileRow | null): string {
  if (!profile) return "/requests";
  const mode = resolveActiveMode(profile.role, profile.active_mode);
  return mode === "pet_friend" ? "/requests?direction=outgoing" : "/requests?direction=incoming";
}

export function getUserMenuLinks(
  t: Dictionary["navbar"],
  profile: ProfileRow | null,
  options?: { hideDashboard?: boolean },
) {
  const links = [
    { href: "/dashboard", label: t.dashboard },
    { href: "/profile/edit", label: t.myProfile },
    { href: "/dashboard/bookings", label: t.bookings },
    { href: "/messages", label: t.messages },
    { href: requestsHrefForProfile(profile), label: t.requests },
  ] as const;

  if (options?.hideDashboard) {
    return links.filter((item) => item.href !== "/dashboard");
  }

  return links;
}

export function getAuthNavLinks(t: Dictionary["navbar"]) {
  return [
    { href: "/login", label: t.login },
    { href: "/signup", label: t.getStarted, emphasis: true as const },
  ];
}

/** Translate account sidebar / nav strip labels. */
export function accountSidebarLabel(href: string, _fallbackLabel: string, t: Dictionary): string {
  const path = href.split("?")[0].split("#")[0];
  const nav = t.navbar;
  const account = t.account.nav;

  const byPath: Record<string, string> = {
    "/dashboard": nav.dashboard,
    "/dashboard/calendar": nav.calendar,
    "/dashboard/bookings": nav.bookings,
    "/messages": nav.messages,
    "/requests": nav.requests,
    "/saved": account.savedPets,
    "/profile/edit": account.editProfile,
    "/membership": account.membership,
    "/change-password": account.changePassword,
    "/pets": account.myPets,
    "/pets/new": account.addPet,
    "/find-care": nav.findPetFriends,
    "/find-pets": nav.findPets,
  };

  return byPath[path] ?? _fallbackLabel;
}
