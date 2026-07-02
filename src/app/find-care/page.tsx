import { FindCarePageClient } from "./FindCarePageClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find care",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default function FindCarePage() {
  return <FindCarePageClient />;
}
