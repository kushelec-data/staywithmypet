export type AccountNavItem = {
  href: string;
  label: string;
  description?: string;
};

/** Sidebar on profile-area pages (legacy `user-sidebar`). */
export const accountSidebarNav: AccountNavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/profile/edit", label: "Edit profile" },
  { href: "/gallery", label: "My gallery" },
  { href: "/preferences", label: "My preferences" },
  { href: "/membership", label: "Manage membership" },
  { href: "/find-pets", label: "Search pets" },
  { href: "/change-password", label: "Change password" },
];

/** Header quick actions when logged in (legacy bell + heart). */
export const accountHeaderNav: AccountNavItem[] = [
  { href: "/requests", label: "Requests" },
  { href: "/saved", label: "Saved" },
];

