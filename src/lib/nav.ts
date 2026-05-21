/** Primary site navigation — used by the global Navbar on every page. */
export const primaryNavLinks = [
  { href: "/find-pets", label: "Search pets" },
  { href: "/find-care", label: "Find care" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/articles", label: "Articles" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export const authNavLinks = [
  { href: "/login", label: "Login" },
  { href: "/signup", label: "Get started", emphasis: true as const },
] as const;

export type PrimaryNavLink = (typeof primaryNavLinks)[number];

export const footerNavGroups = {
  "Pet Friends": [
    { href: "/find-pets", label: "Search pets" },
    { href: "/how-it-works#pet-friend-workflow", label: "How it works" },
    { href: "/signup", label: "Join as Pet Friend" },
  ],
  "Pet Parents": [
    { href: "/find-care", label: "Find care" },
    { href: "/how-it-works#pet-parent-workflow", label: "How it works" },
    { href: "/signup", label: "Join as Pet Parent" },
  ],
  Company: [
    { href: "/pricing", label: "Pricing" },
    { href: "/faq", label: "FAQ" },
    { href: "/articles", label: "Articles" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ],
} as const;

/** @deprecated Use primaryNavLinks */
export const mainNavLinks = primaryNavLinks;
