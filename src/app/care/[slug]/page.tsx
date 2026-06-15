import { CareTypeLandingPage } from "@/components/care/CareTypeLandingPage";
import { CARE_TYPE_SLUGS, getCareTypeBySlug } from "@/lib/care-types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return CARE_TYPE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const care = getCareTypeBySlug(slug);
  if (!care) return { title: "Care" };
  return {
    title: care.localeCopy.meta.title.en,
    description: care.localeCopy.meta.description.en,
  };
}

export default async function CareTypePage({ params }: PageProps) {
  const { slug } = await params;
  const care = getCareTypeBySlug(slug);
  if (!care) notFound();
  return <CareTypeLandingPage care={care} />;
}
