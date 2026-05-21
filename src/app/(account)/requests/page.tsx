import { RequestsPageContent } from "@/components/requests/RequestsPageContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Requests",
};

export default function RequestsPage() {
  return <RequestsPageContent />;
}
