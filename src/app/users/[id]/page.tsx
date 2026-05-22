import { PublicProfilePageContent } from "@/components/profile/PublicProfilePageContent";
import type { Metadata } from "next";

/** Always serve latest profile/calendar UI (avoid stale static HTML). */
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: "Member profile · StayWithMyPet",
    description: "View a public member profile on StayWithMyPet — pets, care preferences, and approximate location only.",
    robots: { index: true, follow: true },
  };
}

export default async function PublicUserProfilePage({ params }: PageProps) {
  const { id } = await params;
  return <PublicProfilePageContent profileId={id} />;
}
