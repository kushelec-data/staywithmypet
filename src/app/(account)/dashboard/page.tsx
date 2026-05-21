import { DashboardPageContent } from "@/components/dashboard/DashboardPageContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return <DashboardPageContent />;
}
