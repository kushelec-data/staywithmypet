import { FindPetsPageClient } from "./FindPetsPageClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search pets",
};

export default function FindPetsPage() {
  return <FindPetsPageClient />;
}
