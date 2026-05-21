import { CalendarPageContent } from "@/components/calendar/CalendarPageContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calendar",
};

export default function DashboardCalendarPage() {
  return <CalendarPageContent />;
}
