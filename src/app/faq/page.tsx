import { FaqPageClient } from "./FaqPageClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ",
};

export default function FaqPage() {
  return <FaqPageClient />;
}
