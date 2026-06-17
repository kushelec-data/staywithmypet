"use client";

import type { PublicCareDetailItem } from "@/lib/public-pet-display";
import { PUBLIC_CARD, PUBLIC_SECTION_TITLE } from "@/lib/public-layout";

type PublicPetCareDetailsCardProps = {
  items: PublicCareDetailItem[];
  title: string;
};

export function PublicPetCareDetailsCard({ items, title }: PublicPetCareDetailsCardProps) {
  if (!items.length) return null;

  return (
    <section className={PUBLIC_CARD}>
      <h2 className={PUBLIC_SECTION_TITLE}>{title}</h2>
      <dl className="mt-4 space-y-4">
        {items.map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{item.label}</dt>
            <dd className="mt-1.5 max-w-prose whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
