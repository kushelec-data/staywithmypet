import type { PublicQuickInfoItem } from "@/lib/public-pet-display";
import { PUBLIC_CARD, PUBLIC_SECTION_TITLE } from "@/lib/public-layout";

type PublicQuickInfoCardProps = {
  items: PublicQuickInfoItem[];
  title?: string;
};

export function PublicQuickInfoCard({ items, title = "Quick info" }: PublicQuickInfoCardProps) {
  if (!items.length) return null;

  return (
    <section className={PUBLIC_CARD}>
      <h2 className={PUBLIC_SECTION_TITLE}>{title}</h2>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {items.map((item) => (
          <div key={item.label} className="min-w-0 border-l border-black/5 pl-3 first:border-l-0 first:pl-0">
            <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted">
              {item.label}
            </dt>
            <dd className="mt-0.5 text-sm font-medium text-foreground">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
