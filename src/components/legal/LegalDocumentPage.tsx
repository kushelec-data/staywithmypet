"use client";

import { LegalDocumentBody } from "@/components/legal/LegalDocumentBody";
import { useLanguage } from "@/context/LanguageContext";
import { getLegalDocument, legalDocuments } from "@/lib/site-texts";

type LegalSlug = keyof typeof legalDocuments;

export function LegalDocumentPage({ slug }: { slug: LegalSlug }) {
  const { locale, t } = useLanguage();
  const { title, paragraphs } = getLegalDocument(slug, locale);
  const d = t.legalDates;

  return (
    <div className="min-w-0 bg-gradient-to-b from-pastel-blue/20 via-background to-mint/15">
      <div className="mx-auto w-full max-w-[54rem] px-4 py-8 sm:px-6 sm:py-10 lg:py-14">
        <article className="legal-document-card overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_40px_rgba(38,92,52,0.06)] sm:rounded-3xl">
          <header className="border-b border-border bg-gradient-to-br from-cream/80 via-card to-mint/20 px-6 py-8 sm:px-10 sm:py-10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
              Stay With My Pet
            </p>
            <h1 className="mt-3 font-heading text-3xl font-semibold leading-tight tracking-tight text-foreground sm:mt-4 sm:text-4xl">
              {title}
            </h1>
            <dl className="mt-6 grid gap-2 text-sm text-muted sm:mt-8 sm:grid-cols-2 sm:gap-x-8">
              <div>
                <dt className="sr-only">Effective date</dt>
                <dd>{d.effectiveDate}</dd>
              </div>
              <div>
                <dt className="sr-only">Last updated</dt>
                <dd>{d.lastUpdated}</dd>
              </div>
            </dl>
          </header>

          <div className="px-6 py-8 sm:px-10 sm:py-10 lg:py-12">
            <LegalDocumentBody paragraphs={paragraphs} />
          </div>
        </article>
      </div>
    </div>
  );
}
