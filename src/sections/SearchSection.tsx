"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { journeys } from "@/lib/journeys";
import { CONTENT_CONTAINER, PAGE_SECTION_TIGHT } from "@/lib/layout";

export function SearchSection() {
  const { t } = useLanguage();

  const blocks = [
    {
      id: journeys["pet-friend"].id,
      href: journeys["pet-friend"].searchHref,
      locationName: journeys["pet-friend"].searchBlock.locationName,
      copy: t.search.petFriend,
    },
    {
      id: journeys["pet-parent"].id,
      href: journeys["pet-parent"].searchHref,
      locationName: journeys["pet-parent"].searchBlock.locationName,
      copy: t.search.petParent,
    },
  ];

  return (
    <section id="search" className={PAGE_SECTION_TIGHT}>
      <div className={CONTENT_CONTAINER}>
        <SectionHeading
          align="center"
          title={t.search.title}
          description={t.search.subtitle}
          className="mx-auto max-w-2xl"
        />

        <div className="mx-auto mt-6 max-w-6xl rounded-2xl bg-mint/25 p-3 shadow-sm ring-1 ring-mint/50 sm:mt-8 sm:rounded-3xl sm:p-4 md:p-5 lg:p-6">
          <div className="grid grid-cols-1 items-stretch gap-3 sm:gap-4 lg:grid-cols-2 lg:gap-6">
            {blocks.map((block) => (
              <article
                key={block.id}
                className="flex h-full min-h-0 flex-col rounded-2xl bg-surface p-4 text-center shadow-sm ring-1 ring-border transition-shadow hover:shadow-md sm:p-5 lg:p-6 lg:text-left"
              >
                <span className="mx-auto inline-flex h-6 w-fit shrink-0 items-center rounded-full bg-lavender/80 px-2.5 text-[0.65rem] font-bold uppercase tracking-wider text-brand-teal lg:mx-0 sm:px-3 sm:text-xs">
                  {block.copy.role}
                </span>

                <div className="mt-3 flex min-h-0 items-center justify-center lg:min-h-[2.75rem] lg:items-end">
                  <label
                    htmlFor={`search-${block.id}`}
                    className="font-heading text-base font-semibold leading-snug text-foreground sm:text-lg lg:whitespace-nowrap lg:text-[0.9375rem] xl:text-base"
                  >
                    {block.copy.label}
                  </label>
                </div>

                <div className="mt-4 flex flex-1 flex-col">
                  <input
                    id={`search-${block.id}`}
                    type="text"
                    name={block.locationName}
                    placeholder={block.copy.placeholder}
                    className="w-full min-w-0 rounded-xl border border-border bg-background px-4 py-2.5 text-base text-foreground placeholder:text-muted/70 transition-colors focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20 sm:py-3"
                  />
                  <Link
                    href={block.href}
                    className="btn-interactive mt-4 inline-flex min-h-[44px] w-full shrink-0 items-center justify-center rounded-full bg-brand-teal px-4 text-center text-sm font-semibold text-white shadow-md shadow-brand-teal/20 hover:bg-brand-teal-hover sm:mt-5 sm:text-base"
                  >
                    {block.copy.button}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
