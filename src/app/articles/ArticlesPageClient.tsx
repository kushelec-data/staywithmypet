"use client";

import { ArticleCard } from "@/components/articles/ArticleCard";
import { PageCta } from "@/components/layout/PageCta";
import { PageHero } from "@/components/layout/PageHero";
import { useLanguage } from "@/context/LanguageContext";
import { getAllArticles } from "@/lib/articles";
import { CONTENT_CONTAINER } from "@/lib/layout";

const SECTION_PAD = "py-10 lg:py-12";

export function ArticlesPageClient() {
  const { locale, t } = useLanguage();
  const page = t.articlesPage;
  const articles = getAllArticles(page, locale);

  return (
    <>
      <PageHero title={page.title} description={page.subtitle} compact />

      <section className={SECTION_PAD}>
        <div className={CONTENT_CONTAINER}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8">
            {articles.map((article) => (
              <ArticleCard
                key={article.slug}
                article={article}
                readMoreLabel={page.readMore}
                readTimeTemplate={page.readTime}
              />
            ))}
          </div>
        </div>
      </section>

      <PageCta
        title={page.cta.title}
        description={page.cta.description}
        primaryLabel={page.cta.primary}
        primaryHref="/find-care"
        secondaryLabel={page.cta.secondary}
        secondaryHref="/signup"
      />
    </>
  );
}
