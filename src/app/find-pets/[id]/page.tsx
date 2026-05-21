import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

/** Legacy URL — canonical public pet profile is /pet/[id]. */
export default async function LegacyPublicPetDetailPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/pet/${id}`);
}
