import { NewPetPageContent } from "@/components/pets/NewPetPageContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Add a pet",
};

export default function NewPetPage() {
  return <NewPetPageContent />;
}
