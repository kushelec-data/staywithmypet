import type { Dictionary } from "@/i18n/translations";

export type ArticleCategoryKey =
  | "petCare"
  | "trustSafety"
  | "petFriendTips"
  | "petParentTips";

export type ArticleBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

export type Article = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  categoryKey: ArticleCategoryKey;
  publishedAt: string;
  readTimeMinutes: number;
  imageSrc: string;
  imageAlt: string;
  body: ArticleBlock[];
};

const IMAGE_BASE = "/images/article";

type ArticleAsset = {
  slug: string;
  categoryKey: ArticleCategoryKey;
  publishedAtEn: string;
  publishedAtEt: string;
  imageSrc: string;
  imageAltEn: string;
  imageAltEt: string;
  /** Display order on /articles index. */
  sortOrder: number;
};

export const ARTICLE_ASSETS: ArticleAsset[] = [
  {
    slug: "building-trust-as-a-pet-friend",
    categoryKey: "petFriendTips",
    publishedAtEn: "January 23, 2026",
    publishedAtEt: "23. jaanuar 2026",
    imageSrc: `${IMAGE_BASE}/article-building-trust-training-dog-in-park.jpg`,
    imageAltEn: "Person spending focused time training and bonding with a dog in a park",
    imageAltEt: "Inimene treenib ja loob sidet koeraga pargis",
    sortOrder: 1,
  },
  {
    slug: "understanding-pet-body-language",
    categoryKey: "trustSafety",
    publishedAtEn: "January 23, 2026",
    publishedAtEt: "23. jaanuar 2026",
    imageSrc: `${IMAGE_BASE}/article-understanding-pet-body-language-child-with-cat.jpg`,
    imageAltEn: "Cat resting calmly beside a child on a sofa at home",
    imageAltEt: "Kass puhkab rahulikult lapse kõrval diivanil",
    sortOrder: 2,
  },
  {
    slug: "pet-routines-that-keep-everyone-happy",
    categoryKey: "petCare",
    publishedAtEn: "January 23, 2026",
    publishedAtEt: "23. jaanuar 2026",
    imageSrc: `${IMAGE_BASE}/article-pet-routines-cat-on-lap-while-working.jpg`,
    imageAltEn: "Person on a sofa with a cat on their lap while working from home",
    imageAltEt: "Inimene töötab kodus diivanil kassi süles",
    sortOrder: 3,
  },
  {
    slug: "prepare-your-home-for-a-visiting-pet",
    categoryKey: "petCare",
    publishedAtEn: "January 23, 2026",
    publishedAtEt: "23. jaanuar 2026",
    imageSrc: `${IMAGE_BASE}/article-preparing-home-for-visiting-pet.jpg`,
    imageAltEn: "Person preparing their home for a visiting pet",
    imageAltEt: "Inimene valmistab kodu ette külalise lemmiku jaoks",
    sortOrder: 4,
  },
  {
    slug: "what-to-do-if-a-pet-gets-homesick",
    categoryKey: "petCare",
    publishedAtEn: "January 23, 2026",
    publishedAtEt: "23. jaanuar 2026",
    imageSrc: `${IMAGE_BASE}/article-comforting-pet-feeling-homesick.jpg`,
    imageAltEn: "Person offering comfort to a pet that may be feeling homesick",
    imageAltEt: "Inimene pakub lohutust koduigatsust tundvale lemmikule",
    sortOrder: 5,
  },
  {
    slug: "emergency-basics-every-pet-friend-should-know",
    categoryKey: "trustSafety",
    publishedAtEn: "January 23, 2026",
    publishedAtEt: "23. jaanuar 2026",
    imageSrc: `${IMAGE_BASE}/article-pet-emergency-vet-visit.jpg`,
    imageAltEn: "Veterinarian examining a dog during a check-up or emergency visit",
    imageAltEt: "Loomaarst uurib koera kontrolli või erakorralise visiidi ajal",
    sortOrder: 6,
  },
  {
    slug: "choose-the-right-pet-friend",
    categoryKey: "petParentTips",
    publishedAtEn: "September 9, 2025",
    publishedAtEt: "9. september 2025",
    imageSrc: `${IMAGE_BASE}/article-choosing-pet-friend-working-from-home-with-dog.jpg`,
    imageAltEn: "Person working from home with a dog resting calmly nearby",
    imageAltEt: "Inimene töötab kodus koer rahulikult lähedal",
    sortOrder: 7,
  },
  {
    slug: "borrowing-a-dog-what-you-need-to-know",
    categoryKey: "petFriendTips",
    publishedAtEn: "January 23, 2026",
    publishedAtEt: "23. jaanuar 2026",
    imageSrc: `${IMAGE_BASE}/article-borrowing-a-dog-puppy-resting-on-sofa.jpg`,
    imageAltEn: "Young dog resting comfortably on a sofa at home",
    imageAltEt: "Noor koer puhkab mugavalt diivanil kodus",
    sortOrder: 8,
  },
  {
    slug: "introduce-your-pet-to-new-pet-friend-safely",
    categoryKey: "petParentTips",
    publishedAtEn: "January 23, 2026",
    publishedAtEt: "23. jaanuar 2026",
    imageSrc: `${IMAGE_BASE}/article-introducing-dog-to-new-pet-friend.jpg`,
    imageAltEn: "Woman greeting and meeting a dog during a calm introduction",
    imageAltEt: "Naine tervitab koera rahuliku tutvustamise ajal",
    sortOrder: 9,
  },
];

