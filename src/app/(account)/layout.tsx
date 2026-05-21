"use client";

import { ProfileRouteGuard } from "@/components/profile/ProfileRouteGuard";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <ProfileRouteGuard>{children}</ProfileRouteGuard>;
}
