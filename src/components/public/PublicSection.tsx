import type { ReactNode } from "react";

type PublicSectionProps = {
  title: string;
  children: ReactNode;
  id?: string;
  className?: string;
  aside?: ReactNode;
};

export function PublicSection({ title, children, id, className = "", aside }: PublicSectionProps) {
  return (
    <section
      id={id}
      className={`card-elevated scroll-mt-24 rounded-2xl p-4 sm:p-5 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-heading text-base font-semibold text-foreground">{title}</h2>
        {aside}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}
