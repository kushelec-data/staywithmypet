import { PublicPetDetailPageContent } from "@/components/pets/PublicPetDetailPageContent";
import type { Metadata } from "next";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: "Pet profile",
    description: "View care needs, availability, and reviews for this pet.",
    robots: { index: true, follow: true },
    alternates: { canonical: `/pet/${id}` },
  };
}

export default async function PublicPetProfilePage({ params }: PageProps) {
  const { id } = await params;
  return <PublicPetDetailPageContent petId={id} />;
}
