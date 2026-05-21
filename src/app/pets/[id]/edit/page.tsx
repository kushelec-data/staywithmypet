import { EditPetPageContent } from "@/components/pets/EditPetPageContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit pet",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditPetPage({ params }: PageProps) {
  const { id } = await params;
  return <EditPetPageContent petId={id} />;
}
