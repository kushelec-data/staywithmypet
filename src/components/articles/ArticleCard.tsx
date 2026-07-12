import { AppImage } from "@/components/ui/AppImage";
import { formatReadTime, type Article } from "@/lib/articles";
import Link from "next/link";

type ArticleCardProps = {
  article: Article;
  readMoreLabel: string;
  readTimeTemplate: string;
};

export function ArticleCard({ article, readMoreLabel, readTimeTemplate }: ArticleCardProps) {
  return (
    <article className="card-elevated flex min-w-0 flex-col overflow-hidden rounded-3xl border border-black/[0.06] bg-surface shadow-md shadow-black/5 transition-shadow hover:shadow-lg">
      <Link href={`/articles/${article.slug}`} className="block shrink-0">
        <div className="relative h-[200px] w-full overflow-hidden sm:h-[220px]">
          <AppImage
            src={article.imageSrc}
            alt={article.imageAlt}
            seed={article.slug}
            fallbackCaption={article.title}
            captionOnlyFallback
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        </div>
      </Link>
      <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span className="rounded-full bg-mint/40 px-2.5 py-1 font-semibold text-brand-teal">
            {article.category}
          </span>
          <span>
            {article.publishedAt} · {formatReadTime(article.readTimeMinutes, readTimeTemplate)}
          </span>
        </div>
        <h2 className="font-heading mt-3 line-clamp-2 text-lg font-semibold leading-snug text-foreground sm:text-xl">
          <Link href={`/articles/${article.slug}`} className="hover:text-brand-teal">
            {article.title}
          </Link>
        </h2>
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted sm:text-base">
          {article.excerpt}
        </p>
        <Link
          href={`/articles/${article.slug}`}
          className="mt-4 text-sm font-semibold text-brand-pink hover:underline"
        >
          {readMoreLabel}
        </Link>
      </div>
    </article>
  );
}
