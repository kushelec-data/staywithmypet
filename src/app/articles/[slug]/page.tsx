import { ArticleDetailPageClient } from "../ArticleDetailPageClient";
import { ARTICLE_SLUGS } from "@/lib/articles";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return ARTICLE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!ARTICLE_SLUGS.includes(slug)) {
    return { title: "Article not found" };
  }
  return { title: "Article" };
}

export default async function ArticleDetailPage({ params }: PageProps) {
  const { slug } = await params;
  if (!ARTICLE_SLUGS.includes(slug)) notFound();
  return <ArticleDetailPageClient slug={slug} />;
}
