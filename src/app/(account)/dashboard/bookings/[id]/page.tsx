import { BookingDetailContent } from "@/components/bookings/BookingDetailContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Booking details",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function DashboardBookingDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <BookingDetailContent bookingId={id} />;
}
