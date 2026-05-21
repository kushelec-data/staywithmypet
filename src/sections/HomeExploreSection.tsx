"use client";

import { useLanguage } from "@/context/LanguageContext";
import { PAGE_CONTAINER, PAGE_SECTION_TIGHT } from "@/lib/layout";
import Link from "next/link";

export function HomeExploreSection() {
  const { t } = useLanguage();

  return (
    <section className={`${PAGE_SECTION_TIGHT} border-t border-black/5 bg-surface/40`}>
      <div className={PAGE_CONTAINER}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:gap-5">
          {t.homeExplore.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="card-elevated rounded-2xl bg-surface p-5 transition-colors hover:ring-1 hover:ring-brand-teal/20 sm:rounded-3xl sm:p-6"
            >
              <h2 className="font-heading text-lg font-semibold text-foreground">{link.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{link.description}</p>
              <span className="mt-4 inline-block text-sm font-semibold text-brand-teal">{t.common.learnMore}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
