import { ContactPageClient } from "./ContactPageClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
};

export default function ContactPage() {
  return <ContactPageClient />;
}
