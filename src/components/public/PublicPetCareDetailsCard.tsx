"use client";

import type { PublicCareDetailItem } from "@/lib/public-pet-display";
import { PUBLIC_CARD, PUBLIC_SECTION_TITLE } from "@/lib/public-layout";

type PublicPetCareDetailsCardProps = {
  items: PublicCareDetailItem[];
  title: string;
};

const LONG_TEXT_THRESHOLD = 180;

export function PublicPetCareDetailsCard({ items, title }: PublicPetCareDetailsCardProps) {
  if (!items.length) return null;

  return (
    <section className={PUBLIC_CARD}>
      <h2 className={PUBLIC_SECTION_TITLE}>{title}</h2>
      <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
        {items.map((item) => {
          const isLong = item.value.length >= LONG_TEXT_THRESHOLD;

          return (
            <article
              key={item.id}
              className={`min-w-0 rounded-2xl border border-black/[0.06] bg-cream/45 p-4 shadow-sm sm:rounded-3xl sm:p-5 ${
                isLong ? "lg:col-span-2" : ""
              }`}
            >
              <h3 className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-brand-teal sm:text-xs">
                {item.label}
              </h3>
              <p className="mt-2.5 w-full whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 sm:text-[0.9375rem] sm:leading-7">
                {item.value}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
