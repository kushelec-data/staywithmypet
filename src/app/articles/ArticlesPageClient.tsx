"use client";

import { ArticleCard } from "@/components/articles/ArticleCard";
import { PageHero } from "@/components/layout/PageHero";
import { getAllArticles } from "@/lib/articles";
import { CONTENT_CONTAINER } from "@/lib/layout";

const SECTION_PAD = "py-10 lg:py-12";

export function ArticlesPageClient() {
  const articles = getAllArticles();

  return (
    <>
      <PageHero
        title="Pet care articles"
        description="Helpful guides for Pet Parents and Pet Friends — from first meetings to routines, trust, and safety."
        compact
      />

      <section className={SECTION_PAD}>
        <div className={CONTENT_CONTAINER}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8">
            {articles.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
