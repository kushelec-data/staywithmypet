import { ArticleDetail } from "@/components/articles/ArticleDetail";
import { ARTICLES, getArticleBySlug } from "@/lib/articles";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return ARTICLES.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) {
    return { title: "Article not found" };
  }
  return {
    title: article.title,
    description: article.excerpt,
  };
}

export default async function ArticleDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();
  return <ArticleDetail article={article} />;
}
