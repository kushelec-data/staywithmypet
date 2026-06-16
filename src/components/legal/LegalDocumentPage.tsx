"use client";

import { PageHero } from "@/components/layout/PageHero";
import { PageMain } from "@/components/layout/PageMain";
import { useLanguage } from "@/context/LanguageContext";
import { getLegalDocument, legalDocuments } from "@/lib/site-texts";

type LegalSlug = keyof typeof legalDocuments;

export function LegalDocumentPage({ slug }: { slug: LegalSlug }) {
  const { locale, t } = useLanguage();
  const { title, paragraphs } = getLegalDocument(slug, locale);
  const d = t.legalDates;

  return (
    <>
      <PageHero title={title} compact />
      <PageMain tight>
        <article className="prose prose-sm mx-auto max-w-3xl text-muted sm:prose-base">
          <div className="not-prose mb-6 space-y-1 border-b border-black/5 pb-5 text-sm text-muted">
            <p>{d.effectiveDate}</p>
            <p>{d.lastUpdated}</p>
          </div>
          {paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 48)} className="whitespace-pre-wrap leading-relaxed">
              {paragraph}
            </p>
          ))}
        </article>
      </PageMain>
    </>
  );
}
