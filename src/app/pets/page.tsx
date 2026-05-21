import { MyPetsPageContent } from "@/components/pets/MyPetsPageContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My pets",
};

export default function MyPetsPage() {
  return <MyPetsPageContent />;
}
