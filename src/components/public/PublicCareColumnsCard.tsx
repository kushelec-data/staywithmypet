import type { PublicCareColumns } from "@/lib/public-pet-display";
import { PUBLIC_CARD, PUBLIC_SECTION_TITLE } from "@/lib/public-layout";

type PublicCareColumnsCardProps = {
  columns: PublicCareColumns;
  title?: string;
};

function CareColumn({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="min-w-0">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</h3>
      <ul className="mt-2 space-y-1">
        {items.length ? (
          items.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-foreground/90">
              <span className="mt-0.5 text-brand-teal" aria-hidden>
                ✓
              </span>
              <span>{item}</span>
            </li>
          ))
        ) : (
          <li className="text-sm text-muted">—</li>
        )}
      </ul>
    </div>
  );
}

export function PublicCareColumnsCard({
  columns,
  title = "Care needs",
}: PublicCareColumnsCardProps) {
  const hasAny =
    columns.services.length || columns.walks.length || columns.medication.length;
  if (!hasAny) return null;

  return (
    <section className={PUBLIC_CARD}>
      <h2 className={PUBLIC_SECTION_TITLE}>{title}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <CareColumn label="Services" items={columns.services} />
        <CareColumn label="Walks" items={columns.walks} />
        <CareColumn label="Medication" items={columns.medication} />
      </div>
    </section>
  );
}
