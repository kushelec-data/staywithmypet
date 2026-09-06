import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  Calendar,
  CalendarCheck,
  CreditCard,
  Heart,
  Inbox,
  LayoutDashboard,
  Lock,
  MessageCircle,
  PawPrint,
  Plus,
  Search,
  Sparkles,
  User,
} from "lucide-react";

function pathFromHref(href: string): string {
  return href.split("?")[0].split("#")[0];
}

const SIDEBAR_ICON_BY_PATH: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/matches": Sparkles,
  "/dashboard/calendar": Calendar,
  "/pets": PawPrint,
  "/pets/new": Plus,
  "/find-care": Search,
  "/find-pets": Search,
  "/saved": Heart,
  "/requests": Inbox,
  "/dashboard/bookings": CalendarCheck,
  "/messages": MessageCircle,
  "/profile/edit": User,
  "/membership": CreditCard,
  "/change-password": Lock,
};

export function accountSidebarIconForHref(href: string): LucideIcon {
  const path = pathFromHref(href);
  return SIDEBAR_ICON_BY_PATH[path] ?? LayoutDashboard;
}

export const ACCOUNT_SIDEBAR_MODE_SWITCH_ICON = ArrowLeftRight;

export const ACCOUNT_SIDEBAR_ICON_CLASS = {
  active: "text-[#2E6B3F]",
  inactive: "text-[#8a948c]",
} as const;
