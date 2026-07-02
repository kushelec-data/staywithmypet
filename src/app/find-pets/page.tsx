import { FindPetsPageClient } from "./FindPetsPageClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search pets",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default function FindPetsPage() {
  return <FindPetsPageClient />;
}
