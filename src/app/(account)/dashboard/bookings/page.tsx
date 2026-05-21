import { BookingsPageContent } from "@/components/bookings/BookingsPageContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bookings",
};

export default function DashboardBookingsPage() {
  return <BookingsPageContent />;
}
