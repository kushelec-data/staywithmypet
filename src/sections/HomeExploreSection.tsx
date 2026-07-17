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
              className="group card-elevated flex h-full flex-col rounded-2xl bg-surface p-5 ring-1 ring-border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-brand-teal/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/40 sm:rounded-3xl sm:p-6"
            >
              <h2 className="font-heading text-lg font-semibold text-foreground transition-colors group-hover:text-brand-teal">
                {link.title}
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{link.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-teal transition-colors group-hover:text-brand-pink">
                {t.common.learnMore}
                <span
                  aria-hidden
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                >
                  &rarr;
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
