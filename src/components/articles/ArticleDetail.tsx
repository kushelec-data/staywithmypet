"use client";

import { ArticleBody } from "@/components/articles/ArticleBody";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { PageCta } from "@/components/layout/PageCta";
import { AppImage } from "@/components/ui/AppImage";
import type { Dictionary } from "@/i18n/translations";
import type { Locale } from "@/i18n/translations";
import {
  formatReadTime,
  getRelatedArticles,
  type Article,
} from "@/lib/articles";
import { CONTENT_CONTAINER } from "@/lib/layout";
import { PUBLIC_SECTION_TITLE } from "@/lib/public-layout";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type ArticleDetailProps = {
  article: Article;
  page: Dictionary["articlesPage"];
  locale: Locale;
};

export function ArticleDetail({ article, page, locale }: ArticleDetailProps) {
  const related = getRelatedArticles(article.slug, page, locale, 3);

  return (
    <>
      <div className="border-b border-black/5 bg-gradient-to-b from-cream/50 via-background to-background">
        <div className={`${CONTENT_CONTAINER} min-w-0 py-6 sm:py-8`}>
          <Link
            href="/articles"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-teal hover:underline"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            {page.backToArticles}
          </Link>
          <div className="relative mt-5 max-h-[380px] w-full overflow-hidden rounded-3xl shadow-lg shadow-brand-teal/10 ring-1 ring-black/5">
            <div className="relative aspect-[21/9] min-h-[12rem] max-h-[380px] w-full sm:aspect-[2.4/1]">
              <AppImage
                src={article.imageSrc}
                alt={article.imageAlt}
                seed={article.slug}
                fallbackCaption={article.title}
                captionOnlyFallback
                sizes="(max-width: 1200px) 100vw, 1200px"
                className="object-cover"
              />
            </div>
          </div>
          <div className="mt-6 max-w-[760px]">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted sm:text-sm">
              <span className="rounded-full bg-mint/40 px-2.5 py-1 font-semibold text-brand-teal">
                {article.category}
              </span>
              <span>
                {article.publishedAt} · {formatReadTime(article.readTimeMinutes, page.readTime)}
              </span>
            </div>
            <h1 className="font-heading mt-4 text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl md:text-4xl">
              {article.title}
            </h1>
            <p className="mt-3 text-base leading-relaxed text-muted sm:text-lg">{article.excerpt}</p>
          </div>
        </div>
      </div>

      <section className="py-8 sm:py-10 lg:py-12">
        <div className={CONTENT_CONTAINER}>
          <div className="mx-auto max-w-[760px]">
            <ArticleBody blocks={article.body} />
          </div>
        </div>
      </section>

      {related.length > 0 ? (
        <section className="border-t border-black/5 py-10 lg:py-12">
          <div className={CONTENT_CONTAINER}>
            <h2 className={PUBLIC_SECTION_TITLE}>{page.relatedArticles}</h2>
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8">
              {related.map((item) => (
                <ArticleCard
                  key={item.slug}
                  article={item}
                  readMoreLabel={page.readMore}
                  readTimeTemplate={page.readTime}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

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