export const ARTICLE_SLUGS = ARTICLE_ASSETS.map((asset) => asset.slug);

function blocksToPlainText(blocks: ArticleBlock[]): string {
  return blocks
    .map((block) => {
      if (block.type === "p" || block.type === "h2" || block.type === "h3") return block.text;
      return block.items.join(" ");
    })
    .join(" ");
}

function estimateReadTimeMinutes(blocks: ArticleBlock[]): number {
  const words = blocksToPlainText(blocks).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function formatReadTime(minutes: number, template: string): string {
  return template.replace("{minutes}", String(minutes));
}

export function buildArticlesFromTranslations(
  page: Dictionary["articlesPage"],
  locale: "en" | "et",
): Article[] {
  const bySlug = new Map(page.items.map((item) => [item.slug, item]));

  return [...ARTICLE_ASSETS]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((asset) => {
      const content = bySlug.get(asset.slug);
      const body = (content?.body ?? []) as ArticleBlock[];
      const publishedAt = locale === "et" ? asset.publishedAtEt : asset.publishedAtEn;
      const imageAlt = locale === "et" ? asset.imageAltEt : asset.imageAltEn;

      return {
        slug: asset.slug,
        title: content?.title ?? asset.slug,
        excerpt: content?.excerpt ?? "",
        category: page.categories[asset.categoryKey],
        categoryKey: asset.categoryKey,
        publishedAt,
        readTimeMinutes: estimateReadTimeMinutes(body),
        imageSrc: asset.imageSrc,
        imageAlt,
        body,
      };
    });
}

export function getAllArticles(page: Dictionary["articlesPage"], locale: "en" | "et"): Article[] {
  return buildArticlesFromTranslations(page, locale);
}

export function getArticleBySlug(
  slug: string,
  page: Dictionary["articlesPage"],
  locale: "en" | "et",
): Article | undefined {
  return getAllArticles(page, locale).find((article) => article.slug === slug);
}

export function getRelatedArticles(
  slug: string,
  page: Dictionary["articlesPage"],
  locale: "en" | "et",
  limit = 3,
): Article[] {
  const articles = getAllArticles(page, locale);
  const current = articles.find((article) => article.slug === slug);
  if (!current) return articles.slice(0, limit);

  const others = articles.filter((article) => article.slug !== slug);
  const sameCategory = others.filter((article) => article.categoryKey === current.categoryKey);
  const related: Article[] = [...sameCategory];
  for (const article of others) {
    if (related.length >= limit) break;
    if (!related.some((item) => item.slug === article.slug)) {
      related.push(article);
    }
  }
  return related.slice(0, limit);
}

/** @deprecated Use ARTICLE_SLUGS — kept for static route generation. */
export const ARTICLES = ARTICLE_SLUGS.map((slug) => ({ slug }));
