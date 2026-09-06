import { requireAdminPage } from "@/lib/admin/require-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage("/admin");
  return <div className="min-h-full bg-background">{children}</div>;
}
