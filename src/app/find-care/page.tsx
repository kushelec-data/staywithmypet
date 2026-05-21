import { FindCarePageClient } from "./FindCarePageClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find care",
};

export default function FindCarePage() {
  return <FindCarePageClient />;
}
