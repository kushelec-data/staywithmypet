"use client";

import { ArticleDetail } from "@/components/articles/ArticleDetail";
import { useLanguage } from "@/context/LanguageContext";
import { getArticleBySlug } from "@/lib/articles";
import { notFound } from "next/navigation";

type ArticleDetailPageClientProps = {
  slug: string;
};

export function ArticleDetailPageClient({ slug }: ArticleDetailPageClientProps) {
  const { locale, t } = useLanguage();
  const article = getArticleBySlug(slug, t.articlesPage, locale);
  if (!article) notFound();

  return <ArticleDetail article={article} page={t.articlesPage} locale={locale} />;
}
